import React, { useState } from 'react';
import { Database, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import DatabaseService from '../services/database';

function DocOnImporter() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const [files, setFiles] = useState({
    patients: null,
    visits: null,
    vitals: null,
    labResults: null,
    appointments: null,
    prescriptions: null,
    other: null
  });

  /**
   * Parse CSV line properly
   */
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  /**
   * Parse CSV file to JSON
   */
  const parseCSV = async (file) => {
    const text = await file.text();

    // Remove BOM if present
    let cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, index) => {
        row[header.trim()] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  };

  /**
   * Parse date from DD/MM/YYYY format
   */
  const parseDocOnDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();

    try {
      // DD/MM/YYYY format
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
      }
    } catch (e) {
      // Ignore
    }

    return new Date().toISOString();
  };

  /**
   * Import patients from CSV
   */
  const importPatients = async (data) => {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of data) {
      try {
        const firstName = row.patientFirstName || row.firstName || '';
        const lastName = row.patientLastName || row.lastName || '';
        const name = `${firstName} ${lastName}`.trim() || 'Unknown';

        const patient = {
          uhid: row.patientOfficeID || row.officeID || `AUTO_${Date.now()}_${imported}`,
          name: name,
          age: parseInt(row.age) || 0,
          gender: row.gender || row.sex || '',
          phone: row.phoneNumber || row.mobile || row.phone || '',
          email: row.email || '',
          address: row.address || '',
          bloodGroup: row.bloodGroup || '',
          aadhaar: row.aadhaar || '',
          dateOfBirth: row.dob || row.dateOfBirth || '',
          emergencyContact: row.emergencyContact || '',
          registrationDate: parseDocOnDate(row.date || row.registrationDate),
          // Store original Doc On ID for reference
          docOnPatientID: row.patientID || row._id || '',
          docOnOfficeID: row.patientOfficeID || ''
        };

        // Check if patient already exists
        const existing = await DatabaseService.getPatientByUHID(patient.uhid);
        if (existing) {
          skipped++;
          continue;
        }

        await DatabaseService.addPatient(patient);
        imported++;

      } catch (error) {
        errors.push(`Patient ${row.patientOfficeID || 'unknown'}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  };

  /**
   * Import lab results
   */
  const importLabResults = async (data) => {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Group by patient and date
    const groupedResults = {};

    for (const row of data) {
      try {
        const officeID = row.patientOfficeID;
        const date = parseDocOnDate(row.date);
        const key = `${officeID}_${date.split('T')[0]}`;

        if (!groupedResults[key]) {
          groupedResults[key] = {
            officeID,
            date,
            patientName: `${row.patientFirstName || ''} ${row.patientLastName || ''}`.trim(),
            tests: []
          };
        }

        groupedResults[key].tests.push({
          testName: row.parameterName || row.investigationName || 'Unknown Test',
          value: row.value || '',
          unit: row.unit || '',
          range: row.range || '',
          status: row.status || '',
          type: row.type || ''
        });

      } catch (error) {
        errors.push(`Lab result for ${row.patientOfficeID}: ${error.message}`);
      }
    }

    // Save grouped lab reports
    for (const key in groupedResults) {
      try {
        const report = groupedResults[key];

        // Find patient by UHID
        const patient = await DatabaseService.getPatientByUHID(report.officeID);
        if (!patient) {
          errors.push(`Patient not found for lab report: ${report.officeID}`);
          continue;
        }

        const labReport = {
          patientId: patient.id,
          uhid: report.officeID,
          date: report.date,
          testType: 'Multiple Tests',
          results: JSON.stringify(report.tests),
          createdAt: report.date,
          syncStatus: 'synced'
        };

        await DatabaseService.db.labReports.add(labReport);
        imported++;

      } catch (error) {
        errors.push(`Failed to save lab report ${key}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  };

  /**
   * Import vitals
   */
  const importVitals = async (data) => {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Group by patient and date
    const groupedVitals = {};

    for (const row of data) {
      try {
        const officeID = row.patientOfficeID;
        const date = parseDocOnDate(row.date);
        const key = `${officeID}_${date.split('T')[0]}`;

        if (!groupedVitals[key]) {
          groupedVitals[key] = {
            officeID,
            date,
            vitals: {}
          };
        }

        // Map vital names to standard fields
        const vitalName = row.name.toLowerCase();
        if (vitalName.includes('systolic') || vitalName.includes('bp')) {
          groupedVitals[key].vitals.systolic = parseFloat(row.value) || 0;
        } else if (vitalName.includes('diastolic')) {
          groupedVitals[key].vitals.diastolic = parseFloat(row.value) || 0;
        } else if (vitalName.includes('pulse') || vitalName.includes('hr')) {
          groupedVitals[key].vitals.pulse = parseFloat(row.value) || 0;
        } else if (vitalName.includes('temp')) {
          groupedVitals[key].vitals.temperature = parseFloat(row.value) || 0;
        } else if (vitalName.includes('spo2') || vitalName.includes('oxygen')) {
          groupedVitals[key].vitals.spo2 = parseFloat(row.value) || 0;
        } else if (vitalName.includes('weight')) {
          groupedVitals[key].vitals.weight = parseFloat(row.value) || 0;
        } else if (vitalName.includes('height')) {
          groupedVitals[key].vitals.height = parseFloat(row.value) || 0;
        } else if (vitalName.includes('bmi')) {
          groupedVitals[key].vitals.bmi = parseFloat(row.value) || 0;
        } else if (vitalName.includes('fundal')) {
          groupedVitals[key].vitals.fundalHeight = parseFloat(row.value) || 0;
        }

      } catch (error) {
        errors.push(`Vital for ${row.patientOfficeID}: ${error.message}`);
      }
    }

    // Save grouped vitals
    for (const key in groupedVitals) {
      try {
        const vitalGroup = groupedVitals[key];

        // Find patient by UHID
        const patient = await DatabaseService.getPatientByUHID(vitalGroup.officeID);
        if (!patient) {
          errors.push(`Patient not found for vitals: ${vitalGroup.officeID}`);
          continue;
        }

        const vital = {
          patientId: patient.id,
          uhid: vitalGroup.officeID,
          date: vitalGroup.date,
          ...vitalGroup.vitals,
          recordedBy: 'Doc On Import',
          createdAt: vitalGroup.date,
          syncStatus: 'synced'
        };

        await DatabaseService.db.vitals.add(vital);
        imported++;

      } catch (error) {
        errors.push(`Failed to save vitals ${key}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  };

  /**
   * Import visits (prescriptions)
   */
  const importVisits = async (data) => {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of data) {
      try {
        const officeID = row.patientOfficeID;

        // Find patient by UHID
        const patient = await DatabaseService.getPatientByUHID(officeID);
        if (!patient) {
          errors.push(`Patient not found for visit: ${officeID}`);
          continue;
        }

        // Parse diagnosis (it's a stringified array)
        let diagnosis = 'General Consultation';
        try {
          const diagnosisArray = JSON.parse(row.diagnosis.replace(/'/g, '"'));
          if (diagnosisArray.length > 0 && diagnosisArray[0].name) {
            diagnosis = diagnosisArray.map(d => d.name).join(', ');
          }
        } catch (e) {
          diagnosis = row.diagnosis || 'General Consultation';
        }

        // Parse medicines
        let medicines = [];
        try {
          const medicinesArray = JSON.parse(row.medicines.replace(/'/g, '"'));
          medicines = medicinesArray;
        } catch (e) {
          medicines = [row.medicines];
        }

        // Parse symptoms
        let symptoms = '';
        try {
          const symptomsArray = JSON.parse(row.symptoms.replace(/'/g, '"'));
          symptoms = symptomsArray.map(s => s.name).filter(n => n).join(', ');
        } catch (e) {
          symptoms = row.symptoms || '';
        }

        const prescription = {
          patientId: patient.id,
          uhid: officeID,
          date: parseDocOnDate(row.dateTime || row.date),
          doctorId: 1, // Default doctor
          diagnosis: diagnosis,
          symptoms: symptoms,
          medications: JSON.stringify(medicines.map(med => ({
            drugName: med,
            dosage: '',
            frequency: '',
            duration: '',
            instructions: ''
          }))),
          advice: row.investigationNote || '',
          followUpDays: parseInt(row.followUpDays) || 0,
          createdAt: parseDocOnDate(row.dateTime || row.date),
          syncStatus: 'synced'
        };

        await DatabaseService.db.prescriptions.add(prescription);
        imported++;

      } catch (error) {
        errors.push(`Visit for ${row.patientOfficeID}: ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  };

  /**
   * Main import handler
   */
  const handleImport = async () => {
    if (!files.patients) {
      setError('Please upload at least the patients file');
      return;
    }

    setImporting(true);
    setError('');
    setResults(null);
    setProgress({ step: 'Starting import...', current: 0, total: 0 });

    try {
      const importResults = {
        patients: { imported: 0, skipped: 0, errors: [] },
        vitals: { imported: 0, skipped: 0, errors: [] },
        labResults: { imported: 0, skipped: 0, errors: [] },
        visits: { imported: 0, skipped: 0, errors: [] }
      };

      // Step 1: Import Patients (MUST be first)
      if (files.patients) {
        setProgress({ step: 'Importing patients...', current: 1, total: 4 });
        const patientsData = await parseCSV(files.patients);
        importResults.patients = await importPatients(patientsData);
      }

      // Step 2: Import Vitals
      if (files.vitals) {
        setProgress({ step: 'Importing vitals...', current: 2, total: 4 });
        const vitalsData = await parseCSV(files.vitals);
        importResults.vitals = await importVitals(vitalsData);
      }

      // Step 3: Import Lab Results
      if (files.labResults) {
        setProgress({ step: 'Importing lab results...', current: 3, total: 4 });
        const labData = await parseCSV(files.labResults);
        importResults.labResults = await importLabResults(labData);
      }

      // Step 4: Import Visits
      if (files.visits) {
        setProgress({ step: 'Importing visits/prescriptions...', current: 4, total: 4 });
        const visitsData = await parseCSV(files.visits);
        importResults.visits = await importVisits(visitsData);
      }

      setResults(importResults);
      setProgress(null);

    } catch (error) {
      console.error('Import failed:', error);
      setError(`Import failed: ${error.message}`);
      setProgress(null);
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (type, event) => {
    const file = event.target.files[0];
    setFiles({ ...files, [type]: file });
  };

  return (
    <div className="space-y-6 fade-in max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
        <Database className="w-8 h-8 text-green-600" />
        <span>Doc On Multi-Sheet Importer</span>
      </h1>

      {/* Instructions */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <h3 className="font-bold text-lg mb-3 text-blue-800">📋 How to Import Your Doc On Data</h3>
        <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
          <li><strong>Export from Doc On:</strong> Export each sheet as CSV (patients, visits, patient_vitals, investigating_result)</li>
          <li><strong>Upload files below:</strong> Upload each CSV file to its corresponding slot</li>
          <li><strong>Click Import:</strong> System will import all data in correct order</li>
          <li><strong>Patients must be uploaded first</strong> (other files are optional)</li>
        </ol>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-1">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="spinner w-6 h-6 border-blue-600"></div>
            <h3 className="font-semibold text-blue-800 text-lg">{progress.step}</h3>
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* File Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patients File (Required) */}
        <div className="card border-2 border-green-300">
          <h3 className="font-bold mb-2 text-green-800">1. Patients Sheet (Required)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Contains: patientOfficeID, patientFirstName, patientLastName, age, gender, phone, etc.
          </p>
          <label className="btn-primary flex items-center justify-center space-x-2 cursor-pointer w-full">
            <Upload className="w-5 h-5" />
            <span>{files.patients ? files.patients.name : 'Upload Patients CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange('patients', e)}
              className="hidden"
              disabled={importing}
            />
          </label>
          {files.patients && (
            <div className="mt-2 text-sm text-green-700 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Ready to import</span>
            </div>
          )}
        </div>

        {/* Vitals File */}
        <div className="card">
          <h3 className="font-bold mb-2">2. Patient Vitals Sheet (Optional)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Contains: BP, pulse, SPO2, weight, temperature, etc.
          </p>
          <label className="btn-secondary flex items-center justify-center space-x-2 cursor-pointer w-full">
            <Upload className="w-5 h-5" />
            <span>{files.vitals ? files.vitals.name : 'Upload Vitals CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange('vitals', e)}
              className="hidden"
              disabled={importing}
            />
          </label>
          {files.vitals && (
            <div className="mt-2 text-sm text-green-700 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Ready to import</span>
            </div>
          )}
        </div>

        {/* Lab Results File */}
        <div className="card">
          <h3 className="font-bold mb-2">3. Lab Results Sheet (Optional)</h3>
          <p className="text-sm text-gray-600 mb-3">
            investigating_result: CBC, KFT, blood tests, etc.
          </p>
          <label className="btn-secondary flex items-center justify-center space-x-2 cursor-pointer w-full">
            <Upload className="w-5 h-5" />
            <span>{files.labResults ? files.labResults.name : 'Upload Lab Results CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange('labResults', e)}
              className="hidden"
              disabled={importing}
            />
          </label>
          {files.labResults && (
            <div className="mt-2 text-sm text-green-700 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Ready to import</span>
            </div>
          )}
        </div>

        {/* Visits File */}
        <div className="card">
          <h3 className="font-bold mb-2">4. Visits Sheet (Optional)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Contains: diagnosis, medicines, symptoms, prescriptions
          </p>
          <label className="btn-secondary flex items-center justify-center space-x-2 cursor-pointer w-full">
            <Upload className="w-5 h-5" />
            <span>{files.visits ? files.visits.name : 'Upload Visits CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange('visits', e)}
              className="hidden"
              disabled={importing}
            />
          </label>
          {files.visits && (
            <div className="mt-2 text-sm text-green-700 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Ready to import</span>
            </div>
          )}
        </div>
      </div>

      {/* Import Button */}
      <div className="flex justify-center">
        <button
          onClick={handleImport}
          disabled={importing || !files.patients}
          className="btn-success text-lg px-8 py-4 flex items-center space-x-3"
        >
          {importing ? (
            <>
              <div className="spinner w-6 h-6"></div>
              <span>Importing...</span>
            </>
          ) : (
            <>
              <Database className="w-6 h-6" />
              <span>Start Complete Import</span>
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {results && (
        <div className="card bg-green-50 border-2 border-green-300">
          <h3 className="font-bold text-xl mb-4 text-green-800 flex items-center space-x-2">
            <CheckCircle className="w-6 h-6" />
            <span>Import Complete!</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{results.patients.imported}</div>
              <div className="text-sm text-gray-600">Patients</div>
              {results.patients.skipped > 0 && (
                <div className="text-xs text-yellow-600">{results.patients.skipped} skipped</div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{results.vitals.imported}</div>
              <div className="text-sm text-gray-600">Vitals</div>
            </div>

            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">{results.labResults.imported}</div>
              <div className="text-sm text-gray-600">Lab Reports</div>
            </div>

            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-600">{results.visits.imported}</div>
              <div className="text-sm text-gray-600">Visits</div>
            </div>
          </div>

          {/* Errors */}
          {(results.patients.errors.length > 0 || results.vitals.errors.length > 0 ||
            results.labResults.errors.length > 0 || results.visits.errors.length > 0) && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-red-700">
                View Errors ({
                  results.patients.errors.length +
                  results.vitals.errors.length +
                  results.labResults.errors.length +
                  results.visits.errors.length
                })
              </summary>
              <div className="mt-2 bg-white p-4 rounded text-xs space-y-1 max-h-60 overflow-y-auto">
                {results.patients.errors.map((err, idx) => (
                  <div key={idx} className="text-red-600">• {err}</div>
                ))}
                {results.vitals.errors.map((err, idx) => (
                  <div key={idx} className="text-red-600">• {err}</div>
                ))}
                {results.labResults.errors.map((err, idx) => (
                  <div key={idx} className="text-red-600">• {err}</div>
                ))}
                {results.visits.errors.map((err, idx) => (
                  <div key={idx} className="text-red-600">• {err}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default DocOnImporter;
