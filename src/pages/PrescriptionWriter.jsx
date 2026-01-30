import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Printer, Search, Languages } from 'lucide-react';
import DatabaseService from '../services/database';
import { format } from 'date-fns';

function PrescriptionWriter() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [language, setLanguage] = useState('english');
  const [formData, setFormData] = useState({
    complaints: '',
    vitals: {
      pulse: '',
      spo2: '',
      bp: ''
    },
    investigationResults: '',
    diagnosis: '',
    medications: [],
    advisedInvestigations: ''
  });
  const [saving, setSaving] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);

  const translations = {
    symptoms: { english: 'Symptoms', hindi: 'लक्षण' },
    vitals: { english: 'Vitals', hindi: 'वाइटल्स' },
    investigations: { english: 'Investigation Results', hindi: 'जांच परिणाम' },
    diagnosis: { english: 'Diagnosis', hindi: 'निदान' },
    rx: { english: 'Rx', hindi: 'Rx' },
    name: { english: 'Name', hindi: 'नाम' },
    dosage: { english: 'आवृत्ति', hindi: 'आवृत्ति' },
    frequency: { english: 'अवधि', hindi: 'अवधि' },
    instructions: { english: 'टिप्पणियाँ', hindi: 'टिप्पणियाँ' },
    advisedInvestigations: { english: 'Advised Investigations', hindi: 'सुझाई गई जांचें' }
  };

  const t = (key) => translations[key]?.[language] || key;

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
      drugName: drug ? `Tablet ${drug.name} ${drug.commonDosages[0] || ''}` : '',
      genericName: drug?.genericName || '',
      dosage: '1 tablet - दिन में एक बार',
      frequency: '2 महीने',
      instructions: ''
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

    setSaving(true);

    try {
      const prescriptionData = {
        patientId: parseInt(patientId),
        uhid: patient.uhid,
        date: new Date().toISOString(),
        doctorId: 1,
        complaints: formData.complaints,
        vitals: formData.vitals,
        diagnosis: formData.diagnosis,
        investigations: formData.investigationResults,
        advisedInvestigations: formData.advisedInvestigations,
        medications: formData.medications,
        language: language
      };

      await DatabaseService.addPrescription(prescriptionData);

      alert('✅ PRESCRIPTION SAVED!');
      navigate(`/patients/${patientId}`);

    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save prescription');
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
      {/* Controls - Hidden on Print */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Patient</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setLanguage(language === 'english' ? 'hindi' : 'english')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Languages className="w-5 h-5" />
            <span>{language === 'english' ? 'हिंदी' : 'English'}</span>
          </button>
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
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Prescription Content - ONLY CONTENT FOR LETTERHEAD */}
      <div className="bg-white rounded-xl shadow-2xl prescription-container" style={{ padding: '40px 50px' }}>
        
        {/* Patient Info - First Section */}
        <div style={{ 
          borderBottom: '1px solid #000',
          paddingBottom: '10px',
          marginBottom: '12px'
        }}>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            fontSize: '10.5pt'
          }}>
            <div><strong>Name:</strong> {patient.name}</div>
            <div><strong>Age/Sex:</strong> {patient.age}y / {patient.gender?.charAt(0)}</div>
            <div><strong>Date:</strong> {format(new Date(), 'dd-MM-yyyy hh:mm a')}</div>
          </div>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            fontSize: '10.5pt',
            marginTop: '5px'
          }}>
            <div><strong>Office ID:</strong> {patient.uhid}</div>
            <div><strong>Mobile:</strong> {patient.phone}</div>
            <div></div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('symptoms')}:
          </label>
          <textarea
            value={formData.complaints}
            onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
            rows="2"
            placeholder="e.g., Generalised weakness, Gynaecomastia"
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.complaints && (
          <div className="print-only" style={{ marginBottom: '10px', fontSize: '10.5pt' }}>
            <strong>{t('symptoms')}:</strong> {formData.complaints}
          </div>
        )}

        {/* Vitals */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('vitals')}:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <input
              type="text"
              value={formData.vitals.pulse}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: e.target.value }})}
              placeholder="Pulse: 90 /min"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              value={formData.vitals.spo2}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value }})}
              placeholder="SPO2: 94 %"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              value={formData.vitals.bp}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp: e.target.value }})}
              placeholder="BP: 130/80 mmHg"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
        {(formData.vitals.pulse || formData.vitals.spo2 || formData.vitals.bp) && (
          <div className="print-only" style={{ marginBottom: '10px', fontSize: '10.5pt' }}>
            <strong>{t('vitals')}:</strong> Pulse: {formData.vitals.pulse || '-'}, SPO2: {formData.vitals.spo2 || '-'}, BP: {formData.vitals.bp || '-'}
          </div>
        )}

        {/* Investigation Results */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('investigations')}:
          </label>
          <textarea
            value={formData.investigationResults}
            onChange={(e) => setFormData({ ...formData, investigationResults: e.target.value })}
            rows="3"
            placeholder="Kidney Function Test KFT, CBC, RBS, LFT, ECG, Echo..."
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.investigationResults && (
          <div className="print-only" style={{ marginBottom: '10px', fontSize: '10.5pt', whiteSpace: 'pre-line' }}>
            <strong>{t('investigations')}:</strong>
            <div style={{ marginTop: '3px' }}>{formData.investigationResults}</div>
          </div>
        )}

        {/* Diagnosis */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('diagnosis')}: *
          </label>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="e.g., CAD/AWMI/Severe LVD/SVD/P/PTCA/SR"
            required
            style={{ width: '100%', fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        {formData.diagnosis && (
          <div className="print-only" style={{ marginBottom: '10px', fontSize: '10.5pt' }}>
            <strong>{t('diagnosis')}:</strong> {formData.diagnosis}
          </div>
        )}

        {/* Medications Table */}
        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          {formData.medications.length > 0 && (
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10.5pt',
              marginTop: '8px',
              marginBottom: '8px'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '35px' }}>{t('rx')}</th>
                  <th style={{ padding: '5px 3px', textAlign: 'left' }}>{t('name')}</th>
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '140px' }}>{t('dosage')}</th>
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '70px' }}>{t('frequency')}</th>
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '90px' }}>{t('instructions')}</th>
                  <th className="no-print" style={{ padding: '5px 3px', width: '35px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.medications.map((med, index) => (
                  <React.Fragment key={med.id}>
                    <tr className="no-print" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 3px', verticalAlign: 'top' }}><strong>{index + 1}</strong></td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                          placeholder="Tablet Name"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                        <input
                          type="text"
                          value={med.genericName}
                          onChange={(e) => updateMedication(med.id, 'genericName', e.target.value)}
                          placeholder="Generic (optional)"
                          className="w-full px-2 py-1 border rounded mt-1"
                          style={{ fontSize: '9pt', color: '#666' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                          placeholder="1 tablet - दिन में एक बार"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                          placeholder="2 महीने"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                          placeholder="Sublingual"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px', textAlign: 'center' }}>
                        <button onClick={() => removeMedication(med.id)} className="text-red-600 hover:text-red-800">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="print-only" style={{ borderBottom: '1px solid #ccc' }}>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}><strong>{index + 1}</strong></td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>{med.drugName}</div>
                        {med.genericName && (
                          <div style={{ fontSize: '9pt', color: '#666', fontStyle: 'italic', marginTop: '1px' }}>
                            {med.genericName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.dosage}</td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.frequency}</td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.instructions}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          <div className="no-print" style={{ marginTop: '12px' }}>
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
                        <p className="text-xs text-gray-600">{drug.genericName} • {drug.category}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showDrugSearch && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowDrugSearch(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 font-semibold text-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Drugs</span>
                </button>
                <span className="text-gray-400">or</span>
                <button
                  onClick={() => addMedication()}
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Manually</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advised Investigations */}
        <div className="no-print" style={{ marginBottom: '12px', marginTop: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('advisedInvestigations')}:
          </label>
          <textarea
            value={formData.advisedInvestigations}
            onChange={(e) => setFormData({ ...formData, advisedInvestigations: e.target.value })}
            rows="2"
            placeholder="FBS, Lipid Profile, LFT..."
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.advisedInvestigations && (
          <div className="print-only" style={{ marginBottom: '12px', fontSize: '10.5pt' }}>
            <strong>{t('advisedInvestigations')}:</strong> {formData.advisedInvestigations}
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg no-print">
          <p className="text-sm text-yellow-800">
            <strong>💡 Print on hospital letterhead</strong> - Header and footer are pre-printed
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionWriter;
