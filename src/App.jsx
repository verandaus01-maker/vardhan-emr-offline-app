import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DatabaseService from './services/database';
import syncService from './services/syncService';

// Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import PatientSearch from './pages/PatientSearch';
import PatientDetails from './pages/PatientDetails';
import PrescriptionWriter from './pages/PrescriptionWriter';
import VitalsRecorder from './pages/VitalsRecorder';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DataMigration from './pages/DataMigration';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Vardhan EMR...');

      // Initialize database
      await DatabaseService.getStats();

      // Initialize sync service
      await syncService.initialize();

      // Check if this is first run
      const isFirstRun = await DatabaseService.getSetting('isFirstRun');

      if (isFirstRun === null) {
        // Set up default settings
        await setupDefaultSettings();
        await DatabaseService.setSetting('isFirstRun', 'false');
      }

      // Initialize default doctor if not exists
      const doctors = await DatabaseService.getAllDoctors();
      if (doctors.length === 0) {
        await DatabaseService.addDoctor({
          name: 'Dr. Vivek Raj Singh',
          specialization: 'Cardiology',
          qualification: 'MD (Cardiology)',
          phone: '+91 9876543210',
          email: 'dr.vivek@vardhanhospital.co.in',
          isDefault: true
        });
      }

      // Load common drugs into database
      await loadCommonDrugs();

      setIsInitialized(true);
      console.log('App initialized successfully');

    } catch (error) {
      console.error('Failed to initialize app:', error);
      setInitError(error.message);
    }
  };

  const setupDefaultSettings = async () => {
    const defaultSettings = {
      hospitalName: 'Vardhan Hospital',
      hospitalAddress: 'A-125/D, Lalpur Housing Scheme, Phase-1 Bada Lalpur, Varanasi - 221003',
      hospitalPhone: '+91 542 2367890',
      hospitalEmail: 'info@vardhanhospital.co.in',
      defaultDoctorId: 1,
      prescriptionHeader: 'Vardhan Hospital - Cardiology Department',
      autoSyncEnabled: true,
      syncIntervalMinutes: 5,
      enableOfflineMode: true,
      language: 'en',
      dateFormat: 'DD-MMM-YYYY',
      timeFormat: '12h',
      theme: 'light',
      printCopies: 2
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await DatabaseService.setSetting(key, value);
    }
  };

  const loadCommonDrugs = async () => {
    // Check if drugs already loaded
    const existingDrugs = await DatabaseService.searchDrugs('');
    if (existingDrugs.length > 0) {
      return;
    }

    const commonDrugs = [
      { name: 'Amlodipine', genericName: 'Amlodipine', category: 'Antihypertensive', dosageForm: 'Tablet', commonDosages: ['2.5mg', '5mg', '10mg'] },
      { name: 'Telmisartan', genericName: 'Telmisartan', category: 'Antihypertensive', dosageForm: 'Tablet', commonDosages: ['20mg', '40mg', '80mg'] },
      { name: 'Metformin', genericName: 'Metformin', category: 'Antidiabetic', dosageForm: 'Tablet', commonDosages: ['500mg', '850mg', '1000mg'] },
      { name: 'Atorvastatin', genericName: 'Atorvastatin', category: 'Statin', dosageForm: 'Tablet', commonDosages: ['10mg', '20mg', '40mg'] },
      { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', category: 'Antiplatelet', dosageForm: 'Tablet', commonDosages: ['75mg', '150mg', '325mg'] },
      { name: 'Pantoprazole', genericName: 'Pantoprazole', category: 'PPI', dosageForm: 'Tablet', commonDosages: ['20mg', '40mg'] },
      { name: 'Paracetamol', genericName: 'Paracetamol', category: 'Analgesic', dosageForm: 'Tablet', commonDosages: ['500mg', '650mg', '1000mg'] },
      { name: 'Amoxicillin', genericName: 'Amoxicillin', category: 'Antibiotic', dosageForm: 'Capsule', commonDosages: ['250mg', '500mg'] },
      { name: 'Azithromycin', genericName: 'Azithromycin', category: 'Antibiotic', dosageForm: 'Tablet', commonDosages: ['250mg', '500mg'] },
      { name: 'Clopidogrel', genericName: 'Clopidogrel', category: 'Antiplatelet', dosageForm: 'Tablet', commonDosages: ['75mg'] },
      { name: 'Bisoprolol', genericName: 'Bisoprolol', category: 'Beta Blocker', dosageForm: 'Tablet', commonDosages: ['2.5mg', '5mg', '10mg'] },
      { name: 'Ramipril', genericName: 'Ramipril', category: 'ACE Inhibitor', dosageForm: 'Tablet', commonDosages: ['2.5mg', '5mg', '10mg'] },
      { name: 'Furosemide', genericName: 'Furosemide', category: 'Diuretic', dosageForm: 'Tablet', commonDosages: ['20mg', '40mg'] },
      { name: 'Spironolactone', genericName: 'Spironolactone', category: 'Diuretic', dosageForm: 'Tablet', commonDosages: ['25mg', '50mg'] },
      { name: 'Glimepiride', genericName: 'Glimepiride', category: 'Antidiabetic', dosageForm: 'Tablet', commonDosages: ['1mg', '2mg', '4mg'] },
      { name: 'Insulin Glargine', genericName: 'Insulin Glargine', category: 'Insulin', dosageForm: 'Injection', commonDosages: ['100 IU/ml'] },
      { name: 'Levothyroxine', genericName: 'Levothyroxine', category: 'Thyroid', dosageForm: 'Tablet', commonDosages: ['25mcg', '50mcg', '100mcg'] },
      { name: 'Rosuvastatin', genericName: 'Rosuvastatin', category: 'Statin', dosageForm: 'Tablet', commonDosages: ['5mg', '10mg', '20mg'] },
      { name: 'Losartan', genericName: 'Losartan', category: 'Antihypertensive', dosageForm: 'Tablet', commonDosages: ['25mg', '50mg', '100mg'] },
      { name: 'Vildagliptin', genericName: 'Vildagliptin', category: 'Antidiabetic', dosageForm: 'Tablet', commonDosages: ['50mg'] }
    ];

    for (const drug of commonDrugs) {
      await DatabaseService.addDrug(drug);
    }

    console.log('Loaded common drugs database');
  };

  if (initError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Initialization Error</h1>
          <p className="text-gray-700 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Loading Vardhan EMR...</h2>
          <p className="text-blue-600">Initializing offline database...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<PatientSearch />} />
          <Route path="patients/:patientId" element={<PatientDetails />} />
          <Route path="prescription/:patientId" element={<PrescriptionWriter />} />
          <Route path="vitals/:patientId" element={<VitalsRecorder />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="data-migration" element={<DataMigration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
