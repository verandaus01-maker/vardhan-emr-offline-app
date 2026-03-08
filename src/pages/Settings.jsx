import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, Download, Upload, Shield, CheckCircle, AlertTriangle, Wifi, Monitor, Smartphone, Tablet, RefreshCw, Server } from 'lucide-react';
import DatabaseService, { db } from '../services/database';
import licenseService from '../services/licenseService';

function Settings() {
  const [settings, setSettings] = useState({
    hospitalName: '',
    hospitalAddress: '',
    hospitalPhone: '',
    hospitalEmail: '',
    docOnApiUrl: '',
    docOnApiKey: '',
    autoSyncEnabled: true,
    syncIntervalMinutes: 5,
    gravityApiUrl: '',
    gravityApiKey: '',
    gravityAutoSyncEnabled: true,
    gravitySyncIntervalMinutes: 2
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState(null);
  const [userSyncStatus, setUserSyncStatus] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    loadSettings();
    loadLicense();
  }, []);

  const loadLicense = () => {
    const license = licenseService.getLicenseDisplay();
    setLicenseInfo(license);
  };

  const loadSettings = async () => {
    const loadedSettings = {
      hospitalName: await DatabaseService.getSetting('hospitalName') || '',
      hospitalAddress: await DatabaseService.getSetting('hospitalAddress') || '',
      hospitalPhone: await DatabaseService.getSetting('hospitalPhone') || '',
      hospitalEmail: await DatabaseService.getSetting('hospitalEmail') || '',
      docOnApiUrl: await DatabaseService.getSetting('docOnApiUrl') || '',
      docOnApiKey: await DatabaseService.getSetting('docOnApiKey') || '',
      autoSyncEnabled: (await DatabaseService.getSetting('autoSyncEnabled')) !== 'false',
      syncIntervalMinutes: parseInt(await DatabaseService.getSetting('syncIntervalMinutes')) || 5,
      gravityApiUrl: await DatabaseService.getSetting('gravityApiUrl') || '',
      gravityApiKey: await DatabaseService.getSetting('gravityApiKey') || '',
      gravityAutoSyncEnabled: (await DatabaseService.getSetting('gravityAutoSyncEnabled')) !== 'false',
      gravitySyncIntervalMinutes: parseInt(await DatabaseService.getSetting('gravitySyncIntervalMinutes')) || 2
    };
    setSettings(loadedSettings);
    setLoading(false);
  };

  // Dedicated static IP provided by hospital IT Admin — all devices use this
  const SYNC_SERVER = 'http://1.22.20.11:3001';

  const checkServerStatus = async () => {
    const url = SYNC_SERVER;
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const stats = await fetch(`${url}/api/stats`).then(r => r.json()).catch(() => ({}));
        setServerStatus({ ok: true, msg: `✅ Connected to ${url} — ${stats.patients || 0} patients, ${stats.prescriptions || 0} prescriptions on server` });
      } else {
        setServerStatus({ ok: false, msg: `❌ Server returned ${res.status}` });
      }
    } catch {
      setServerStatus({ ok: false, msg: `❌ Cannot reach ${url}. Make sure node server.cjs is running on the hospital server.` });
    }
  };

  const handlePushToServer = async () => {
    const url = SYNC_SERVER;
    if (!confirm('Push ALL local data (patients, prescriptions, vitals) to the central server?\n\nThis is safe — existing data on the server is preserved.')) return;
    if (!confirm('Push ALL local data (patients, prescriptions, vitals) to the central server?\n\nThis is safe — existing data on the server is preserved.')) return;

    setPushing(true);
    setPushStatus({ msg: 'Reading local database...', pct: 0 });
    try {
      const BATCH = 500;
      // Patients
      const patients = await db.patients.toArray();
      setPushStatus({ msg: `Pushing ${patients.length} patients...`, pct: 10 });
      for (let i = 0; i < patients.length; i += BATCH) {
        await fetch(`${url}/api/patients/bulk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patients: patients.slice(i, i + BATCH) })
        });
        setPushStatus({ msg: `Pushing patients... ${Math.min(i + BATCH, patients.length)}/${patients.length}`, pct: 10 + Math.round((i / patients.length) * 30) });
      }
      // Prescriptions
      const prescriptions = await db.prescriptions.toArray();
      setPushStatus({ msg: `Pushing ${prescriptions.length} prescriptions...`, pct: 40 });
      for (let i = 0; i < prescriptions.length; i += BATCH) {
        await fetch(`${url}/api/prescriptions/bulk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prescriptions: prescriptions.slice(i, i + BATCH) })
        });
        setPushStatus({ msg: `Pushing prescriptions... ${Math.min(i + BATCH, prescriptions.length)}/${prescriptions.length}`, pct: 40 + Math.round((i / prescriptions.length) * 30) });
      }
      // Vitals
      const vitals = await db.vitals.toArray();
      setPushStatus({ msg: `Pushing ${vitals.length} vitals...`, pct: 70 });
      for (let i = 0; i < vitals.length; i += BATCH) {
        await fetch(`${url}/api/vitals/bulk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vitals: vitals.slice(i, i + BATCH) })
        });
        setPushStatus({ msg: `Pushing vitals... ${Math.min(i + BATCH, vitals.length)}/${vitals.length}`, pct: 70 + Math.round((i / vitals.length) * 20) });
      }
      setPushStatus({ msg: `✅ Done! Pushed ${patients.length} patients, ${prescriptions.length} prescriptions, ${vitals.length} vitals to server.`, pct: 100, done: true });
    } catch (err) {
      setPushStatus({ msg: `❌ Push failed: ${err.message}`, error: true });
    }
    setPushing(false);
  };

  // Pull all data from central server into this device's local database
  const handlePullFromServer = async () => {
    const url = SYNC_SERVER;
    setPulling(true);
    setPullStatus({ msg: 'Connecting to server...', pct: 0 });
    try {
      const BATCH = 500;
      let page = 1;
      let totalPatients = 0;
      // Patients (paginated)
      setPullStatus({ msg: 'Downloading patients...', pct: 5 });
      while (true) {
        const res = await fetch(`${url}/api/patients?page=${page}&limit=${BATCH}`);
        if (!res.ok) break;
        const { patients } = await res.json();
        if (!patients || patients.length === 0) break;
        for (const p of patients) {
          try {
            const existing = await db.patients.where('uhid').equals(p.uhid || '').first();
            if (!existing) await db.patients.add({ ...p, id: undefined, syncStatus: 'synced' });
          } catch {}
        }
        totalPatients += patients.length;
        setPullStatus({ msg: `Downloading patients... ${totalPatients}`, pct: Math.min(5 + Math.round(totalPatients / 200), 50) });
        if (patients.length < BATCH) break;
        page++;
      }
      // Prescriptions
      setPullStatus({ msg: 'Downloading prescriptions...', pct: 55 });
      const rxRes = await fetch(`${url}/api/prescriptions?limit=5000`);
      let totalRx = 0;
      if (rxRes.ok) {
        const rxList = await rxRes.json();
        for (const rx of (Array.isArray(rxList) ? rxList : [])) {
          try { await db.prescriptions.add({ ...rx, id: undefined, syncStatus: 'synced' }); totalRx++; } catch {}
        }
        setPullStatus({ msg: `Downloaded ${totalRx} prescriptions`, pct: 70 });
      }
      // Vitals
      setPullStatus({ msg: 'Downloading vitals...', pct: 75 });
      const vRes = await fetch(`${url}/api/vitals?limit=10000`);
      let totalVitals = 0;
      if (vRes.ok) {
        const vList = await vRes.json();
        for (const v of (Array.isArray(vList) ? vList : [])) {
          try { await db.vitals.add({ ...v, id: undefined, syncStatus: 'synced' }); totalVitals++; } catch {}
        }
      }
      // Users
      setPullStatus({ msg: 'Syncing user accounts...', pct: 90 });
      const uRes = await fetch(`${url}/api/auth/users`);
      if (uRes.ok) {
        const serverUsers = await uRes.json();
        for (const u of serverUsers) {
          const existing = await db.users.where('username').equalsIgnoreCase(u.username).first();
          if (!existing) {
            await db.users.add({ ...u, isActive: u.isActive === 1 || u.isActive === true });
          } else {
            await db.users.update(existing.id, { password: u.password, name: u.name, role: u.role, permissions: u.permissions, isActive: u.isActive === 1 || u.isActive === true });
          }
        }
      }
      setPullStatus({ msg: `✅ Done! ${totalPatients} patients, ${totalRx} prescriptions, ${totalVitals} vitals downloaded.`, pct: 100, done: true });
    } catch (err) {
      setPullStatus({ msg: `❌ Pull failed: ${err.message}`, error: true });
    }
    setPulling(false);
  };

  // Push locally-created users (created offline) to the central server
  const handleSyncUsersToServer = async () => {
    const url = SYNC_SERVER;
    setUserSyncStatus({ msg: 'Syncing users...' });
    try {
      const localUsers = await db.users.toArray();
      let pushed = 0;
      for (const u of localUsers) {
        const res = await fetch(`${url}/api/auth/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...u, password: u.password })
        });
        if (res.ok) pushed++;
      }
      setUserSyncStatus({ msg: `✅ ${pushed} user(s) synced to server.`, done: true });
    } catch (err) {
      setUserSyncStatus({ msg: `❌ User sync failed: ${err.message}`, error: true });
    }
  };

  // Emergency: reset the local admin password to Vardhan@Hospital12* on this device
  const handleResetAdminPassword = async () => {
    if (!confirm('Reset local admin password to "Vardhan@Hospital12*" on THIS device?\n\nUse this if admin cannot log in on this device.')) return;
    try {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('Vardhan@Hospital12*', 10);
      const existing = (await db.users.where('username').equalsIgnoreCase('admin').toArray())[0];
      if (existing) {
        await db.users.update(existing.id, { password: hash, isActive: true });
      } else {
        await db.users.add({ username: 'admin', password: hash, name: 'System Administrator', email: 'admin@vardhanhospital.co.in', role: 'admin', permissions: ['all'], isActive: true, createdAt: new Date().toISOString(), lastLogin: null });
      }
      alert('✅ Admin password reset to: Vardhan@Hospital12*\n\nYou can now log in with admin / Vardhan@Hospital12*');
    } catch (err) {
      alert('❌ Reset failed: ' + err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await DatabaseService.setSetting(key, value.toString());
      }
      alert('✅ Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
    setSaving(false);
  };

  const handleBackup = async () => {
    try {
      const { data, filename } = await DatabaseService.createBackup();

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Backup created successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup failed: ' + error.message);
    }
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('⚠️ This will replace all existing data. Continue?')) {
      return;
    }

    try {
      const text = await file.text();
      await DatabaseService.restoreBackup(text);
      alert('✅ Data restored successfully! Reloading...');
      window.location.reload();
    } catch (error) {
      console.error('Restore failed:', error);
      alert('Restore failed: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-gray-600" />
        <span>Settings</span>
      </h1>

      {/* Hospital Information */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Hospital Information</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Hospital Name</label>
            <input
              type="text"
              value={settings.hospitalName}
              onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              value={settings.hospitalAddress}
              onChange={(e) => setSettings({ ...settings, hospitalAddress: e.target.value })}
              className="input"
              rows="2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={settings.hospitalPhone}
                onChange={(e) => setSettings({ ...settings, hospitalPhone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={settings.hospitalEmail}
                onChange={(e) => setSettings({ ...settings, hospitalEmail: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* License Information */}
      {licenseInfo && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>License Information</span>
          </h2>

          <div className={`p-4 rounded-lg border-l-4 mb-4 ${
            licenseInfo.status === 'valid'
              ? licenseInfo.color === 'green'
                ? 'bg-green-50 border-green-500'
                : 'bg-yellow-50 border-yellow-500'
              : 'bg-red-50 border-red-500'
          }`}>
            <div className="flex items-start space-x-3">
              {licenseInfo.status === 'valid' ? (
                <CheckCircle className={`w-6 h-6 flex-shrink-0 ${
                  licenseInfo.color === 'green' ? 'text-green-600' : 'text-yellow-600'
                }`} />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  licenseInfo.status === 'valid'
                    ? licenseInfo.color === 'green' ? 'text-green-800' : 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  {licenseInfo.status === 'valid' ? 'License Valid' : 'License Issue'}
                </p>
                {licenseInfo.expiryWarning && (
                  <p className="text-yellow-700 text-sm mt-1">
                    ⚠️ {licenseInfo.expiryWarning}
                  </p>
                )}
                {licenseInfo.message && (
                  <p className="text-red-700 text-sm mt-1">
                    {licenseInfo.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {licenseInfo.status === 'valid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Product:</span>
                  <span className="font-semibold">{licenseInfo.productName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-semibold">v{licenseInfo.version}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Licensed To:</span>
                  <span className="font-semibold">{licenseInfo.licensedTo}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-semibold">{licenseInfo.location}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">License Type:</span>
                  <span className="font-semibold">{licenseInfo.licenseType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Max Users:</span>
                  <span className="font-semibold">{licenseInfo.maxUsers} concurrent</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Install Date:</span>
                  <span className="font-semibold">
                    {new Date(licenseInfo.installDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Expiry Date:</span>
                  <span className={`font-semibold ${
                    licenseInfo.expiringSoon ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {new Date(licenseInfo.expiryDate).toLocaleDateString()}
                    {licenseInfo.daysUntilExpiry && (
                      <span className="text-xs ml-2">
                        ({licenseInfo.daysUntilExpiry} days left)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="text-blue-800 font-semibold">
              Vendor: {licenseService.getSupportInfo().vendor}
            </p>
            <p className="text-blue-700 mt-1">
              Support: {licenseService.getSupportInfo().email}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              {licenseService.getSupportInfo().supportHours}
            </p>
          </div>
        </div>
      )}

      {/* Doc On Integration */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Doc On / Doctors App Integration</h2>
        <div className="space-y-4">
          <div>
            <label className="label">API URL</label>
            <input
              type="text"
              value={settings.docOnApiUrl}
              onChange={(e) => setSettings({ ...settings, docOnApiUrl: e.target.value })}
              placeholder="https://api.doctorsapp.in/v1"
              className="input"
            />
          </div>
          <div>
            <label className="label">API Key</label>
            <input
              type="password"
              value={settings.docOnApiKey}
              onChange={(e) => setSettings({ ...settings, docOnApiKey: e.target.value })}
              placeholder="Enter your Doc On API key"
              className="input"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoSync"
              checked={settings.autoSyncEnabled}
              onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="autoSync" className="text-sm font-semibold">
              Enable automatic sync when online
            </label>
          </div>
          <div>
            <label className="label">Sync Interval (minutes)</label>
            <select
              value={settings.syncIntervalMinutes}
              onChange={(e) => setSettings({ ...settings, syncIntervalMinutes: parseInt(e.target.value) })}
              className="input"
              disabled={!settings.autoSyncEnabled}
            >
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gravity HMS Integration */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Gravity HMS Integration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Gravity HMS to automatically sync appointments and walk-in data in real-time.
        </p>
        <div className="space-y-4">
          <div>
            <label className="label">Gravity API URL</label>
            <input
              type="text"
              value={settings.gravityApiUrl}
              onChange={(e) => setSettings({ ...settings, gravityApiUrl: e.target.value })}
              placeholder="https://gravity-hms.example.com/api"
              className="input"
            />
          </div>
          <div>
            <label className="label">Gravity API Key</label>
            <input
              type="password"
              value={settings.gravityApiKey}
              onChange={(e) => setSettings({ ...settings, gravityApiKey: e.target.value })}
              placeholder="Enter your Gravity HMS API key"
              className="input"
            />
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="gravityAutoSync"
              checked={settings.gravityAutoSyncEnabled}
              onChange={(e) => setSettings({ ...settings, gravityAutoSyncEnabled: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="gravityAutoSync" className="text-sm font-semibold">
              Enable automatic sync with Gravity HMS
            </label>
          </div>
          <div>
            <label className="label">Gravity Sync Interval (minutes)</label>
            <select
              value={settings.gravitySyncIntervalMinutes}
              onChange={(e) => setSettings({ ...settings, gravitySyncIntervalMinutes: parseInt(e.target.value) })}
              className="input"
              disabled={!settings.gravityAutoSyncEnabled}
            >
              <option value="1">1 minute</option>
              <option value="2">2 minutes (recommended)</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
            </select>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-800">
              <strong>Note:</strong> Real-time appointment sync ensures that walk-ins and appointments
              created in Gravity HMS are immediately available in your EMR for consultations.
            </p>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Backup & Restore</h2>
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Create backups of your data for safekeeping. You can restore from a backup file anytime.
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackup}
              className="btn-primary flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Backup</span>
            </button>
            <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Restore from Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Central Sync Server Setup */}
      <div className="card border-l-4 border-green-500">
        <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
          <Server className="w-6 h-6 text-green-600" />
          <span>Central Sync Server — Step-by-Step Setup</span>
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm">
          <p className="font-semibold text-green-800 mb-2">One-time setup to share data & logins across all devices:</p>
          <ol className="text-green-700 space-y-1 list-decimal list-inside">
            <li>On the <strong>main hospital PC</strong> (IP <code className="bg-white border border-green-300 rounded px-1">192.168.1.131</code>), open Command Prompt in the app folder and run: <code className="bg-white border border-green-300 rounded px-1">node server.cjs</code> — keep this window open always</li>
            <li>Hospital IT must forward <code className="bg-white border border-green-300 rounded px-1">1.22.20.11:3001</code> → <code className="bg-white border border-green-300 rounded px-1">192.168.1.131:3001</code> and <code className="bg-white border border-green-300 rounded px-1">1.22.20.11:3000</code> → <code className="bg-white border border-green-300 rounded px-1">192.168.1.131:3000</code> on the router/firewall</li>
            <li>Windows Firewall on the PC must allow inbound on ports <code className="bg-white border border-green-300 rounded px-1">3000</code> and <code className="bg-white border border-green-300 rounded px-1">3001</code></li>
            <li>All devices (hospital + Hyderabad) open: <code className="bg-white border border-green-300 rounded px-1">http://1.22.20.11:3000</code></li>
            <li>Click <strong>Test Server Connection</strong> — should show ✅ Connected</li>
            <li>From the <strong>main PC only</strong>: click <strong>Push All Data to Server</strong> (uploads all 71,000+ records — do once)</li>
            <li>From each <strong>doctor/nurse device</strong>: login → then click <strong>Pull All Data from Server</strong></li>
            <li>If a user was created while server was offline: click <strong>Sync Users to Server</strong></li>
          </ol>
        </div>

        {/* Server Status Check */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={checkServerStatus}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Test Server Connection</span>
          </button>
          {serverStatus && (
            <p className={`text-sm font-semibold ${serverStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
              {serverStatus.msg}
            </p>
          )}
        </div>

        {/* Push Data Button — Admin PC: upload to server */}
        <div className="mb-4">
          <button
            onClick={handlePushToServer}
            disabled={pushing}
            className="btn-primary flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>{pushing ? 'Pushing...' : 'Push All Data to Server'}</span>
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Run from the <strong>main PC</strong> — uploads all local data (patients, prescriptions, vitals) to the central server.
          </p>
          {pushStatus && (
            <div className={`mt-3 p-3 rounded-lg ${pushStatus.done ? 'bg-green-50 border border-green-300' : pushStatus.error ? 'bg-red-50 border border-red-300' : 'bg-blue-50 border border-blue-300'}`}>
              <p className={`text-sm font-semibold ${pushStatus.done ? 'text-green-800' : pushStatus.error ? 'text-red-800' : 'text-blue-800'}`}>
                {pushStatus.msg}
              </p>
              {!pushStatus.done && !pushStatus.error && (
                <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pushStatus.pct}%` }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pull Data Button — Other devices: download from server */}
        <div className="mb-4">
          <button
            onClick={handlePullFromServer}
            disabled={pulling}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>{pulling ? 'Downloading...' : 'Pull All Data from Server'}</span>
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Run on <strong>doctor/nurse PCs</strong> after first login — downloads all patient data from the server to this device.
          </p>
          {pullStatus && (
            <div className={`mt-3 p-3 rounded-lg ${pullStatus.done ? 'bg-green-50 border border-green-300' : pullStatus.error ? 'bg-red-50 border border-red-300' : 'bg-blue-50 border border-blue-300'}`}>
              <p className={`text-sm font-semibold ${pullStatus.done ? 'text-green-800' : pullStatus.error ? 'text-red-800' : 'text-blue-800'}`}>
                {pullStatus.msg}
              </p>
              {!pullStatus.done && !pullStatus.error && (
                <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pullStatus.pct}%` }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Users Button — push offline-created users to server */}
        <div>
          <button
            onClick={handleSyncUsersToServer}
            className="btn-secondary flex items-center space-x-2"
          >
            <Shield className="w-5 h-5" />
            <span>Sync Users to Server</span>
          </button>
          <p className="text-xs text-gray-500 mt-1">
            If users were created in User Management while the server was offline, run this to push them to the server so they can login from any device.
          </p>
          {userSyncStatus && (
            <p className={`mt-2 text-sm font-semibold ${userSyncStatus.done ? 'text-green-700' : userSyncStatus.error ? 'text-red-700' : 'text-blue-700'}`}>
              {userSyncStatus.msg}
            </p>
          )}
        </div>

        {/* Emergency: Reset Admin Password on this device */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            onClick={handleResetAdminPassword}
            className="btn-secondary flex items-center space-x-2 border-red-300 text-red-700 hover:bg-red-50"
          >
            <Shield className="w-5 h-5" />
            <span>Reset Admin Password (Emergency)</span>
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Use only if admin cannot log in on this device. Resets local admin password to <strong>Vardhan@Hospital12*</strong> on this device only.
          </p>
        </div>
      </div>

      {/* Network Access - Multi-Device Setup */}
      <div className="card border-l-4 border-blue-500">
        <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
          <Wifi className="w-6 h-6 text-blue-600" />
          <span>Multi-Device Network Access</span>
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          NexaCare Pro is running on your hospital server. Other devices on the same hospital Wi-Fi network
          can access it directly in their browser — no installation needed.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="font-semibold text-blue-800 mb-2">How to Connect Other Devices:</p>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>Find your server's local IP address:
              <span className="block ml-6 mt-1 font-mono bg-white border border-blue-200 rounded px-2 py-1 text-blue-900">
                On the server PC → Open Command Prompt → type: <strong>ipconfig</strong> → note the IPv4 Address (e.g. 192.168.1.10)
              </span>
            </li>
            <li className="mt-2">On any device connected to hospital Wi-Fi, open a browser and go to:
              <span className="block ml-6 mt-1 font-mono bg-white border border-blue-200 rounded px-2 py-1 text-blue-900">
                <strong>http://192.168.1.10:3000</strong> (replace with your server's IP)
              </span>
            </li>
            <li className="mt-2">Login with the assigned username and password</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Monitor className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Desktop PCs</p>
              <p className="text-xs text-gray-600 mt-1">Open Chrome/Edge/Firefox → type server IP:3000</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Tablet className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Doctor's Mac / iPad</p>
              <p className="text-xs text-gray-600 mt-1">Open Safari/Chrome → type server IP:3000. Install as PWA for app experience.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Smartphone className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Mobile Phones</p>
              <p className="text-xs text-gray-600 mt-1">Open Chrome → type server IP:3000 → tap "Add to Home Screen" for app icon.</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm">
          <p className="font-semibold text-yellow-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Important — Data Sharing Note:</span>
          </p>
          <p className="text-yellow-700 mt-1">
            Each device stores data locally in its own browser. To share data between all devices,
            configure the <strong>Doc On API</strong> above (for cloud sync) so all devices stay in sync.
            Alternatively, always use the <strong>same device/browser</strong> for data entry, and other
            devices for read-only viewing after syncing.
          </p>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-green-800">Installing as App (PWA) on Doctor's Mac/iPad:</p>
          <ol className="text-green-700 mt-1 list-decimal list-inside space-y-1">
            <li>Open the app URL in Safari (Mac/iPad) or Chrome (Android)</li>
            <li>Click the Share button → "Add to Home Screen" (iOS/iPadOS)</li>
            <li>Or in Chrome: click the install icon in the address bar (⊕)</li>
            <li>The app opens in full-screen, works offline after first load</li>
          </ol>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-success flex items-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
}

export default Settings;
