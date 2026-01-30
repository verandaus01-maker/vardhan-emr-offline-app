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
      lipidProfile: {
        date: '',
        totalCholesterol: '',
        triglycerides: '',
        hdl: '',
        ldl: ''
      },
      thyroid: {
        date: '',
        tsh: '',
        t3: '',
        t4: ''
      },
      hba1c: {
        date: '',
        value: ''
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
    // Cardiovascular
    { name: 'Clavix AS', genericName: 'Clopidogrel 75mg + Aspirin 150mg', category: 'Antiplatelet', dosages: ['75 & 150mg'] },
    { name: 'Atorlip', genericName: 'Atorvastatin', category: 'Statin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Atorva', genericName: 'Atorvastatin', category: 'Statin', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Bisoheart', genericName: 'Bisoprolol', category: 'Beta Blocker', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Sorbitrate', genericName: 'Isosorbide Dinitrate', category: 'Nitrate', dosages: ['5mg', '10mg'] },
    { name: 'Ivabrad', genericName: 'Ivabradine', category: 'Heart Rate Control', dosages: ['5mg', '7.5mg'] },
    { name: 'Jardiance', genericName: 'Empagliflozin', category: 'SGLT2 Inhibitor', dosages: ['10mg', '25mg'] },
    { name: 'Karvea', genericName: 'Irbesartan', category: 'ARB', dosages: ['150mg', '300mg'] },
    
    // Diuretics
    { name: 'Dytor', genericName: 'Torasemide', category: 'Diuretic', dosages: ['5mg', '10mg', '20mg'] },
    { name: 'Dytor Plus', genericName: 'Torasemide + Spironolactone', category: 'Diuretic Combination', dosages: ['5 & 50mg'] },
    { name: 'Dytor E 10 Combi Kit', genericName: 'Eplerenone 25mg + Torasemide 10mg', category: 'Diuretic Combination', dosages: ['Combi'] },
    
    // Antidiabetic
    { name: 'Dapaglyn', genericName: 'Dapagliflozin', category: 'SGLT2 Inhibitor', dosages: ['5mg', '10mg'] },
    { name: 'Glimestar', genericName: 'Glimepiride', category: 'Sulfonylurea', dosages: ['1mg', '2mg', '4mg'] },
    { name: 'Metformin', genericName: 'Metformin', category: 'Biguanide', dosages: ['500mg', '850mg', '1000mg'] },
    
    // Anticoagulants
    { name: 'Kionz', genericName: 'Clonazepam', category: 'Benzodiazepine', dosages: ['0.25mg', '0.5mg', '1mg'] },
    { name: 'Klonaz', genericName: 'Clonazepam', category: 'Benzodiazepine', dosages: ['0.5mg', '1mg'] },
    
    // GI medications
    { name: 'Pansec DSR', genericName: 'Pantoprazole 40mg + Domperidone 30mg', category: 'PPI + Prokinetic', dosages: ['40+30mg'] },
    { name: 'Cremaffin Plus', genericName: 'Liquid Paraffin + Milk of Magnesia', category: 'Laxative', dosages: ['Syrup'] },
    { name: 'Utiliv', genericName: 'Ursodeoxycholic Acid', category: 'Hepatoprotective', dosages: ['300mg'] },
    
    // Pain & Inflammation
    { name: 'Aceclofenac', genericName: 'Aceclofenac', category: 'NSAID', dosages: ['100mg'] },
    { name: 'Paracetamol', genericName: 'Paracetamol', category: 'Analgesic', dosages: ['500mg', '650mg', '1000mg'] },
    
    // Vitamins & Supplements
    { name: 'Vitamin D3', genericName: 'Cholecalciferol', category: 'Vitamin', dosages: ['60000 IU'] },
    { name: 'Vitamin B12', genericName: 'Methylcobalamin', category: 'Vitamin', dosages: ['500mcg', '1500mcg'] },
    { name: 'Folic Acid', genericName: 'Folic Acid', category: 'Vitamin', dosages: ['5mg'] }
  ];

  const translations = {
    symptoms: { english: 'Symptoms', hindi: 'लक्षण' },
    vitals: { english: 'Vitals', hindi: 'वाइटल्स' },
    investigations: { english: 'Investigation Results', hindi: 'जांच परिणाम' },
    diagnosis: { english: 'Diagnosis', hindi: 'निदान' },
    rx: { english: 'Rx', hindi: 'Rx' },
    name: { english: 'नाम', hindi: 'नाम' },
    dosage: { english: 'आवृत्ति', hindi: 'आवृत्ति' },
    duration: { english: 'अवधि', hindi: 'अवधि' },
    instructions: { english: 'टिप्पणियाँ', hindi: 'टिप्पणियाँ' },
    advisedInvestigations: { english: 'Advised Investigations', hindi: 'सुझाई गई जांचें' },
    advisedDiet: { english: 'Advised Diet', hindi: 'सुझाया गया आहार' }
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
      dosage: drug?.dosages[0] || '',
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
        [category]: {
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
        vitals: formData.vitals,
        diagnosis: formData.diagnosis,
        investigations: formData.investigations,
        advisedInvestigations: formData.advisedInvestigations,
        medications: formData.medications,
        advisedDiet: formData.advisedDiet,
        followUpDate: formData.followUpDate,
        additionalAdvice: formData.additionalAdvice,
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

      {/* Prescription Content */}
      <div className="bg-white rounded-xl shadow-2xl prescription-container" style={{ padding: '40px 50px' }}>
        
        {/* Patient Info */}
        <div style={{ 
          borderBottom: '1px solid #000',
          paddingBottom: '10px',
          marginBottom: '15px'
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
            style={{ width: '100%', fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
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
              placeholder="Pulse: 90"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              value={formData.vitals.spo2}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value }})}
              placeholder="SPO2: 94"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              value={formData.vitals.bp}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp: e.target.value }})}
              placeholder="BP: 130/80"
              style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
        {(formData.vitals.pulse || formData.vitals.spo2 || formData.vitals.bp) && (
          <div className="print-only" style={{ marginBottom: '10px', fontSize: '10.5pt' }}>
            <strong>{t('vitals')}:</strong> Pulse: {formData.vitals.pulse ? `${formData.vitals.pulse} /min` : '-'}, SPO2: {formData.vitals.spo2 ? `${formData.vitals.spo2} %` : '-'}, BP: {formData.vitals.bp ? `${formData.vitals.bp} mmHg` : '-'}
          </div>
        )}

        {/* Investigation Results - TABLE FORMAT */}
        <div className="no-print" style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '8px' }}>
            {t('investigations')}:
          </label>

          {/* KFT - Kidney Function Test */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Kidney Function Test KFT
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.kft.date}
                onChange={(e) => updateInvestigation('kft', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.kft.uricAcid}
                onChange={(e) => updateInvestigation('kft', 'uricAcid', e.target.value)}
                placeholder="S. Uric acid (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.kft.bloodUrea}
                onChange={(e) => updateInvestigation('kft', 'bloodUrea', e.target.value)}
                placeholder="Blood Urea (mg/dl)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.kft.creatinine}
                onChange={(e) => updateInvestigation('kft', 'creatinine', e.target.value)}
                placeholder="S Creatinine (mg/dl)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* CBC - Complete Blood Count */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              CBC - Complete Blood Count
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.cbc.date}
                onChange={(e) => updateInvestigation('cbc', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.cbc.hemoglobin}
                onChange={(e) => updateInvestigation('cbc', 'hemoglobin', e.target.value)}
                placeholder="Hemoglobin (g/dl)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* RBS - Random Blood Sugar */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              RBS (Random Blood Sugar)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.rbs.date}
                onChange={(e) => updateInvestigation('rbs', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.rbs.value}
                onChange={(e) => updateInvestigation('rbs', 'value', e.target.value)}
                placeholder="Random Blood Sugar (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* LFT - Liver Function Test */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Liver Function Test LFT
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.lft.date}
                onChange={(e) => updateInvestigation('lft', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lft.sgpt}
                onChange={(e) => updateInvestigation('lft', 'sgpt', e.target.value)}
                placeholder="SGPT (ALT) U/L"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lft.sgot}
                onChange={(e) => updateInvestigation('lft', 'sgot', e.target.value)}
                placeholder="SGOT (AST) U/L"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* Lipid Profile */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Lipid Profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.lipidProfile.date}
                onChange={(e) => updateInvestigation('lipidProfile', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lipidProfile.totalCholesterol}
                onChange={(e) => updateInvestigation('lipidProfile', 'totalCholesterol', e.target.value)}
                placeholder="Total Chol (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lipidProfile.triglycerides}
                onChange={(e) => updateInvestigation('lipidProfile', 'triglycerides', e.target.value)}
                placeholder="TG (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lipidProfile.hdl}
                onChange={(e) => updateInvestigation('lipidProfile', 'hdl', e.target.value)}
                placeholder="HDL (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.lipidProfile.ldl}
                onChange={(e) => updateInvestigation('lipidProfile', 'ldl', e.target.value)}
                placeholder="LDL (mg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* Thyroid Profile */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Thyroid Profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.thyroid.date}
                onChange={(e) => updateInvestigation('thyroid', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.thyroid.tsh}
                onChange={(e) => updateInvestigation('thyroid', 'tsh', e.target.value)}
                placeholder="TSH (μIU/mL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.thyroid.t3}
                onChange={(e) => updateInvestigation('thyroid', 't3', e.target.value)}
                placeholder="T3 (ng/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.thyroid.t4}
                onChange={(e) => updateInvestigation('thyroid', 't4', e.target.value)}
                placeholder="T4 (μg/dL)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* HbA1c */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              HbA1c (Glycated Hemoglobin)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={formData.investigations.hba1c.date}
                onChange={(e) => updateInvestigation('hba1c', 'date', e.target.value)}
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                value={formData.investigations.hba1c.value}
                onChange={(e) => updateInvestigation('hba1c', 'value', e.target.value)}
                placeholder="HbA1c (%)"
                style={{ fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          {/* ECG */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              ECG
            </div>
            <textarea
              value={formData.investigations.ecg}
              onChange={(e) => updateInvestigation('ecg', null, e.target.value)}
              rows="2"
              placeholder="ECG findings: e.g., SR, QS V1-V5"
              style={{ width: '100%', fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>

          {/* Echo */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Echocardiography-Colour Doppler
            </div>
            <textarea
              value={formData.investigations.echo}
              onChange={(e) => updateInvestigation('echo', null, e.target.value)}
              rows="2"
              placeholder="Echo findings: e.g., LAD Hx, Normal Valves, LVEF 50%"
              style={{ width: '100%', fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>

          {/* Other Investigations */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '4px', color: '#1e40af' }}>
              Other Investigations
            </div>
            <textarea
              value={formData.investigations.other}
              onChange={(e) => updateInvestigation('other', null, e.target.value)}
              rows="2"
              placeholder="Any other test results..."
              style={{ width: '100%', fontSize: '9pt', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>
        </div>

        {/* Print Investigation Results */}
        <div className="print-only" style={{ marginBottom: '12px' }}>
          {(hasInvestigationData('kft') || hasInvestigationData('cbc') || hasInvestigationData('rbs') || 
            hasInvestigationData('lft') || hasInvestigationData('lipidProfile') || hasInvestigationData('thyroid') ||
            hasInvestigationData('hba1c') || hasInvestigationData('ecg') || hasInvestigationData('echo') ||
            hasInvestigationData('other')) && (
            <>
              <strong style={{ fontSize: '10.5pt' }}>{t('investigations')}:</strong>
              
              {/* KFT Table */}
              {hasInvestigationData('kft') && (
                <div style={{ marginTop: '8px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '3px' }}>Kidney Function Test KFT</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>Kidney Function Test KFT</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>S. Uric acid</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>Blood Urea</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>S Creatinine</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.kft.date ? format(new Date(formData.investigations.kft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.kft.uricAcid ? `${formData.investigations.kft.uricAcid} mg/dL` : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.kft.bloodUrea ? `${formData.investigations.kft.bloodUrea} mg/dl` : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.kft.creatinine ? `${formData.investigations.kft.creatinine} mg/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* CBC Table */}
              {hasInvestigationData('cbc') && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '3px' }}>CBC - Complete Blood Count</div>
                  <table style={{ width: '60%', borderCollapse: 'collapse', fontSize: '9.5pt', border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>CBC - Complete Blood Count</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>Hemoglobin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.cbc.date ? format(new Date(formData.investigations.cbc.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.cbc.hemoglobin ? `${formData.investigations.cbc.hemoglobin} g/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* RBS Table */}
              {hasInvestigationData('rbs') && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '3px' }}>RBS (Random Blood Sugar)</div>
                  <table style={{ width: '60%', borderCollapse: 'collapse', fontSize: '9.5pt', border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>RBS (Random Blood Sugar)</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>Random Blood Sugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.rbs.date ? format(new Date(formData.investigations.rbs.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.rbs.value ? `${formData.investigations.rbs.value} mg/dL` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* LFT Table */}
              {hasInvestigationData('lft') && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', fontSize: '10pt', marginBottom: '3px' }}>Liver Function Test LFT</div>
                  <table style={{ width: '70%', borderCollapse: 'collapse', fontSize: '9.5pt', border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>Liver Function Test LFT</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>SGPT (ALT)</th>
                        <th style={{ padding: '4px', textAlign: 'left', border: '1px solid #000' }}>SGOT (AST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.lft.date ? format(new Date(formData.investigations.lft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.lft.sgpt ? `${formData.investigations.lft.sgpt} U/L` : ''}</td>
                        <td style={{ padding: '4px', border: '1px solid #000' }}>{formData.investigations.lft.sgot ? `${formData.investigations.lft.sgot} U/L` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* ECG */}
              {formData.investigations.ecg && (
                <div style={{ marginBottom: '8px', fontSize: '10pt' }}>
                  <strong>ECG:</strong> {formData.investigations.ecg}
                </div>
              )}

              {/* Echo */}
              {formData.investigations.echo && (
                <div style={{ marginBottom: '8px', fontSize: '10pt' }}>
                  <strong>Echocardiography-Colour Doppler:</strong> {formData.investigations.echo}
                </div>
              )}

              {/* Other */}
              {formData.investigations.other && (
                <div style={{ marginBottom: '8px', fontSize: '10pt' }}>
                  {formData.investigations.other}
                </div>
              )}
            </>
          )}
        </div>

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
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '70px' }}>{t('duration')}</th>
                  <th style={{ padding: '5px 3px', textAlign: 'left', width: '90px' }}>{t('instructions')}</th>
                  <th className="no-print" style={{ padding: '5px 3px', width: '35px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.medications.map((med, index) => (
                  <React.Fragment key={med.id}>
                    {/* Edit Mode */}
                    <tr className="no-print" style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 3px', verticalAlign: 'top' }}><strong>{index + 1}</strong></td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                          placeholder="Tablet Clavix AS (75 & 150)"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                        <input
                          type="text"
                          value={med.genericName}
                          onChange={(e) => updateMedication(med.id, 'genericName', e.target.value)}
                          placeholder="Clopidogrel 75mg + Aspirin 150mg"
                          className="w-full px-2 py-1 border rounded mt-1"
                          style={{ fontSize: '9pt', color: '#666' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                          placeholder="1 tablet - दिन में एक बार"
                          className="w-full px-2 py-1 border rounded"
                          style={{ fontSize: '10pt' }}
                        />
                      </td>
                      <td style={{ padding: '8px 3px' }}>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
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

                    {/* Print Mode */}
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
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.frequency}</td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.duration}</td>
                      <td style={{ padding: '5px 3px', verticalAlign: 'top' }}>{med.instructions}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Add Medication Buttons */}
          <div className="no-print" style={{ marginTop: '12px' }}>
            {showDrugSearch && (
              <div className="mb-4 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    placeholder="Search drug database (Clavix, Atorlip, Bisoheart, Sorbitrate...)..."
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
                    {drugSuggestions.map((drug, idx) => (
                      <button
                        key={idx}
                        onClick={() => addMedication(drug)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <p className="font-semibold text-gray-800">{drug.name} ({drug.dosages.join(', ')})</p>
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
            placeholder="FBS- Fasting Blood Sugar, Fasting Lipid Profile, Liver Function Test LFT..."
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.advisedInvestigations && (
          <div className="print-only" style={{ marginBottom: '12px', fontSize: '10.5pt' }}>
            <strong>{t('advisedInvestigations')}:</strong> {formData.advisedInvestigations}
          </div>
        )}

        {/* Advised Diet - NEW */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            {t('advisedDiet')}:
          </label>
          <textarea
            value={formData.advisedDiet}
            onChange={(e) => setFormData({ ...formData, advisedDiet: e.target.value })}
            rows="2"
            placeholder="Low salt diet, Avoid oily food, High protein diet, etc."
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.advisedDiet && (
          <div className="print-only" style={{ marginBottom: '12px', fontSize: '10.5pt' }}>
            <strong>{t('advisedDiet')}:</strong> {formData.advisedDiet}
          </div>
        )}

        {/* Additional Advice - NEW */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            Additional Advice:
          </label>
          <textarea
            value={formData.additionalAdvice}
            onChange={(e) => setFormData({ ...formData, additionalAdvice: e.target.value })}
            rows="2"
            placeholder="Regular exercise, Quit smoking, Monitor BP daily, etc."
            className="input"
            style={{ width: '100%', fontSize: '10pt', padding: '6px' }}
          />
        </div>
        {formData.additionalAdvice && (
          <div className="print-only" style={{ marginBottom: '12px', fontSize: '10.5pt' }}>
            <strong>Additional Advice:</strong> {formData.additionalAdvice}
          </div>
        )}

        {/* Follow-up Date - NEW */}
        <div className="no-print" style={{ marginBottom: '12px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '10.5pt', display: 'block', marginBottom: '5px' }}>
            Follow-up Date:
          </label>
          <input
            type="date"
            value={formData.followUpDate}
            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            style={{ fontSize: '10pt', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        {formData.followUpDate && (
          <div className="print-only" style={{ marginBottom: '12px', fontSize: '10.5pt' }}>
            <strong>Follow-up Date:</strong> {format(new Date(formData.followUpDate), 'dd-MM-yyyy')}
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
