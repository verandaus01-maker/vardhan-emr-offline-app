import React, { useState } from 'react';
import { Database, Download, Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import syncService from '../services/syncService';
import DatabaseService from '../services/database';

function DataMigration() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImportFromDocOn = async () => {
    // Check if API credentials are configured
    const apiUrl = await DatabaseService.getSetting('docOnApiUrl');
    const apiKey = await DatabaseService.getSetting('docOnApiKey');

    if (!apiUrl || !apiKey) {
      setError('Please configure Doc On API credentials in Settings first');
      return;
    }

    if (!confirm(
      '🔄 Import Patient Data from Doc On\n\n' +
      'This will import all patient records from your Doc On account.\n' +
      'This may take several minutes depending on the number of patients.\n\n' +
      'Continue?'
    )) {
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');
    setProgress({ page: 0, count: 0, total: 0 });

    try {
      const result = await syncService.importPatientsFromDocOn((progressData) => {
        setProgress(progressData);
      });

      setSuccess(`✅ Successfully imported ${result.totalImported} patients from Doc On!`);
      setProgress(null);

    } catch (error) {
      console.error('Import failed:', error);
      setError(`Import failed: ${error.message}`);
      setProgress(null);
    } finally {
      setImporting(false);
    }
  };

  const handleExportToCsv = async () => {
    try {
      const patients = await DatabaseService.getAllPatients(10000);

      // Create CSV content
      const headers = ['UHID', 'Name', 'Age', 'Gender', 'Phone', 'Email', 'Address', 'Blood Group', 'Registration Date'];
      const rows = patients.map(p => [
        p.uhid,
        p.name,
        p.age,
        p.gender,
        p.phone || '',
        p.email || '',
        p.address || '',
        p.bloodGroup || '',
        p.registrationDate || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vardhan-patients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`✅ Exported ${patients.length} patients to CSV`);

    } catch (error) {
      console.error('Export failed:', error);
      setError(`Export failed: ${error.message}`);
    }
  };

  const handleImportFromCsv = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const patient = {
          uhid: values[0],
          name: values[1],
          age: parseInt(values[2]) || 0,
          gender: values[3],
          phone: values[4],
          email: values[5],
          address: values[6],
          bloodGroup: values[7],
          registrationDate: values[8] || new Date().toISOString()
        };

        // Check if patient already exists
        const existing = await DatabaseService.getPatientByUHID(patient.uhid);
        if (!existing) {
          await DatabaseService.addPatient(patient);
          imported++;
        }
      }

      setSuccess(`✅ Imported ${imported} patients from CSV`);

    } catch (error) {
      console.error('Import from CSV failed:', error);
      setError(`Import failed: ${error.message}`);
    }

    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
        <Database className="w-8 h-8 text-green-600" />
        <span>Data Migration & Import</span>
      </h1>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-1">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-start space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800 mb-1">Success</h3>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Import Progress */}
      {importing && progress && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <h3 className="font-semibold text-blue-800 text-lg">Importing from Doc On...</h3>
          </div>
          <div className="space-y-2">
            <p className="text-blue-700">
              Page: {progress.page} | Imported: {progress.total} patients
            </p>
            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 animate-pulse"
                style={{ width: '100%' }}
              />
            </div>
            <p className="text-sm text-blue-600">
              Please wait... This may take several minutes for large datasets.
            </p>
          </div>
        </div>
      )}

      {/* Import from Doc On */}
      <div className="card">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Import from Doc On / Doctors App</h2>
            <p className="text-gray-600 mb-4">
              Import all your existing patient records (27,000+) from your Doc On account.
              This is a one-time migration that will bring all patient data into your offline database.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4">
              <h4 className="font-semibold text-yellow-800 mb-2">Before you start:</h4>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Configure your Doc On API credentials in Settings</li>
                <li>Ensure you have a stable internet connection</li>
                <li>This process may take 10-30 minutes depending on data size</li>
                <li>Do not close the app during import</li>
              </ul>
            </div>
            <button
              onClick={handleImportFromDocOn}
              disabled={importing}
              className="btn-primary flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>{importing ? 'Importing...' : 'Start Import from Doc On'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import/Export CSV */}
      <div className="card">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Import/Export CSV</h2>
            <p className="text-gray-600 mb-4">
              Import patient data from a CSV file or export your current patient database to CSV format.
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportToCsv}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Export to CSV</span>
              </button>
              <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Import from CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportFromCsv}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Data Entry */}
      <div className="card">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Sample Data</h2>
            <p className="text-gray-600 mb-4">
              Load sample patient data for testing and training purposes.
            </p>
            <button className="btn-secondary">
              Load Sample Data (100 patients)
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <h3 className="font-bold text-lg mb-3 text-blue-800">Migration Instructions</h3>
        <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
          <li>
            <strong>Configure API:</strong> Go to Settings and enter your Doc On API URL and API Key
          </li>
          <li>
            <strong>Start Import:</strong> Click "Start Import from Doc On" above
          </li>
          <li>
            <strong>Wait:</strong> The import will run in the background. Don't close the app.
          </li>
          <li>
            <strong>Verify:</strong> Once complete, check the patient database
          </li>
          <li>
            <strong>Backup:</strong> Create a backup of your data from Settings
          </li>
        </ol>
      </div>
    </div>
  );
}

export default DataMigration;
