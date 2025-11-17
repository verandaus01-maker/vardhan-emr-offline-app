import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Database, Download, Upload } from 'lucide-react';
import DatabaseService from '../services/database';

function Settings() {
  const [settings, setSettings] = useState({
    hospitalName: '',
    hospitalAddress: '',
    hospitalPhone: '',
    hospitalEmail: '',
    docOnApiUrl: '',
    docOnApiKey: '',
    autoSyncEnabled: true,
    syncIntervalMinutes: 5
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = {
      hospitalName: await DatabaseService.getSetting('hospitalName') || '',
      hospitalAddress: await DatabaseService.getSetting('hospitalAddress') || '',
      hospitalPhone: await DatabaseService.getSetting('hospitalPhone') || '',
      hospitalEmail: await DatabaseService.getSetting('hospitalEmail') || '',
      docOnApiUrl: await DatabaseService.getSetting('docOnApiUrl') || '',
      docOnApiKey: await DatabaseService.getSetting('docOnApiKey') || '',
      autoSyncEnabled: (await DatabaseService.getSetting('autoSyncEnabled')) !== 'false',
      syncIntervalMinutes: parseInt(await DatabaseService.getSetting('syncIntervalMinutes')) || 5
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
