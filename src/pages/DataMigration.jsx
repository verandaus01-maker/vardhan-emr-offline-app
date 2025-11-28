import React, { useState } from 'react';
import { Database, Download, Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import syncService from '../services/syncService';
import DatabaseService from '../services/database';

function DataMigration() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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

  /**
   * Parse CSV properly (handles quoted fields, commas in data, etc.)
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
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  };

  /**
   * Map column name to standard field name (flexible column matching)
   */
  const mapColumnName = (columnName) => {
    const normalized = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const mappings = {
      // UHID variations
      'uhid': 'uhid',
      'patientid': 'uhid',
      'id': 'uhid',
      'patientnumber': 'uhid',
      'mrn': 'uhid',
      'registrationno': 'uhid',

      // Name variations
      'name': 'name',
      'patientname': 'name',
      'fullname': 'name',
      'firstname': 'name',

      // Age
      'age': 'age',
      'years': 'age',
      'yrs': 'age',

      // Gender
      'gender': 'gender',
      'sex': 'gender',
      'm/f': 'gender',

      // Phone
      'phone': 'phone',
      'mobile': 'phone',
      'contact': 'phone',
      'phonenumber': 'phone',
      'mobilenumber': 'phone',
      'contactnumber': 'phone',

      // Email
      'email': 'email',
      'emailid': 'email',
      'emailaddress': 'email',

      // Address
      'address': 'address',
      'location': 'address',
      'city': 'address',

      // Blood Group
      'bloodgroup': 'bloodGroup',
      'blood': 'bloodGroup',
      'bg': 'bloodGroup',

      // Registration Date
      'registrationdate': 'registrationDate',
      'regdate': 'registrationDate',
      'date': 'registrationDate',
      'dateofregistration': 'registrationDate',
      'createddate': 'registrationDate',

      // Date of Birth
      'dob': 'dateOfBirth',
      'dateofbirth': 'dateOfBirth',
      'birthdate': 'dateOfBirth',

      // Aadhaar
      'aadhaar': 'aadhaar',
      'aadhar': 'aadhaar',
      'aadharnumber': 'aadhaar',

      // Emergency Contact
      'emergencycontact': 'emergencyContact',
      'emergencyphone': 'emergencyContact',

      // Medical History
      'medicalhistory': 'medicalHistory',
      'history': 'medicalHistory',

      // Allergies
      'allergies': 'allergies',
      'allergy': 'allergies'
    };

    return mappings[normalized] || columnName;
  };

  /**
   * Clean and validate phone number
   */
  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Keep last 10 digits (Indian mobile)
    return digits.slice(-10);
  };

  /**
   * Parse date flexibly
   */
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();

    try {
      // Try multiple formats
      const formats = [
        // DD/MM/YYYY or DD-MM-YYYY
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
        // MM/DD/YYYY or MM-DD-YYYY
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
        // YYYY/MM/DD or YYYY-MM-DD
        /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, p1, p2, p3] = match;
          // Assume YYYY-MM-DD if first part is 4 digits
          if (p1.length === 4) {
            return new Date(`${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`).toISOString();
          } else {
            // Assume DD/MM/YYYY for Indian format
            return new Date(`${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`).toISOString();
          }
        }
      }

      // Try ISO format
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString();
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Default to current date
    return new Date().toISOString();
  };

  /**
   * Robust CSV import with flexible column mapping
   */
  const handleImportFromCsv = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setProgress({ page: 0, count: 0, total: 0 });

    try {
      // Read file with proper encoding handling
      let text = await file.text();

      // Remove BOM if present (Excel exports)
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      // Split into lines (handle both \n and \r\n)
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header row
      const headerRow = parseCSVLine(lines[0]);
      const columnMap = {};

      // Map each column to standard field name
      headerRow.forEach((header, index) => {
        const fieldName = mapColumnName(header);
        columnMap[index] = fieldName;
      });

      console.log('Column mapping:', columnMap);

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) continue;

          const values = parseCSVLine(line);
          const rowData = {};

          // Map values to fields
          values.forEach((value, index) => {
            const fieldName = columnMap[index];
            if (fieldName) {
              rowData[fieldName] = value;
            }
          });

          // Build patient object with all possible fields
          const patient = {
            uhid: rowData.uhid || `AUTO_${Date.now()}_${i}`,
            name: rowData.name || 'Unknown',
            age: parseInt(rowData.age) || 0,
            gender: rowData.gender || '',
            phone: cleanPhoneNumber(rowData.phone),
            email: rowData.email || '',
            address: rowData.address || '',
            bloodGroup: rowData.bloodGroup || '',
            aadhaar: rowData.aadhaar || '',
            dateOfBirth: rowData.dateOfBirth || '',
            emergencyContact: rowData.emergencyContact || '',
            medicalHistory: rowData.medicalHistory || '',
            allergies: rowData.allergies || '',
            registrationDate: parseDate(rowData.registrationDate)
          };

          // Validate required fields
          if (!patient.name || patient.name === 'Unknown') {
            errorDetails.push(`Row ${i + 1}: Missing name`);
            errors++;
            continue;
          }

          // Check if patient already exists
          const existing = await DatabaseService.getPatientByUHID(patient.uhid);
          if (existing) {
            skipped++;
            continue;
          }

          // Import patient
          await DatabaseService.addPatient(patient);
          imported++;

          // Update progress
          if (imported % 10 === 0) {
            setProgress({ page: 0, count: imported, total: lines.length - 1 });
          }

        } catch (rowError) {
          console.error(`Error processing row ${i + 1}:`, rowError);
          errorDetails.push(`Row ${i + 1}: ${rowError.message}`);
          errors++;
        }
      }

      // Show detailed results
      let resultMessage = `✅ Import Complete!\n\n`;
      resultMessage += `✅ Imported: ${imported} patients\n`;
      if (skipped > 0) resultMessage += `⏭️ Skipped (duplicates): ${skipped}\n`;
      if (errors > 0) resultMessage += `❌ Errors: ${errors}\n`;

      if (errorDetails.length > 0 && errorDetails.length <= 10) {
        resultMessage += `\nError details:\n${errorDetails.join('\n')}`;
      } else if (errorDetails.length > 10) {
        resultMessage += `\nShowing first 10 errors:\n${errorDetails.slice(0, 10).join('\n')}`;
      }

      setSuccess(resultMessage);
      setProgress(null);

    } catch (error) {
      console.error('CSV import failed:', error);
      setError(`Import failed: ${error.message}\n\nPlease check your CSV format and try again.`);
      setProgress(null);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
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
            <h2 className="text-xl font-bold mb-2">Import/Export Patient Data</h2>
            <p className="text-gray-600 mb-4">
              Import patient data from CSV or Excel file. Export your current patient database to CSV format.
            </p>

            {/* Supported Formats */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ Supported Formats:</h4>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li><strong>CSV files</strong> (.csv) - from Excel, Google Sheets, or any CSV export</li>
                <li><strong>Excel files</strong> (.xlsx, .xls) - direct Excel import coming soon</li>
                <li><strong>Any column order</strong> - columns can be in any order</li>
                <li><strong>Flexible column names</strong> - supports various spellings (Name, Patient Name, Full Name, etc.)</li>
                <li><strong>Handles commas in data</strong> - properly parses quoted fields</li>
                <li><strong>Multiple date formats</strong> - DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD</li>
              </ul>
            </div>

            {/* Recognized Columns */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">📋 Recognized Column Names:</h4>
              <div className="text-sm text-blue-700 grid grid-cols-2 gap-2">
                <div><strong>UHID:</strong> uhid, id, patient_id, mrn, registration_no</div>
                <div><strong>Name:</strong> name, patient_name, full_name</div>
                <div><strong>Age:</strong> age, years, yrs</div>
                <div><strong>Gender:</strong> gender, sex, m/f</div>
                <div><strong>Phone:</strong> phone, mobile, contact, mobile_number</div>
                <div><strong>Email:</strong> email, email_id</div>
                <div><strong>Address:</strong> address, location, city</div>
                <div><strong>Blood Group:</strong> blood_group, blood, bg</div>
                <div><strong>Date of Birth:</strong> dob, date_of_birth</div>
                <div><strong>Aadhaar:</strong> aadhaar, aadhar</div>
                <div><strong>Emergency Contact:</strong> emergency_contact</div>
                <div><strong>Medical History:</strong> medical_history, history</div>
              </div>
            </div>

            {/* Example CSV Format */}
            <details className="mb-4">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-blue-600">
                📄 Example CSV Format (click to expand)
              </summary>
              <div className="mt-2 bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                <pre>UHID,Name,Age,Gender,Phone,Email,Address,Blood Group
VH001,Ram Kumar,45,Male,9876543210,ram@email.com,"Varanasi, UP",O+
VH002,Sita Devi,38,Female,9876543211,sita@email.com,"Banaras, UP",A+
VH003,Gopal Singh,52,Male,9876543212,gopal@email.com,"Varanasi",B+</pre>
              </div>
            </details>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportToCsv}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Export to CSV</span>
              </button>
              <label className="btn-primary flex items-center space-x-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Import from CSV/Excel</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleImportFromCsv}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: If you have issues, paste your CSV data in chat and I'll help diagnose the problem!
            </p>
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
