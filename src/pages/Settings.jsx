import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, Download, Upload, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import DatabaseService from '../services/database';
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
