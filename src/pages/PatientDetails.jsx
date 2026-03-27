import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, Phone, Mail, MapPin, Droplet, AlertTriangle, FileText,
  Activity, Calendar, Edit, Printer, ArrowLeft, Plus, TrendingUp,
  FlaskConical, Pill, Stethoscope, Heart, Clock, ChevronDown, ChevronUp, X
} from 'lucide-react';
import DatabaseService from '../services/database';
import authService from '../services/authService';
import { format } from 'date-fns';

function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, vitals, labs, prescriptions
  const [expandedPrescription, setExpandedPrescription] = useState(null);
  const [printingPrescription, setPrintingPrescription] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      console.log('=== PATIENT DETAILS DEBUG ===');
      console.log('Loading patient data for ID:', patientId);
      console.log('Type of patientId:', typeof patientId);

      // Try to get patient by numeric ID first
      let patientData = null;
      const numericId = parseInt(patientId);

      if (!isNaN(numericId)) {
        console.log('Attempting to find patient by numeric ID:', numericId);
        patientData = await DatabaseService.db.patients.get(numericId);
        console.log('Patient lookup by ID result:', patientData);
      }

      // If not found by ID, try by UHID
      if (!patientData) {
        console.log('Attempting to find patient by UHID:', patientId);
        patientData = await DatabaseService.db.patients.where('uhid').equals(patientId).first();
        console.log('Patient lookup by UHID result:', patientData);
      }

      // Last resort: try case-insensitive UHID search
      if (!patientData) {
        console.log('Attempting case-insensitive UHID search:', patientId);
        patientData = await DatabaseService.db.patients.where('uhid').equalsIgnoreCase(patientId).first();
        console.log('Patient lookup by case-insensitive UHID result:', patientData);
      }

      // Debug: Let's see what patients exist
      if (!patientData) {
        const allPatients = await DatabaseService.db.patients.limit(5).toArray();
        console.log('Sample patients in database:', allPatients.map(p => ({ id: p.id, uhid: p.uhid, name: p.name })));
        console.error('❌ Patient not found for ID/UHID:', patientId);
        setLoading(false);
        setPatient(null);
        return;
      }

      console.log('✅ Patient found:', patientData.name, 'ID:', patientData.id);

      // Load all related data using the patient's database ID
      const [patientPrescriptions, patientVitals, patientLabReports] = await Promise.all([
        DatabaseService.db.prescriptions
          .where('patientId')
          .equals(patientData.id)
          .reverse()
          .sortBy('createdAt'),
        DatabaseService.db.vitals
          .where('patientId')
          .equals(patientData.id)
          .reverse()
          .sortBy('createdAt'),
        DatabaseService.db.labReports
          .where('patientId')
          .equals(patientData.id)
          .reverse()
          .sortBy('createdAt')
      ]);

      console.log('Data loaded:', {
        prescriptions: patientPrescriptions.length,
        vitals: patientVitals.length,
        labReports: patientLabReports.length
      });

      setPatient(patientData);
      setPrescriptions(patientPrescriptions);
      setVitals(patientVitals);
      setLabReports(patientLabReports);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load patient data:', error);
      setPatient(null);
      setLoading(false);
    }
  };

  const parseMedications = (medicationsData) => {
    if (!medicationsData) return [];

    try {
      // If it's already an array
      if (Array.isArray(medicationsData)) return medicationsData;

      // If it's a JSON string
      if (typeof medicationsData === 'string') {
        const parsed = JSON.parse(medicationsData);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing medications:', e);
    }

    return [];
  };

  const parseLabResults = (resultsData) => {
    if (!resultsData) return [];

    try {
      if (Array.isArray(resultsData)) return resultsData;
      if (typeof resultsData === 'string') {
        const parsed = JSON.parse(resultsData);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing lab results:', e);
    }

    return [];
  };

  // When printingPrescription is set, add class → wait for render → print → cleanup
  useEffect(() => {
    if (!printingPrescription) return;
    document.body.classList.add('rx-print-mode');
    // Give React one full render cycle (requestAnimationFrame) then print
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        document.body.classList.remove('rx-print-mode');
        setPrintingPrescription(null);
      }, 150); // small delay for browser to paint
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('rx-print-mode');
    };
  }, [printingPrescription]);

  const handlePrintPrescription = (prescription) => {
    setPrintingPrescription(prescription);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6 fade-in">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Patients</span>
        </button>

        <div className="card text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-4">
            Unable to find patient with ID: <code className="bg-gray-100 px-2 py-1 rounded">{patientId}</code>
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg text-left max-w-2xl mx-auto mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Steps:</h3>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Open browser console (F12) to see detailed debug information</li>
              <li>Check if you have imported patient data using Doc On Importer</li>
              <li>Try searching for the patient from the Patients page</li>
              <li>Verify that the patient exists in the database</li>
            </ol>
          </div>
          <Link to="/patients" className="btn-primary inline-flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Patient Search</span>
          </Link>
        </div>
      </div>
    );
  }

  const initials = patient.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const latestVitals = vitals[0];

  return (
    <div className="space-y-6 fade-in max-w-7xl">
      {/* Back Button */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Patients</span>
      </button>

      {/* Patient Header */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-3">
                <span className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{patient.age} years • {patient.gender}</span>
                </span>
                <span>•</span>
                <span className="font-mono text-blue-600 font-semibold">
                  UHID: {patient.uhid}
                </span>
                {patient.bloodGroup && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Droplet className="w-4 h-4 text-red-600" />
                      <span className="font-bold text-red-600">{patient.bloodGroup}</span>
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.phone && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{patient.phone}</span>
                  </span>
                )}
                {patient.email && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center space-x-1">
                    <Mail className="w-3 h-3" />
                    <span>{patient.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats — all clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-transform"
          onClick={() => setActiveTab('prescriptions')}
          title="View Prescriptions"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Visits</p>
              <p className="text-3xl font-bold">{prescriptions.length}</p>
              <p className="text-xs text-blue-200 mt-1">Click to view →</p>
            </div>
            <Calendar className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div
          className="card bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-transform"
          onClick={() => setActiveTab('vitals')}
          title="View Vitals"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Vitals Recorded</p>
              <p className="text-3xl font-bold">{vitals.length}</p>
              <p className="text-xs text-green-200 mt-1">Click to view →</p>
            </div>
            <Activity className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div
          className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer hover:shadow-xl hover:scale-105 transition-transform"
          onClick={() => setActiveTab('labs')}
          title="View Lab Reports"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Lab Reports</p>
              <p className="text-3xl font-bold">{labReports.length}</p>
              <p className="text-xs text-purple-200 mt-1">Click to view →</p>
            </div>
            <FlaskConical className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Last Visit</p>
              <p className="text-lg font-bold">
                {prescriptions.length > 0
                  ? format(new Date(prescriptions[0].createdAt), 'dd MMM yyyy')
                  : 'No visits'}
              </p>
            </div>
            <Clock className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Quick Action Buttons — all authenticated users */}
      {authService.isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/prescription/${patientId}`)}
            className="btn-primary flex items-center justify-center space-x-3 py-6 text-lg"
          >
            <FileText className="w-6 h-6" />
            <span>{authService.canWrite() ? 'New Prescription' : 'Start Patient Form'}</span>
          </button>
          <button
            onClick={() => navigate(`/vitals/${patientId}`)}
            className="btn-success flex items-center justify-center space-x-3 py-6 text-lg"
          >
            <Activity className="w-6 h-6" />
            <span>Record Vitals</span>
          </button>
          <button
            onClick={() => navigate(`/lab-reports`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 rounded-lg font-semibold transition shadow-lg flex items-center justify-center space-x-3 text-lg"
          >
            <FlaskConical className="w-6 h-6" />
            <span>Add Lab Report</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'overview'
              ? 'border-b-4 border-blue-600 text-blue-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-6 py-3 font-semibold transition flex items-center space-x-2 ${
            activeTab === 'prescriptions'
              ? 'border-b-4 border-blue-600 text-blue-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Prescriptions ({prescriptions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`px-6 py-3 font-semibold transition flex items-center space-x-2 ${
            activeTab === 'vitals'
              ? 'border-b-4 border-blue-600 text-blue-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Vitals ({vitals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-6 py-3 font-semibold transition flex items-center space-x-2 ${
            activeTab === 'labs'
              ? 'border-b-4 border-blue-600 text-blue-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Lab Reports ({labReports.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Vitals */}
            <div className="card">
              <h3 className="font-bold text-xl mb-4 text-gray-800 flex items-center space-x-2">
                <Activity className="w-6 h-6 text-green-600" />
                <span>Latest Vitals</span>
              </h3>
              {latestVitals ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-500 mb-4">
                    Recorded on {format(new Date(latestVitals.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(latestVitals.systolic || latestVitals.diastolic) && (
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Blood Pressure</p>
                        <p className="text-2xl font-bold text-red-600">
                          {latestVitals.systolic || '--'}/{latestVitals.diastolic || '--'}
                        </p>
                        <p className="text-xs text-gray-500">mmHg</p>
                      </div>
                    )}
                    {latestVitals.pulse && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Pulse</p>
                        <p className="text-2xl font-bold text-blue-600">{latestVitals.pulse}</p>
                        <p className="text-xs text-gray-500">/min</p>
                      </div>
                    )}
                    {latestVitals.temperature && (
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Temperature</p>
                        <p className="text-2xl font-bold text-orange-600">{latestVitals.temperature}</p>
                        <p className="text-xs text-gray-500">°F</p>
                      </div>
                    )}
                    {latestVitals.spo2 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">SpO2</p>
                        <p className="text-2xl font-bold text-green-600">{latestVitals.spo2}</p>
                        <p className="text-xs text-gray-500">%</p>
                      </div>
                    )}
                    {latestVitals.weight && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Weight</p>
                        <p className="text-2xl font-bold text-purple-600">{latestVitals.weight}</p>
                        <p className="text-xs text-gray-500">kg</p>
                      </div>
                    )}
                    {latestVitals.height && (
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Height</p>
                        <p className="text-2xl font-bold text-indigo-600">{latestVitals.height}</p>
                        <p className="text-xs text-gray-500">cm</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No vitals recorded yet</p>
              )}
            </div>

            {/* Recent Prescription */}
            {prescriptions.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-xl mb-4 text-gray-800 flex items-center space-x-2">
                  <Pill className="w-6 h-6 text-blue-600" />
                  <span>Latest Prescription</span>
                </h3>
                {(() => {
                  const latest = prescriptions[0];
                  const meds = parseMedications(latest.medications);
                  return (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500 mb-2">
                        {format(new Date(latest.createdAt), 'dd MMM yyyy')}
                      </div>
                      {latest.diagnosis && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-800 mb-1">Diagnosis:</p>
                          <p className="text-gray-800">{latest.diagnosis}</p>
                        </div>
                      )}
                      {latest.symptoms && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm font-semibold text-orange-800 mb-1">Symptoms:</p>
                          <p className="text-gray-800">{latest.symptoms}</p>
                        </div>
                      )}
                      {meds.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Medicines:</p>
                          <div className="space-y-2">
                            {meds.slice(0, 4).map((med, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-sm">
                                <span className="text-blue-600">💊</span>
                                <span className="text-gray-800">
                                  {typeof med === 'string' ? med : med.drugName || 'Unknown medicine'}
                                </span>
                              </div>
                            ))}
                            {meds.length > 4 && (
                              <p className="text-xs text-gray-500">... and {meds.length - 4} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            {prescriptions.length > 0 ? (
              prescriptions.map((prescription) => {
                const meds = parseMedications(prescription.medications);
                const isExpanded = expandedPrescription === prescription.id;

                const isDraft = prescription.status === 'staff_draft';
                const isDoctor = authService.canWrite();

                return (
                  <div key={prescription.id} className={`card hover:shadow-lg transition ${isDraft ? 'border-2 border-orange-300' : ''}`}>
                    <div
                      className="cursor-pointer"
                      onClick={() => setExpandedPrescription(isExpanded ? null : prescription.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDraft ? 'bg-orange-100' : 'bg-blue-100'}`}>
                            <Stethoscope className={`w-6 h-6 ${isDraft ? 'text-orange-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg text-gray-800">
                                {format(new Date(prescription.createdAt), 'dd MMM yyyy, hh:mm a')}
                              </p>
                              {isDraft && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-300">
                                  Pending Doctor
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{isDraft ? 'Filled by Staff — Awaiting Dr. Vivek' : 'Dr. Vivek Raj Singh'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isDraft && isDoctor && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/prescription/${patientId}/${prescription.id}`); }}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
                              title="Open and complete this prescription"
                            >
                              Complete Prescription
                            </button>
                          )}
                          {isDraft && !isDoctor && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/prescription/${patientId}/${prescription.id}`); }}
                              className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-semibold rounded-lg transition"
                              title="Edit this draft"
                            >
                              Edit Draft
                            </button>
                          )}
                          {!isDraft && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrintPrescription(prescription); }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Print this prescription"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-6 h-6 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {prescription.diagnosis && (
                        <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <p className="text-sm font-semibold text-yellow-800 mb-1">Diagnosis:</p>
                          <p className="text-gray-800">{prescription.diagnosis}</p>
                        </div>
                      )}

                      {prescription.symptoms && (
                        <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                          <p className="text-sm font-semibold text-orange-800 mb-1">Symptoms:</p>
                          <p className="text-gray-800">{prescription.symptoms}</p>
                        </div>
                      )}

                      {isExpanded && meds.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <p className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                            <Pill className="w-5 h-5" />
                            <span>Prescribed Medicines ({meds.length})</span>
                          </p>
                          <div className="space-y-3">
                            {meds.map((med, idx) => (
                              <div key={idx} className="p-3 bg-white rounded border border-blue-200">
                                <p className="font-semibold text-gray-800">
                                  {typeof med === 'string' ? med : med.drugName || 'Unknown medicine'}
                                </p>
                                {typeof med === 'object' && (
                                  <div className="mt-1 text-sm text-gray-600 space-y-1">
                                    {med.dosage && <p>Dosage: {med.dosage}</p>}
                                    {med.frequency && <p>Frequency: {med.frequency}</p>}
                                    {med.duration && <p>Duration: {med.duration}</p>}
                                    {med.instructions && <p>Instructions: {med.instructions}</p>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isExpanded && meds.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            💊 {meds.length} medicine{meds.length > 1 ? 's' : ''} prescribed
                          </p>
                        </div>
                      )}

                      {prescription.advice && isExpanded && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-semibold text-green-800 mb-1">Advice:</p>
                          <p className="text-gray-800">{prescription.advice}</p>
                        </div>
                      )}

                      {prescription.followUpDays > 0 && (
                        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Follow-up in {prescription.followUpDays} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card text-center py-12">
                <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No prescriptions recorded</p>
                <button
                  onClick={() => navigate(`/prescription/${patientId}`)}
                  className="btn-primary mt-4"
                >
                  Write First Prescription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Vitals Tab */}
        {activeTab === 'vitals' && (
          <div className="space-y-4">
            {vitals.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {vitals.map((vital) => (
                  <div key={vital.id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Activity className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            {format(new Date(vital.createdAt), 'dd MMM yyyy, hh:mm a')}
                          </p>
                          <p className="text-sm text-gray-500">{vital.recordedBy || 'Staff'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(vital.systolic || vital.diastolic) && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">BP</p>
                          <p className="text-xl font-bold text-red-600">
                            {vital.systolic || '--'}/{vital.diastolic || '--'}
                          </p>
                          <p className="text-xs text-gray-500">mmHg</p>
                        </div>
                      )}
                      {vital.pulse && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Pulse</p>
                          <p className="text-xl font-bold text-blue-600">{vital.pulse}</p>
                          <p className="text-xs text-gray-500">/min</p>
                        </div>
                      )}
                      {vital.temperature && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Temperature</p>
                          <p className="text-xl font-bold text-orange-600">{vital.temperature}</p>
                          <p className="text-xs text-gray-500">°F</p>
                        </div>
                      )}
                      {vital.spo2 && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">SpO2</p>
                          <p className="text-xl font-bold text-green-600">{vital.spo2}</p>
                          <p className="text-xs text-gray-500">%</p>
                        </div>
                      )}
                      {vital.weight && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Weight</p>
                          <p className="text-xl font-bold text-purple-600">{vital.weight}</p>
                          <p className="text-xs text-gray-500">kg</p>
                        </div>
                      )}
                      {vital.height && (
                        <div className="p-3 bg-indigo-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Height</p>
                          <p className="text-xl font-bold text-indigo-600">{vital.height}</p>
                          <p className="text-xs text-gray-500">cm</p>
                        </div>
                      )}
                      {vital.bmi && (
                        <div className="p-3 bg-pink-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">BMI</p>
                          <p className="text-xl font-bold text-pink-600">{vital.bmi}</p>
                          <p className="text-xs text-gray-500">kg/m²</p>
                        </div>
                      )}
                      {vital.fundalHeight && (
                        <div className="p-3 bg-teal-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Fundal Height</p>
                          <p className="text-xl font-bold text-teal-600">{vital.fundalHeight}</p>
                          <p className="text-xs text-gray-500">cm</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No vitals recorded</p>
                <button
                  onClick={() => navigate(`/vitals/${patientId}`)}
                  className="btn-success mt-4"
                >
                  Record First Vitals
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lab Reports Tab */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            {labReports.length > 0 ? (
              labReports.map((report) => {
                const tests = parseLabResults(report.results);
                return (
                  <div key={report.id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <FlaskConical className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            {format(new Date(report.createdAt), 'dd MMM yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">{report.testType || 'Lab Tests'}</p>
                        </div>
                      </div>
                    </div>
                    {tests.length > 0 && (
                      <div className="space-y-2">
                        {tests.map((test, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">{test.testName}</p>
                              {test.range && (
                                <p className="text-xs text-gray-500">Normal: {test.range}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-800">
                                {test.value} {test.unit}
                              </p>
                              {test.status && (
                                <p className="text-xs text-gray-500">{test.status}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="card text-center py-12">
                <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No lab reports</p>
                <button
                  onClick={() => navigate(`/lab-reports`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold mt-4"
                >
                  Add First Lab Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Prescription Overlay — only shown during print */}
      {printingPrescription && (() => {
        const rx = printingPrescription;
        const meds = parseMedications(rx.medications);
        return (
          <div className="print-only fixed inset-0 bg-white z-[9999] p-8" ref={printRef}>
            {/* Hospital Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
              <h1 className="text-3xl font-bold text-blue-800">Vardhan Hospital</h1>
              <p className="text-gray-600">A-125/D, Lalpur Housing Scheme, Varanasi - 221003</p>
              <p className="text-gray-600">Ph: +91 542 2367890</p>
            </div>
            {/* Doctor */}
            <div className="flex justify-between mb-4">
              <div>
                <p className="font-bold text-lg">Dr. Vivek Raj Singh</p>
                <p className="text-gray-600 text-sm">MD (Cardiology)</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">Date: {format(new Date(rx.createdAt), 'dd/MM/yyyy')}</p>
                <p className="text-gray-600 text-sm">Rx No: #{rx.id}</p>
              </div>
            </div>
            {/* Patient */}
            <div className="border border-gray-300 rounded p-3 mb-4 bg-gray-50">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="font-semibold">Patient:</span> {patient.name}</div>
                <div><span className="font-semibold">Age/Sex:</span> {patient.age}Y / {patient.gender?.[0]}</div>
                <div><span className="font-semibold">UHID:</span> {patient.uhid}</div>
                {patient.phone && <div><span className="font-semibold">Phone:</span> {patient.phone}</div>}
                {patient.bloodGroup && <div><span className="font-semibold">Blood:</span> {patient.bloodGroup}</div>}
              </div>
            </div>
            {/* Diagnosis */}
            {rx.diagnosis && (
              <div className="mb-4">
                <p className="font-bold text-gray-800 mb-1">Diagnosis:</p>
                <p className="text-gray-800 bg-yellow-50 p-2 rounded">{rx.diagnosis}</p>
              </div>
            )}
            {/* Complaints */}
            {rx.complaints && (
              <div className="mb-4">
                <p className="font-bold text-gray-800 mb-1">Complaints:</p>
                <p className="text-gray-700">{rx.complaints}</p>
              </div>
            )}
            {/* Medications */}
            {meds.length > 0 && (
              <div className="mb-4">
                <p className="font-bold text-gray-800 mb-2 text-lg">℞ Medications:</p>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left py-1 pr-4">#</th>
                      <th className="text-left py-1 pr-4">Medicine</th>
                      <th className="text-left py-1 pr-4">Dosage</th>
                      <th className="text-left py-1 pr-4">Frequency</th>
                      <th className="text-left py-1">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map((med, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-1 pr-4">{idx + 1}.</td>
                        <td className="py-1 pr-4 font-semibold">{typeof med === 'string' ? med : (med.drugName || '-')}</td>
                        <td className="py-1 pr-4">{typeof med === 'object' ? (med.dosage || '-') : '-'}</td>
                        <td className="py-1 pr-4">{typeof med === 'object' ? (med.frequency || '-') : '-'}</td>
                        <td className="py-1">{typeof med === 'object' ? (med.duration || '-') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Advice / Notes */}
            {(rx.advice || rx.notes) && (
              <div className="mb-4 p-3 bg-green-50 rounded">
                <p className="font-bold text-gray-800 mb-1">Advice:</p>
                <p className="text-gray-700">{rx.advice || rx.notes}</p>
              </div>
            )}
            {/* Follow-up */}
            {rx.nextVisit && (
              <p className="text-gray-600 mt-2">Next Visit: {rx.nextVisit}</p>
            )}
            {/* Signature */}
            <div className="mt-8 border-t pt-4 flex justify-end">
              <div className="text-center">
                <p className="font-bold">Dr. Vivek Raj Singh</p>
                <p className="text-xs text-gray-500">Signature & Stamp</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default PatientDetails;
