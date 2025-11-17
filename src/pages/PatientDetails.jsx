import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, Phone, Mail, MapPin, Droplet, AlertTriangle, FileText,
  Activity, Calendar, Edit, Printer, ArrowLeft, Plus
} from 'lucide-react';
import DatabaseService from '../services/database';
import { format } from 'date-fns';

function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      const patientData = await DatabaseService.getPatient(parseInt(patientId));
      if (!patientData) {
        navigate('/patients');
        return;
      }

      const patientPrescriptions = await DatabaseService.getPrescriptionsByPatient(
        parseInt(patientId),
        10
      );

      const patientVitals = await DatabaseService.getVitalsByPatient(
        parseInt(patientId),
        5
      );

      setPatient(patientData);
      setPrescriptions(patientPrescriptions);
      setVitals(patientVitals);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load patient:', error);
      setLoading(false);
    }
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
      <div className="card text-center py-12">
        <p className="text-gray-600">Patient not found</p>
        <Link to="/patients" className="btn-primary mt-4">
          Back to Patients
        </Link>
      </div>
    );
  }

  const initials = patient.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 fade-in">
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
        <div className="flex items-start justify-between">
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
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  ✓ Verified
                </span>
                {patient.conditions && patient.conditions.length > 0 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                    Chronic Conditions
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="btn-secondary flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button className="btn-secondary flex items-center space-x-2">
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="card bg-blue-50 border-2 border-blue-200">
          <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>Contact Information</span>
          </h3>
          <div className="space-y-3 text-sm">
            {patient.phone && (
              <div>
                <p className="text-gray-600 mb-1">Phone Number</p>
                <p className="font-semibold text-gray-800">{patient.phone}</p>
              </div>
            )}
            {patient.email && (
              <div>
                <p className="text-gray-600 mb-1">Email</p>
                <p className="font-semibold text-gray-800">{patient.email}</p>
              </div>
            )}
            {patient.address && (
              <div>
                <p className="text-gray-600 mb-1">Address</p>
                <p className="font-semibold text-gray-800">{patient.address}</p>
              </div>
            )}
            {patient.aadhaar && (
              <div>
                <p className="text-gray-600 mb-1">Aadhaar</p>
                <p className="font-semibold text-gray-800 font-mono">{patient.aadhaar}</p>
              </div>
            )}
            {patient.registrationDate && (
              <div>
                <p className="text-gray-600 mb-1">Registration Date</p>
                <p className="font-semibold text-gray-800">
                  {format(new Date(patient.registrationDate), 'dd-MMM-yyyy')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Info */}
        <div className="card bg-red-50 border-2 border-red-200">
          <h3 className="font-bold text-lg mb-4 text-red-800 flex items-center space-x-2">
            <Droplet className="w-5 h-5" />
            <span>Medical Information</span>
          </h3>
          <div className="space-y-3 text-sm">
            {patient.bloodGroup && (
              <div>
                <p className="text-gray-600 mb-1">Blood Group</p>
                <p className="font-bold text-red-700 text-lg">{patient.bloodGroup}</p>
              </div>
            )}
            {patient.allergies && (
              <div>
                <p className="text-gray-600 mb-1 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Allergies</span>
                </p>
                <p className="font-bold text-red-600">{patient.allergies}</p>
              </div>
            )}
            {vitals.length > 0 && (
              <div>
                <p className="text-gray-600 mb-1">Latest Vitals</p>
                <div className="space-y-1 text-gray-800">
                  {vitals[0].bloodPressure && (
                    <p>BP: <span className="font-semibold">{vitals[0].bloodPressure}</span></p>
                  )}
                  {vitals[0].weight && (
                    <p>Weight: <span className="font-semibold">{vitals[0].weight} kg</span></p>
                  )}
                  {vitals[0].temperature && (
                    <p>Temp: <span className="font-semibold">{vitals[0].temperature}°F</span></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chronic Conditions */}
        <div className="card bg-yellow-50 border-2 border-yellow-200">
          <h3 className="font-bold text-lg mb-4 text-yellow-800 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Chronic Conditions</span>
          </h3>
          {patient.conditions && patient.conditions.length > 0 ? (
            <div className="space-y-2">
              {patient.conditions.map((condition, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-1.5"></span>
                  <span className="text-sm font-semibold">{condition}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No chronic conditions recorded</p>
          )}
          <button className="mt-4 text-sm text-yellow-700 hover:text-yellow-900 font-semibold flex items-center space-x-1">
            <Plus className="w-4 h-4" />
            <span>Add Condition</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate(`/prescription/${patientId}`)}
          className="btn-primary flex items-center justify-center space-x-3 py-6 text-lg"
        >
          <FileText className="w-6 h-6" />
          <span>Write New Prescription</span>
        </button>
        <button
          onClick={() => navigate(`/vitals/${patientId}`)}
          className="btn-success flex items-center justify-center space-x-3 py-6 text-lg"
        >
          <Activity className="w-6 h-6" />
          <span>Record Vitals</span>
        </button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-6 rounded-lg font-semibold transition shadow-lg flex items-center justify-center space-x-3 text-lg">
          <Calendar className="w-6 h-6" />
          <span>View Full History</span>
        </button>
      </div>

      {/* Previous Prescriptions */}
      <div className="card">
        <h3 className="font-bold text-xl mb-4 text-gray-800">
          Previous Consultations ({prescriptions.length})
        </h3>
        {prescriptions.length > 0 ? (
          <div className="space-y-4">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-gray-800">
                        {format(new Date(prescription.createdAt), 'dd-MMM-yyyy')}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {prescription.department || 'Cardiology'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Dr. Vivek Raj Singh
                      </span>
                    </div>
                    {prescription.diagnosis && (
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Diagnosis: {prescription.diagnosis}
                      </p>
                    )}
                    {prescription.medications && prescription.medications.length > 0 && (
                      <div className="text-xs text-gray-600 space-y-1">
                        {prescription.medications.slice(0, 3).map((med, idx) => (
                          <p key={idx}>
                            💊 {med.drugName} - {med.dosage} - {med.frequency} - {med.duration}
                          </p>
                        ))}
                        {prescription.medications.length > 3 && (
                          <p className="text-blue-600 font-semibold">
                            +{prescription.medications.length - 3} more medications
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold whitespace-nowrap">
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p>No previous consultations</p>
            <button
              onClick={() => navigate(`/prescription/${patientId}`)}
              className="btn-primary mt-4"
            >
              Create First Prescription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDetails;
