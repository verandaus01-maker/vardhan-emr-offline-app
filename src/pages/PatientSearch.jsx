import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Phone, Calendar, AlertTriangle } from 'lucide-react';
import DatabaseService from '../services/database';
import { getServerUrl } from '../utils/serverUrl';
import { format } from 'date-fns';

function PatientSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadRecentPatients();
  }, []);

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

  const loadRecentPatients = async () => {
    const patients = await DatabaseService.getAllPatients(10);
    setRecentPatients(patients);
    // Background: pull recent patients from server to sync across profiles
    try {
      const res = await fetch(`${getServerUrl()}/api/patients?limit=200`);
      if (res.ok) {
        const data = await res.json();
        const serverPatients = data.patients || [];
        let merged = false;
        for (const sp of serverPatients) {
          if (!sp.uhid) continue;
          const exists = await DatabaseService.db.patients.where('uhid').equals(sp.uhid).first();
          if (!exists) {
            const toAdd = { ...sp };
            delete toAdd.id;
            toAdd.syncStatus = 'synced';
            await DatabaseService.db.patients.add(toAdd);
            merged = true;
          }
        }
        if (merged) {
          const refreshed = await DatabaseService.getAllPatients(10);
          setRecentPatients(refreshed);
        }
      }
    } catch (_) {}
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      // First pull matching patients from server (may not exist locally yet)
      try {
        const res = await fetch(`${getServerUrl()}/api/patients?search=${encodeURIComponent(searchQuery)}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          for (const sp of (data.patients || [])) {
            if (!sp.uhid) continue;
            const exists = await DatabaseService.db.patients.where('uhid').equals(sp.uhid).first();
            if (!exists) {
              const toAdd = { ...sp };
              delete toAdd.id;
              toAdd.syncStatus = 'synced';
              await DatabaseService.db.patients.add(toAdd);
            }
          }
        }
      } catch (_) {}
      const results = await DatabaseService.searchPatients(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setSearching(false);
  };

  const PatientCard = ({ patient }) => {
    const initials = patient.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const handleClick = () => {
      // Navigate by UHID so the same patient is found across all browser profiles
      const dest = patient.uhid || patient.id;
      navigate(`/patients/${dest}`);
    };

    return (
      <div
        onClick={handleClick}
        className="card hover:shadow-2xl hover:border-2 hover:border-blue-500 cursor-pointer transition-all"
      >
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-800 truncate">{patient.name}</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
              <span className="font-mono font-semibold text-blue-600">
                UHID: {patient.uhid}
              </span>
              <span>•</span>
              <span>{patient.age}Y / {patient.gender?.[0] || 'U'}</span>
              {patient.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{patient.phone}</span>
                  </span>
                </>
              )}
            </div>
            {patient.conditions && patient.conditions.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 font-semibold">
                  {patient.conditions[0]}
                  {patient.conditions.length > 1 && ` +${patient.conditions.length - 1} more`}
                </span>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-blue-600 font-bold text-2xl">→</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <span>Patient Database</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Search and manage patient records
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add New Patient</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by Name, UHID, Phone, Aadhaar, or Email..."
            className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition"
            autoFocus
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="spinner w-6 h-6"></div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map(patient => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          ) : !searching && (
            <div className="card text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No patients found matching "{searchQuery}"</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary mt-4"
              >
                <UserPlus className="w-5 h-5 inline mr-2" />
                Add as New Patient
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Patients */}
      {!searchQuery && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Recent Patients
          </h2>
          {recentPatients.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {recentPatients.map(patient => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No patients in database</p>
              <p className="text-gray-500 text-sm mt-2">
                Add your first patient or import from Doc On
              </p>
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  <UserPlus className="w-5 h-5 inline mr-2" />
                  Add Patient
                </button>
                <Link to="/data-migration" className="btn-secondary">
                  Import from Doc On
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(patientId) => {
            setShowAddModal(false);
            navigate(`/patients/${patientId}`);
          }}
        />
      )}
    </div>
  );
}

// Add Patient Modal Component
function AddPatientModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    aadhaar: '',
    bloodGroup: '',
    allergies: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.age || !formData.phone) {
      setError('Please fill all required fields');
      return;
    }

    setSaving(true);

    try {
      // Generate unique UHID: take max of (server's next) and (local max), loop until free
      let uhidNum = 1;
      try {
        const res = await fetch(`${getServerUrl()}/api/patients/next-uhid`);
        if (res.ok) {
          const data = await res.json();
          const n = parseInt(data.uhid?.slice(2));
          if (!isNaN(n)) uhidNum = n;
        }
      } catch (_) {}

      // Also scan local DB — take whichever is higher
      const allLocal = await DatabaseService.db.patients.toArray();
      for (const p of allLocal) {
        if (p.uhid && p.uhid.startsWith('VH')) {
          const n = parseInt(p.uhid.slice(2));
          if (!isNaN(n) && n >= uhidNum) uhidNum = n + 1;
        }
      }

      // Loop until a UHID is confirmed free in local DB
      let uhid;
      let attempts = 0;
      do {
        uhid = `VH${String(uhidNum + attempts).padStart(5, '0')}`;
        const exists = await DatabaseService.db.patients.where('uhid').equals(uhid).first();
        if (!exists) break;
        attempts++;
      } while (attempts < 1000);

      // Absolute fallback: timestamp-based UHID (guaranteed unique)
      if (attempts >= 1000) {
        uhid = `VH${Date.now().toString().slice(-7)}`;
      }

      const patientData = {
        ...formData,
        uhid,
        age: parseInt(formData.age),
        conditions: [],
        registrationDate: new Date().toISOString(),
      };

      // addPatient uses an atomic transaction — ConstraintError impossible
      const patientId = await DatabaseService.addPatient(patientData);

      // Push to server so other profiles see this patient immediately
      fetch(`${getServerUrl()}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientData, id: patientId })
      }).catch(() => {});

      onSuccess(patientId);
    } catch (error) {
      console.error('Failed to add patient:', error);
      // Show a user-friendly message, not the raw IndexedDB error
      const msg = error?.message?.includes('uniqueness') || error?.name === 'ConstraintError'
        ? 'A conflict occurred saving the patient. Please try again.'
        : 'Failed to add patient: ' + (error?.message || 'Unknown error');
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Add New Patient</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Age *</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input"
                required
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="label">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+91 9876543210"
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="input"
              >
                <option value="">Select...</option>
                <option>A Positive</option>
                <option>A Negative</option>
                <option>B Positive</option>
                <option>B Negative</option>
                <option>AB Positive</option>
                <option>AB Negative</option>
                <option>O Positive</option>
                <option>O Negative</option>
              </select>
            </div>

            <div>
              <label className="label">Aadhaar Number</label>
              <input
                type="text"
                value={formData.aadhaar}
                onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                className="input"
                placeholder="1234 5678 9012"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                rows="2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Known Allergies</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="input"
                placeholder="e.g., Penicillin, Sulfa drugs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Adding Patient...' : 'Add Patient'}
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
      </div>
    </div>
  );
}

export default PatientSearch;
