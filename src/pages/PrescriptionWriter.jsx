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
    notes: '',
    vitals: {
      pulse: '',
      spo2: '',
      bp: ''
    },
    investigations: {
      kft: {
        date: '',
        uricAcid: '',
        bloodUrea: '',
        creatinine: ''
      },
      cbc: {
        date: '',
        hemoglobin: ''
      },
      rbs: {
        date: '',
        value: ''
      },
      lft: {
        date: '',
        sgpt: '',
        sgot: ''
      },
      ecg: '',
      echo: '',
      other: ''
    },
    diagnosis: '',
    medications: [],
    advisedInvestigations: '',
    advisedDiet: '',
    followUpDate: '',
    additionalAdvice: ''
  });
  const [saving, setSaving] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);

  // Comprehensive drug database
  const drugDatabase = [
    { name: 'Clavix AS', genericName: 'Clopidogrel 75mg + Aspirin 150mg', category: 'Antiplatelet', dosages: ['75 & 150'] },
    { name: 'Atorlip', genericName: 'Atorvastatin', category: 'Statin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Atorva', genericName: 'Atorvastatin', category: 'Statin', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Bisoheart', genericName: 'Bisoprolol', category: 'Beta Blocker', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Sorbitrate', genericName: 'Isosorbide Dinitrate', category: 'Nitrate', dosages: ['5mg', '10mg'] },
    { name: 'Ivabrad', genericName: 'Ivabradine', category: 'Heart Rate Control', dosages: ['5mg', '7.5mg'] },
    { name: 'Jardiance', genericName: 'Empagliflozin', category: 'SGLT2 Inhibitor', dosages: ['10mg', '25mg'] },
    { name: 'Dytor', genericName: 'Torasemide', category: 'Diuretic', dosages: ['5mg', '10mg', '20mg'] },
    { name: 'Dytor Plus', genericName: 'Torasemide + Spironolactone', category: 'Diuretic Combination', dosages: ['5 & 50'] },
    { name: 'Dytor E 10 Combi Kit', genericName: 'Eplerenone 25mg + Torasemide 10mg', category: 'Diuretic', dosages: ['Combi'] },
    { name: 'Dapaglyn', genericName: 'Dapagliflozin', category: 'SGLT2 Inhibitor', dosages: ['5mg', '10mg'] },
    { name: 'Ecosprin AV', genericName: 'Aspirin + Atorvastatin', category: 'Antiplatelet + Statin', dosages: ['75/40'] },
    { name: 'Concor', genericName: 'Bisoprolol', category: 'Beta Blocker', dosages: ['1.25mg', '2.5mg', '5mg'] },
    { name: 'Cytogard MR', genericName: 'Trimetazidine', category: 'Anti-ischemic', dosages: ['35 MG'] },
    { name: 'K Cor', genericName: 'Nicorandil', category: 'Vasodilator', dosages: ['5mg', '10mg'] },
    { name: 'Klonaz', genericName: 'Clonazepam', category: 'Benzodiazepine', dosages: ['0.25', '0.5', '1mg'] },
    { name: 'Pansec DSR', genericName: 'Pantoprazole + Domperidone', category: 'PPI + Prokinetic', dosages: ['40+30mg'] },
    { name: 'Cremaffin Plus', genericName: 'Liquid Paraffin + Milk of Magnesia', category: 'Laxative', dosages: ['Syrup'] },
    { name: 'Utiliv', genericName: 'Ursodeoxycholic Acid', category: 'Hepatoprotective', dosages: ['300mg'] },
    { name: 'Paracetamol', genericName: 'Paracetamol', category: 'Analgesic', dosages: ['500mg', '650mg'] }
  ];

  const translations = {
    symptoms: { english: 'Symptoms', hindi: 'लक्षण' },
    notes: { english: 'Notes', hindi: 'नोट्स' },
    vitals: { english: 'Vitals', hindi: 'वाइटल्स' },
    investigations: { english: 'Investigation Results', hindi: 'जांच परिणाम' },
    diagnosis: { english: 'Diagnosis', hindi: 'निदान' },
    rx: { english: 'Rx', hindi: 'Rx' },
    name: { english: 'नाम', hindi: 'नाम' },
    dosage: { english: 'आवृत्ति', hindi: 'आवृत्ति' },
    duration: { english: 'अवधि', hindi: 'अवधि' },
    instructions: { english: 'टिप्पणियाँ', hindi: 'टिप्पणियाँ' },
    advisedInvestigations: { english: 'Advised Investigations', hindi: 'सुझाई गई जांचें' }
  };

  const t = (key) => translations[key]?.[language] || key;

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    if (drugSearch.length >= 2) {
      searchDrugsLocal();
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

  const searchDrugsLocal = () => {
    const searchLower = drugSearch.toLowerCase();
    const results = drugDatabase.filter(drug => 
      drug.name.toLowerCase().includes(searchLower) ||
      drug.genericName.toLowerCase().includes(searchLower) ||
      drug.category.toLowerCase().includes(searchLower)
    ).slice(0, 10);
    setDrugSuggestions(results);
  };

  const addMedication = (drug = null) => {
    const newMed = {
      id: Date.now(),
      drugName: drug ? `Tablet ${drug.name}` : '',
      dosage: drug?.dosages[0] ? `(${drug.dosages[0]})` : '',
      genericName: drug?.genericName || '',
      frequency: '',
      duration: '',
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

  const updateInvestigation = (category, field, value) => {
    setFormData({
      ...formData,
      investigations: {
        ...formData.investigations,
        [category]: typeof formData.investigations[category] === 'string' 
          ? value
          : {
              ...formData.investigations[category],
              [field]: value
            }
      }
    });
  };

  const hasInvestigationData = (category) => {
    const data = formData.investigations[category];
    if (typeof data === 'string') return data.trim() !== '';
    return Object.values(data).some(val => val !== '');
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
        notes: formData.notes,
        vitals: formData.vitals,
        diagnosis: formData.diagnosis,
        investigations: formData.investigations,
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

      {/* Prescription Content - WHITE BACKGROUND */}
      <div style={{ 
        backgroundColor: '#ffffff',
        padding: '20px 30px',
        minHeight: '297mm',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        
        {/* Patient Info - Matches DoCoN exactly */}
        <div style={{ 
          borderBottom: '1px solid #000',
          paddingBottom: '8px',
          marginBottom: '10px',
          marginTop: '5px'
        }}>
          <div style={{ 
            fontSize: '11pt',
            lineHeight: '1.4'
          }}>
            <div style={{ marginBottom: '3px' }}>
              <strong>Name:</strong> {patient.name}
              <span style={{ float: 'right' }}><strong>Date:</strong> {format(new Date(), 'dd-MM-yyyy hh:mm a')}</span>
            </div>
            <div style={{ marginBottom: '3px' }}>
              <strong>Age/Sex:</strong> {patient.age}y / {patient.gender?.charAt(0)}
              <span style={{ float: 'right' }}><strong>Mobile:</strong> {patient.phone}</span>
            </div>
            <div>
              <strong>Office ID:</strong> {patient.uhid}
            </div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '3px' }}>
            Symptoms:
          </div>
          <textarea
            value={formData.complaints}
            onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
            rows="2"
            placeholder="Generalised weakness, Gynaecomastia"
            style={{ 
              width: '100%', 
              fontSize: '10.5pt', 
              padding: '4px', 
              border: '1px solid #ccc', 
              borderRadius: '3px',
              fontFamily: 'inherit'
            }}
          />
        </div>
        {formData.complaints && (
          <div className="print-only" style={{ marginBottom: '8px', fontSize: '11pt' }}>
            <strong>Symptoms:</strong> {formData.complaints}
          </div>
        )}

        {/* Notes (Additional clinical notes) */}
        {formData.notes && (
          <>
            <div className="no-print" style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '3px' }}>
                Notes:
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                placeholder="Recently admitted with NSTEMI, ECHO—ICMP, Moderate MR, LVEF 40%, DM, HTN+, Old ICH"
                style={{ 
                  width: '100%', 
                  fontSize: '10.5pt', 
                  padding: '4px', 
                  border: '1px solid #ccc', 
                  borderRadius: '3px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div className="print-only" style={{ marginBottom: '8px', fontSize: '11pt' }}>
              <strong>Notes:</strong> {formData.notes}
            </div>
          </>
        )}

        {/* Vitals */}
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '3px' }}>
            Vitals:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <input
              type="text"
              value={formData.vitals.pulse}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: e.target.value }})}
              placeholder="Pulse: 70"
              style={{ fontSize: '10.5pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
            <input
              type="text"
              value={formData.vitals.spo2}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value }})}
              placeholder="SPO2: 96"
              style={{ fontSize: '10.5pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
            <input
              type="text"
              value={formData.vitals.bp}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp: e.target.value }})}
              placeholder="BP: 110/80"
              style={{ fontSize: '10.5pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>
        </div>
        {(formData.vitals.pulse || formData.vitals.spo2 || formData.vitals.bp) && (
          <div className="print-only" style={{ marginBottom: '8px', fontSize: '11pt' }}>
            <strong>Vitals:</strong> Pulse: {formData.vitals.pulse || '-'} /min, SPO2: {formData.vitals.spo2 || '-'} %, BP: {formData.vitals.bp || '-'} mmHg
          </div>
        )}

        {/* Investigation Results - COMPACT TABLES */}
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '5px' }}>
            Investigation Results:
          </div>

          {/* KFT */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>Kidney Function Test KFT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '5px' }}>
              <input type="date" value={formData.investigations.kft.date} onChange={(e) => updateInvestigation('kft', 'date', e.target.value)} style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.kft.uricAcid} onChange={(e) => updateInvestigation('kft', 'uricAcid', e.target.value)} placeholder="S. Uric acid" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.kft.bloodUrea} onChange={(e) => updateInvestigation('kft', 'bloodUrea', e.target.value)} placeholder="Blood Urea" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.kft.creatinine} onChange={(e) => updateInvestigation('kft', 'creatinine', e.target.value)} placeholder="S Creatinine" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* CBC */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>CBC - Complete Blood Count</div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 200px', gap: '5px' }}>
              <input type="date" value={formData.investigations.cbc.date} onChange={(e) => updateInvestigation('cbc', 'date', e.target.value)} style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.cbc.hemoglobin} onChange={(e) => updateInvestigation('cbc', 'hemoglobin', e.target.value)} placeholder="Hemoglobin" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* RBS */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>RBS (Random Blood Sugar)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 200px', gap: '5px' }}>
              <input type="date" value={formData.investigations.rbs.date} onChange={(e) => updateInvestigation('rbs', 'date', e.target.value)} style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.rbs.value} onChange={(e) => updateInvestigation('rbs', 'value', e.target.value)} placeholder="Random Blood Sugar" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* LFT */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>Liver Function Test LFT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '5px' }}>
              <input type="date" value={formData.investigations.lft.date} onChange={(e) => updateInvestigation('lft', 'date', e.target.value)} style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.lft.sgpt} onChange={(e) => updateInvestigation('lft', 'sgpt', e.target.value)} placeholder="SGPT (ALT)" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
              <input type="text" value={formData.investigations.lft.sgot} onChange={(e) => updateInvestigation('lft', 'sgot', e.target.value)} placeholder="SGOT (AST)" style={{ fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
            </div>
          </div>

          {/* ECG & Echo */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>ECG</div>
            <input type="text" value={formData.investigations.ecg} onChange={(e) => updateInvestigation('ecg', null, e.target.value)} placeholder="SR, QS V1-V5" style={{ width: '100%', fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>Echocardiography-Colour Doppler</div>
            <input type="text" value={formData.investigations.echo} onChange={(e) => updateInvestigation('echo', null, e.target.value)} placeholder="LAD Hx, Normal Valves, LVEF 50%" style={{ width: '100%', fontSize: '9.5pt', padding: '3px', border: '1px solid #ccc' }} />
          </div>
        </div>

        {/* Print Investigation Results - CLEAN TABLES */}
        <div className="print-only" style={{ marginBottom: '10px' }}>
          {(hasInvestigationData('kft') || hasInvestigationData('cbc') || hasInvestigationData('rbs') || 
            hasInvestigationData('lft') || hasInvestigationData('ecg') || hasInvestigationData('echo')) && (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '5px' }}>Investigation Results:</div>
              
              {hasInvestigationData('kft') && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>Kidney Function Test KFT</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>Kidney Function Test KFT</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>S. Uric acid</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>Blood Urea</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>S Creatinine</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.kft.date ? format(new Date(formData.investigations.kft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.kft.uricAcid ? `${formData.investigations.kft.uricAcid} mg/dL` : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.kft.bloodUrea ? `${formData.investigations.kft.bloodUrea} mg/dl` : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.kft.creatinine ? `${formData.investigations.kft.creatinine} mg/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('cbc') && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>CBC - Complete Blood Count</div>
                  <table style={{ width: '50%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>CBC - Complete Blood Count</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>Hemoglobin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.cbc.date ? format(new Date(formData.investigations.cbc.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.cbc.hemoglobin ? `${formData.investigations.cbc.hemoglobin} g/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('rbs') && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>RBS (Random Blood Sugar)</div>
                  <table style={{ width: '50%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>RBS (Random Blood Sugar)</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>Random Blood Sugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.rbs.date ? format(new Date(formData.investigations.rbs.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.rbs.value ? `${formData.investigations.rbs.value} mg/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('lft') && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5pt', fontWeight: '600', marginBottom: '2px' }}>Liver Function Test LFT</div>
                  <table style={{ width: '60%', borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>Liver Function Test LFT</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>SGPT (ALT)</th>
                        <th style={{ padding: '3px 5px', border: '1px solid #000', textAlign: 'left', backgroundColor: '#f9f9f9' }}>SGOT (AST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.lft.date ? format(new Date(formData.investigations.lft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.lft.sgpt ? `${formData.investigations.lft.sgpt} U/L` : ''}</td>
                        <td style={{ padding: '3px 5px', border: '1px solid #000' }}>{formData.investigations.lft.sgot ? `${formData.investigations.lft.sgot} U/L` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {formData.investigations.ecg && (
                <div style={{ fontSize: '10.5pt', marginBottom: '5px' }}>
                  <strong>ECG:</strong> {formData.investigations.ecg}
                </div>
              )}

              {formData.investigations.echo && (
                <div style={{ fontSize: '10.5pt', marginBottom: '5px' }}>
                  <strong>Echocardiography-Colour Doppler:</strong> {formData.investigations.echo}
                </div>
              )}
            </>
          )}
        </div>

        {/* Diagnosis */}
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '3px' }}>
            Diagnosis: *
          </div>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="IHD/NSTEMI/Moderate LVD/SR/HTN/Old ICH"
            required
            style={{ width: '100%', fontSize: '10.5pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        {formData.diagnosis && (
          <div className="print-only" style={{ marginBottom: '8px', fontSize: '11pt' }}>
            <strong>Diagnosis:</strong> {formData.diagnosis}
          </div>
        )}

        {/* Medications Table - DoCoN Style */}
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          {formData.medications.length > 0 && (
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10.5pt',
              border: '1px solid #000'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', width: '30px' }}>Rx</th>
                  <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center' }}>नाम</th>
                  <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', width: '120px' }}>आवृत्ति</th>
                  <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', width: '60px' }}>अवधि</th>
                  <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', width: '80px' }}>टिप्पणियाँ</th>
                  <th className="no-print" style={{ padding: '4px', border: '1px solid #000', width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.medications.map((med, index) => (
                  <React.Fragment key={med.id}>
                    <tr className="no-print">
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                          placeholder="Tablet Ecosprin AV (75/40)"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px' }}
                        />
                        <input
                          type="text"
                          value={med.genericName}
                          onChange={(e) => updateMedication(med.id, 'genericName', e.target.value)}
                          placeholder="Aspirin 75 MG+ATORVASTATIN 40 MG"
                          style={{ width: '100%', border: 'none', fontSize: '9pt', color: '#555', padding: '2px', fontStyle: 'italic' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                          placeholder="1 tablet - दिन में एक बार"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                          placeholder="15 दिन"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => updateMedication(med.id, 'instructions', e.target.value)}
                          placeholder="सोने से पहले"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>
                        <button onClick={() => removeMedication(med.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="print-only">
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                      <td style={{ padding: '4px', border: '1px solid #000', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600' }}>{med.drugName}</div>
                        {med.genericName && <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic' }}>{med.genericName}</div>}
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #000', verticalAlign: 'top' }}>{med.frequency}</td>
                      <td style={{ padding: '4px', border: '1px solid #000', verticalAlign: 'top' }}>{med.duration}</td>
                      <td style={{ padding: '4px', border: '1px solid #000', verticalAlign: 'top' }}>{med.instructions}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Add Medication */}
          <div className="no-print" style={{ marginTop: '10px' }}>
            {showDrugSearch && (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#999', width: '18px', height: '18px' }} />
                  <input
                    type="text"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    placeholder="Search: Ecosprin, Concor, Sorbitrate..."
                    autoFocus
                    style={{ 
                      width: '100%', 
                      paddingLeft: '35px', 
                      paddingRight: '35px', 
                      paddingTop: '8px',
                      paddingBottom: '8px',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: '10.5pt'
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowDrugSearch(false);
                      setDrugSearch('');
                    }}
                    style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      top: '10px', 
                      border: 'none', 
                      background: 'none', 
                      cursor: 'pointer',
                      color: '#999'
                    }}
                  >
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>

                {drugSuggestions.length > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    zIndex: 10, 
                    width: '100%', 
                    marginTop: '4px', 
                    backgroundColor: 'white', 
                    border: '2px solid #3b82f6', 
                    borderRadius: '6px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                    maxHeight: '240px', 
                    overflowY: 'auto' 
                  }}>
                    {drugSuggestions.map((drug, idx) => (
                      <button
                        key={idx}
                        onClick={() => addMedication(drug)}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '10px 12px', 
                          border: 'none',
                          borderBottom: '1px solid #e5e7eb',
                          background: 'white',
                          cursor: 'pointer',
                          fontSize: '10.5pt'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{drug.name} ({drug.dosages.join(', ')})</div>
                        <div style={{ fontSize: '9pt', color: '#6b7280' }}>{drug.genericName} • {drug.category}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showDrugSearch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setShowDrugSearch(true)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: '#2563eb', 
                    fontWeight: '600', 
                    fontSize: '10.5pt',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Search style={{ width: '16px', height: '16px' }} />
                  <span>Search Drugs</span>
                </button>
                <span style={{ color: '#9ca3af' }}>or</span>
                <button
                  onClick={() => addMedication()}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: '#2563eb', 
                    fontWeight: '600', 
                    fontSize: '10.5pt',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  <span>Add Manually</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advised Investigations */}
        <div className="no-print" style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '3px' }}>
            Advised Investigations:
          </div>
          <textarea
            value={formData.advisedInvestigations}
            onChange={(e) => setFormData({ ...formData, advisedInvestigations: e.target.value })}
            rows="2"
            placeholder="FBS- Fasting Blood Sugar, Fasting Lipid Profile, Liver Function Test LFT"
            style={{ width: '100%', fontSize: '10.5pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        {formData.advisedInvestigations && (
          <div className="print-only" style={{ marginBottom: '8px', fontSize: '11pt' }}>
            <strong>Advised Investigations:</strong> {formData.advisedInvestigations}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrescriptionWriter;
