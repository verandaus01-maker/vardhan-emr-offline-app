import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Search, User, Phone, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DatabaseService from '../services/database';
import { format, startOfToday, addDays } from 'date-fns';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const today = format(startOfToday(), 'yyyy-MM-dd');
      const todayAppointments = await DatabaseService.db.appointments
        .where('date')
        .between(today, today + 'Z')
        .sortBy('createdAt');

      // Enrich with patient details
      const enriched = await Promise.all(
        todayAppointments.map(async (apt) => {
          const patient = await DatabaseService.db.patients.get(apt.patientId);
          return {
            ...apt,
            patientName: patient?.name || 'Unknown',
            patientPhone: patient?.phone || ''
          };
        })
      );

      setAppointments(enriched);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      setLoading(false);
    }
  };

  const handleNewAppointment = () => {
    setShowModal(true);
  };

  const handleAppointmentCreated = () => {
    setShowModal(false);
    loadAppointments();
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-purple-600" />
          <span>Appointments</span>
        </h1>
        <button
          onClick={handleNewAppointment}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div
                key={apt.id}
                className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-lg cursor-pointer hover:shadow-md transition"
                onClick={() => navigate(`/patients/${apt.patientId}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{apt.patientName}</p>
                    <p className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.time}</span>
                      {apt.patientPhone && (
                        <>
                          <span>•</span>
                          <Phone className="w-4 h-4" />
                          <span>{apt.patientPhone}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-semibold
                    ${apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}
                  `}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p>No appointments for today</p>
            <button
              onClick={handleNewAppointment}
              className="btn-primary mt-4"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create First Appointment
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAppointmentCreated}
        />
      )}
    </div>
  );
}

// Appointment Creation Modal
function AppointmentModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Search Patient, 2: Appointment Details
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appointmentData, setAppointmentData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    type: 'Consultation',
    notes: ''
  });

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearching(true);
    try {
      const results = await DatabaseService.searchPatients(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setSearching(false);
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const appointment = {
        patientId: selectedPatient.id,
        uhid: selectedPatient.uhid,
        date: appointmentData.date,
        time: appointmentData.time,
        type: appointmentData.type,
        status: 'scheduled',
        notes: appointmentData.notes,
        doctorId: 1,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      await DatabaseService.db.appointments.add(appointment);
      onSuccess();
    } catch (error) {
      console.error('Failed to create appointment:', error);
      alert('Failed to create appointment: ' + error.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 1 ? 'Select Patient' : 'Appointment Details'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name, UHID, or Phone..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              {searching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="spinner w-5 h-5"></div>
                </div>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map(patient => (
                  <div
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{patient.name}</p>
                        <p className="text-sm text-gray-600">
                          UHID: {patient.uhid} • {patient.age}Y / {patient.gender?.[0]}
                          {patient.phone && ` • ${patient.phone}`}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 && !searching ? (
              <div className="text-center py-12 text-gray-500">
                <User className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p>No patients found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Search className="w-16 h-16 mx-auto mb-3" />
                <p>Search for a patient to book appointment</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedPatient && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Patient</p>
              <p className="font-bold text-gray-800">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">
                UHID: {selectedPatient.uhid} • {selectedPatient.age}Y / {selectedPatient.gender}
              </p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold mt-2"
              >
                Change Patient
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Time *</label>
                <input
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Appointment Type *</label>
              <select
                value={appointmentData.type}
                onChange={(e) => setAppointmentData({ ...appointmentData, type: e.target.value })}
                className="input"
                required
              >
                <option>Consultation</option>
                <option>Follow-up</option>
                <option>Emergency</option>
                <option>Procedure</option>
                <option>Lab Tests</option>
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                className="input"
                rows="3"
                placeholder="Additional notes or reason for visit..."
              />
            </div>

            <div className="flex items-center space-x-4 pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Creating Appointment...' : 'Create Appointment'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Appointments;
