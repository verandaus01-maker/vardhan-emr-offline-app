import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Printer, Search } from 'lucide-react';
import DatabaseService from '../services/database';
import { format } from 'date-fns';

function PrescriptionWriter() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    complaints: '',
    diagnosis: '',
    medications: [],
    investigations: '',
    advice: '',
    followUp: '1 month',
    nextVisitDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    if (drugSearch.length >= 2) {
      searchDrugs();
    } else {
      setDrugSuggestions([]);
    }
  }, [drugSearch]);

  const loadPatient = async () => {
    const patientData = await DatabaseService.getPatient(parseInt(patientId));
    if (!patientData) {
      navigate('/patients');
      return;
    }
    setPatient(patientData);
  };

  const searchDrugs = async () => {
    const results = await DatabaseService.searchDrugs(drugSearch);
    setDrugSuggestions(results);
  };

  const addMedication = (drug = null) => {
    const newMed = {
      id: Date.now(),
      drugName: drug ? `Tab. ${drug.name} ${drug.commonDosages[0] || ''}` : '',
      dosage: '1 tablet',
      frequency: 'Once daily (OD)',
      duration: '30 days',
      instructions: 'After food'
    };

    setFormData({
      ...formData,
      medications: [...formData.medications, newMed]
    });

    setDrugSearch('');
    setShowDrugSearch(false);
  };

  const updateMedication = (id, field, value) => {
    setFormData({
      ...formData,
      medications: formData.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    });
  };

  const removeMedication = (id) => {
    setFormData({
      ...formData,
      medications: formData.medications.filter(med => med.id !== id)
    });
  };

  const handleSave = async () => {
    if (!formData.diagnosis) {
      alert('Please enter diagnosis');
      return;
    }

    if (formData.medications.length === 0) {
      if (!confirm('No medications added. Continue?')) {
        return;
      }
    }

    setSaving(true);

    try {
      const prescriptionData = {
        patientId: parseInt(patientId),
        uhid: patient.uhid,
        date: new Date().toISOString(),
        doctorId: 1,
        complaints: formData.complaints,
        diagnosis: formData.diagnosis,
        investigations: formData.investigations,
        advice: formData.advice,
        followUp: formData.followUp,
        nextVisitDate: formData.nextVisitDate,
        medications: formData.medications.map(med => ({
          drugName: med.drugName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions
        }))
      };

      await DatabaseService.addPrescription(prescriptionData);

      alert('✅ PRESCRIPTION SAVED SUCCESSFULLY!\n\n' +
        '💾 Saved to local database (works offline)\n' +
        '📱 Will sync to Doc On when online\n' +
        '👨‍⚕️ Patient will receive via Doc On app after sync');

      navigate(`/patients/${patientId}`);

    } catch (error) {
      console.error('Failed to save prescription:', error);
      alert('Failed to save prescription: ' + error.message);
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Patient</span>
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={handlePrint} className="btn-secondary flex items-center space-x-2">
            <Printer className="w-5 h-5" />
            <span>Print</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Prescription'}</span>
          </button>
        </div>
      </div>

      {/* Prescription Paper */}
      <div className="bg-white rounded-xl shadow-2xl p-8">
        {/* Prescription Header */}
        <div className="border-b-2 border-blue-600 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-blue-800 mb-2">℞ Prescription</h1>
              <p className="text-gray-600">Vardhan Hospital - Cardiology Department</p>
              <p className="text-sm text-gray-500">Dr. Vivek Raj Singh, MD (Cardiology)</p>
              <p className="text-sm text-gray-500 mt-1">
                A-125/D, Lalpur Housing Scheme, Varanasi - 221003
              </p>
              <p className="text-sm text-gray-500">Phone: +91 542 2367890</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Date: <span className="font-semibold">{format(new Date(), 'dd-MMM-yyyy')}</span>
              </p>
              <p className="text-sm text-gray-600">
                Rx No: <span className="font-mono font-semibold">
                  VH-RX-{format(new Date(), 'yyyy')}-{String(Math.floor(Math.random() * 10000)).padStart(5, '0')}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Patient:</span>{' '}
              <span className="font-bold">{patient.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Age/Sex:</span>{' '}
              <span className="font-bold">{patient.age}Y / {patient.gender?.[0]}</span>
            </div>
            <div>
              <span className="text-gray-600">UHID:</span>{' '}
              <span className="font-mono font-bold">{patient.uhid}</span>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>{' '}
              <span className="font-bold">{patient.phone}</span>
            </div>
          </div>
        </div>

        {/* Chief Complaints */}
        <div className="mb-6">
          <label className="label">Chief Complaints</label>
          <textarea
            value={formData.complaints}
            onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
            rows="2"
            placeholder="e.g., Chest discomfort for 2 days, breathlessness on exertion..."
            className="input"
          />
        </div>

        {/* Diagnosis */}
        <div className="mb-6">
          <label className="label">Diagnosis *</label>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="e.g., Hypertension Stage 2, Type 2 Diabetes Mellitus"
            className="input"
            required
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {['Hypertension Stage 2', 'Type 2 Diabetes', 'Acute URTI', 'Angina Pectoris'].map(diag => (
              <button
                key={diag}
                onClick={() => setFormData({
                  ...formData,
                  diagnosis: formData.diagnosis ? `${formData.diagnosis}, ${diag}` : diag
                })}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                {diag}
              </button>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div className="mb-6 border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50">
          <h3 className="font-bold text-xl mb-4 text-blue-800 flex items-center space-x-2">
            <span>💊</span>
            <span>Medications</span>
          </h3>

          {formData.medications.length > 0 && (
            <div className="space-y-3 mb-4">
              {formData.medications.map((med, index) => (
                <div key={med.id} className="bg-white p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-bold text-gray-700">#{index + 1}</span>
                    <button
                      onClick={() => removeMedication(med.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600 mb-1 block">Medicine Name</label>
                      <input
                        type="text"
                        value={med.drugName}
                        onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                        placeholder="e.g., Tab. Amlodipine 5mg"
                        className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                        placeholder="e.g., 1 tablet"
                        className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Frequency</label>
                      <select
                        value={med.frequency}
                        onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option>Once daily (OD)</option>
                        <option>Twice daily (BD)</option>
                        <option>Thrice daily (TDS)</option>
                        <option>Four times (QID)</option>
                        <option>Morning (1-0-0)</option>
                        <option>Evening (0-0-1)</option>
                        <option>Morning & Evening (1-0-1)</option>
                        <option>SOS (If needed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Duration</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                        placeholder="e.g., 30 days"
                        className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Instructions</label>
                      <select
                        value={med.instructions}
                        onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option>After food</option>
                        <option>Before food</option>
                        <option>With food</option>
                        <option>Empty stomach</option>
                        <option>At bedtime</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drug Search */}
          {showDrugSearch && (
            <div className="mb-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  placeholder="Search drug database..."
                  className="w-full pl-10 pr-10 py-3 border-2 border-blue-500 rounded-lg focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowDrugSearch(false);
                    setDrugSearch('');
                  }}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drugSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {drugSuggestions.map(drug => (
                    <button
                      key={drug.id}
                      onClick={() => addMedication(drug)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0"
                    >
                      <p className="font-semibold text-gray-800">{drug.name}</p>
                      <p className="text-xs text-gray-600">
                        {drug.genericName} • {drug.category} • {drug.dosageForm}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Medication Buttons */}
          <div className="flex items-center space-x-3">
            {!showDrugSearch ? (
              <>
                <button
                  onClick={() => setShowDrugSearch(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 font-semibold"
                >
                  <Search className="w-5 h-5" />
                  <span>Search Drug Database</span>
                </button>
                <span className="text-gray-400">or</span>
                <button
                  onClick={() => addMedication()}
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Manually</span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Investigations */}
        <div className="mb-6">
          <label className="label">🔬 Investigations Advised</label>
          <textarea
            value={formData.investigations}
            onChange={(e) => setFormData({ ...formData, investigations: e.target.value })}
            rows="2"
            placeholder="e.g., Complete Blood Count, Lipid Profile, ECG, 2D Echo..."
            className="input"
          />
        </div>

        {/* Advice */}
        <div className="mb-6">
          <label className="label">📝 Advice & Lifestyle Modifications</label>
          <textarea
            value={formData.advice}
            onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
            rows="4"
            placeholder="e.g., Low salt diet, Regular exercise 30 min daily, Avoid smoking, Monitor BP daily..."
            className="input"
          />
        </div>

        {/* Follow-up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="label">Follow-up After</label>
            <select
              value={formData.followUp}
              onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
              className="input"
            >
              <option>3 days</option>
              <option>1 week</option>
              <option>2 weeks</option>
              <option>1 month</option>
              <option>3 months</option>
              <option>6 months</option>
              <option>SOS (If needed)</option>
            </select>
          </div>
          <div>
            <label className="label">Next Visit Date</label>
            <input
              type="date"
              value={formData.nextVisitDate}
              onChange={(e) => setFormData({ ...formData, nextVisitDate: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 pt-6 mt-8">
          <div className="flex items-end justify-between">
            <div className="text-sm text-gray-600">
              <p>This is a computer-generated prescription</p>
              <p className="mt-1">For queries, contact: +91 542 2367890</p>
            </div>
            <div className="text-right">
              <div className="border-t-2 border-gray-800 pt-2 mt-8 w-48">
                <p className="font-semibold">Dr. Vivek Raj Singh</p>
                <p className="text-sm text-gray-600">MD (Cardiology)</p>
                <p className="text-xs text-gray-500">Reg. No: MCI-12345</p>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Note */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg no-print">
          <p className="text-sm text-yellow-800">
            <strong>💡 Offline Mode:</strong> This prescription will be saved locally and automatically
            synced to Doc On when internet connection is restored. Patient will receive it via Doc On
            app after sync.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionWriter;
