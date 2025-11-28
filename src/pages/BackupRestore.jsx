import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, CheckCircle, AlertTriangle, Clock, HardDrive, Shield } from 'lucide-react';
import backupService from '../services/backupService';
import DatabaseService from '../services/database';
import { format } from 'date-fns';

function BackupRestore() {
  const [backupStats, setBackupStats] = useState(null);
  const [autoBackups, setAutoBackups] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = backupService.getBackupStats();
    const backups = backupService.getAutomaticBackups();
    const database = await DatabaseService.getStats();

    setBackupStats(stats);
    setAutoBackups(backups);
    setDbStats(database);
  };

  const handleManualBackup = async () => {
    setLoading(true);
    setMessage(null);

    const result = await backupService.createManualBackup();

    if (result.success) {
      setMessage({
        type: 'success',
        text: `Backup created successfully! Downloaded: ${result.filename}`,
        details: result.counts
      });
    } else {
      setMessage({
        type: 'error',
        text: `Backup failed: ${result.error}`
      });
    }

    setLoading(false);
    loadStats();
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm(`⚠️ WARNING: This will restore data from backup.\n\nCurrent data will be merged with backup data.\n\nContinue?`)) {
      event.target.value = '';
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await backupService.restoreFromFile(file);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Database restored successfully!',
        details: result.results
      });

      // Reload page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setMessage({
        type: 'error',
        text: `Restore failed: ${result.error}`
      });
    }

    setLoading(false);
    event.target.value = '';
    loadStats();
  };

  const handleRestoreAutoBackup = async (backup) => {
    if (!confirm(`⚠️ Restore from automatic backup?\n\nDate: ${format(new Date(backup.timestamp), 'PPpp')}\n\nPatients: ${backup.counts.patients}\nPrescriptions: ${backup.counts.prescriptions}\n\nContinue?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await backupService.restoreDatabase(backup.data);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Restored from automatic backup!',
        details: result.results
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setMessage({
        type: 'error',
        text: `Restore failed: ${result.error}`
      });
    }

    setLoading(false);
    loadStats();
  };

  return (
    <div className="space-y-6 fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <Database className="w-8 h-8 text-blue-600" />
          <span>Backup & Restore</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Protect your patient data with automatic and manual backups
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg border-l-4 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-start space-x-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
              {message.details && (
                <div className="mt-2 text-sm text-gray-700">
                  <p>Restored:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Patients: {message.details.patients}</li>
                    <li>Prescriptions: {message.details.prescriptions}</li>
                    <li>Vitals: {message.details.vitals}</li>
                    <li>Lab Reports: {message.details.labReports}</li>
                    <li>Appointments: {message.details.appointments}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Database Stats */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <HardDrive className="w-6 h-6 text-blue-600" />
          <span>Current Database</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{dbStats?.totalPatients || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Patients</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{dbStats?.totalPrescriptions || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Prescriptions</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{dbStats?.totalVitals || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Vitals</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{dbStats?.totalAppointments || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Appointments</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{dbStats?.pendingSyncItems || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Sync</p>
          </div>
        </div>
      </div>

      {/* Manual Backup/Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Backup */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Download className="w-6 h-6 text-green-600" />
            <span>Create Backup</span>
          </h2>

          <p className="text-gray-600 mb-4">
            Download a complete backup of all patient data to your computer.
          </p>

          <button
            onClick={handleManualBackup}
            disabled={loading}
            className="btn-success w-full flex items-center justify-center space-x-2 py-3"
          >
            {loading ? (
              <>
                <div className="spinner w-5 h-5"></div>
                <span>Creating Backup...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Backup File</span>
              </>
            )}
          </button>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <Shield className="w-4 h-4 inline mr-1" />
              Backups are encrypted and include all patient records, prescriptions, vitals, and appointments.
            </p>
          </div>
        </div>

        {/* Manual Restore */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Upload className="w-6 h-6 text-purple-600" />
            <span>Restore from Backup</span>
          </h2>

          <p className="text-gray-600 mb-4">
            Upload a backup file to restore your patient data.
          </p>

          <label className="btn-primary w-full flex items-center justify-center space-x-2 py-3 cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
              disabled={loading}
            />
            <Upload className="w-5 h-5" />
            <span>Select Backup File</span>
          </label>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Warning: Restore will merge backup data with existing data. Create a backup first!
            </p>
          </div>
        </div>
      </div>

      {/* Automatic Backups */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
          <Clock className="w-6 h-6 text-blue-600" />
          <span>Automatic Backups</span>
        </h2>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Auto-Backup Status</p>
              <p className="text-sm text-gray-600 mt-1">
                {backupStats?.isRunning ? '✅ Running - Backs up every hour' : '⏸️ Stopped'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Backup</p>
              <p className="font-semibold text-gray-800">
                {backupStats?.lastBackupTime
                  ? format(new Date(backupStats.lastBackupTime), 'PPp')
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          System automatically creates backups every hour. You can restore from any backup below.
        </p>

        {autoBackups.length > 0 ? (
          <div className="space-y-2">
            {autoBackups.map((backup, index) => (
              <div
                key={backup.key}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Backup #{autoBackups.length - index}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(backup.timestamp), 'PPpp')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Patients: {backup.counts.patients} •
                    Prescriptions: {backup.counts.prescriptions} •
                    Vitals: {backup.counts.vitals}
                  </p>
                </div>
                <button
                  onClick={() => handleRestoreAutoBackup(backup)}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" />
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No automatic backups yet</p>
            <p className="text-sm mt-1">First backup will be created within an hour</p>
          </div>
        )}
      </div>

      {/* Best Practices */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Backup Best Practices</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Create manual backups daily, especially before major updates</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Store backup files in multiple locations (USB drive, cloud storage)</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Test restore process regularly to ensure backups work</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Keep at least 3 backup copies at different locations</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Automatic backups protect against accidental data loss</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default BackupRestore;
