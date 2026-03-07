import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Search, User, Phone, X, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DatabaseService, { db } from '../services/database';
import { format, startOfToday, addDays, subDays, parseISO } from 'date-fns';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const dateStart = selectedDate;
      const dateEnd = selectedDate + 'Z';

      const dayAppointments = await db.appointments
        .where('date')
        .between(dateStart, dateEnd)
        .sortBy('time');

      // Enrich with patient details
      const enriched = await Promise.all(
        dayAppointments.map(async (apt) => {
          const patient = await db.patients.get(apt.patientId);
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

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      await DatabaseService.updateAppointmentStatus(aptId, newStatus);
      loadAppointments();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update appointment status');
    }
  };

  const goToPrevDay = () => {
    const prev = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(format(startOfToday(), 'yyyy-MM-dd'));
  };

  const isToday = selectedDate === format(startOfToday(), 'yyyy-MM-dd');

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-purple-600" />
          <span>Appointments</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Date Navigator */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center">
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none text-lg font-semibold"
              />
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition"
                >
                  Today
                </button>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
              {isToday && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  Today
                </span>
              )}
            </p>
          </div>

          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div
                key={apt.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-white"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/patients/${apt.patientId}`)}
                  >
                    <p className="font-bold text-gray-800 text-lg">{apt.patientName}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
                      {apt.time && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{apt.time}</span>
                        </span>
                      )}
                      {apt.type && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold">
                          {apt.type}
                        </span>
                      )}
                      {apt.patientPhone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{apt.patientPhone}</span>
                        </span>
                      )}
                    </div>
                    {apt.notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">"{apt.notes}"</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>

                    {apt.status === 'scheduled' && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'in-progress')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {apt.status === 'in-progress' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No appointments for this day</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Book Appointment
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AppointmentModal
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadAppointments();
          }}
        />
      )}
    </div>
  );
}

// Appointment Creation Modal
function AppointmentModal({ defaultDate, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appointmentData, setAppointmentData] = useState({
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
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
      await db.appointments.add(appointment);
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
                    onClick={() => { setSelectedPatient(patient); setStep(2); }}
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
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating Appointment...' : 'Create Appointment'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
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
