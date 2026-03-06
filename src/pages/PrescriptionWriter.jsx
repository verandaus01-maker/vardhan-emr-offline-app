import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Printer, Search, Calendar } from 'lucide-react';
import DatabaseService from '../services/database';
import { format } from 'date-fns';

function PrescriptionWriter() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    complaints: '',
    notes: '',
    vitals: {
      pulse: '',
      spo2: '',
      bp: ''
    },
    investigations: {
      kft: { date: '', uricAcid: '', bloodUrea: '', creatinine: '' },
      cbc: { date: '', hemoglobin: '' },
      rbs: { date: '', value: '' },
      lft: { date: '', sgpt: '', sgot: '' },
      ecg: '',
      echo: '',
      other: ''
    },
    diagnosis: '',
    medications: [],
    advisedInvestigations: '',
    nextVisit: ''
  });
  const [saving, setSaving] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);

  // Comprehensive drug database
  const drugDatabase = [
    { name: 'Bisoheart', genericName: 'Bisoprolol', category: 'Beta Blocker', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Ecosprin AV', genericName: 'Aspirin + Atorvastatin', category: 'Antiplatelet + Statin', dosages: ['75/10', '75/20', '75/40'] },
    { name: 'Concor', genericName: 'Bisoprolol', category: 'Beta Blocker', dosages: ['1.25mg', '2.5mg', '5mg'] },
    { name: 'Atorlip', genericName: 'Atorvastatin', category: 'Statin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Clavix AS', genericName: 'Clopidogrel + Aspirin', category: 'Antiplatelet', dosages: ['75/150'] },
    { name: 'Sorbitrate', genericName: 'Isosorbide Dinitrate', category: 'Nitrate', dosages: ['5mg', '10mg'] },
    { name: 'Dytor', genericName: 'Torasemide', category: 'Diuretic', dosages: ['5mg', '10mg', '20mg'] },
    { name: 'Dytor Plus', genericName: 'Torasemide + Spironolactone', category: 'Diuretic', dosages: ['5/50', '10/50'] },
    { name: 'Jardiance', genericName: 'Empagliflozin', category: 'SGLT2 Inhibitor', dosages: ['10mg', '25mg'] },
    { name: 'Dapaglyn', genericName: 'Dapagliflozin', category: 'SGLT2 Inhibitor', dosages: ['5mg', '10mg'] },
    { name: 'Pansec DSR', genericName: 'Pantoprazole + Domperidone', category: 'PPI', dosages: ['40/30mg'] },
    { name: 'K Cor', genericName: 'Nicorandil', category: 'Vasodilator', dosages: ['5mg', '10mg'] },
    { name: 'Klonaz', genericName: 'Clonazepam', category: 'Anxiolytic', dosages: ['0.25mg', '0.5mg'] },
    { name: 'Utiliv', genericName: 'Ursodeoxycholic Acid', category: 'Hepatoprotective', dosages: ['300mg'] }
  ];

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
      timing: ''
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
      alert('कृपया निदान दर्ज करें / Please enter diagnosis');
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
        nextVisit: formData.nextVisit
      };

      await DatabaseService.addPrescription(prescriptionData);

      alert('✅ प्रिस्क्रिप्शन सहेजा गया! / Prescription Saved!');
      navigate(`/patients/${patientId}`);

    } catch (error) {
      console.error('Failed to save:', error);
      alert('सहेजने में विफल / Failed to save prescription');
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
      {/* Controls */}
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
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Prescription Content - PURE WHITE */}
      <div style={{ 
        backgroundColor: '#ffffff',
        padding: '20px 30px',
        minHeight: '297mm',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        
        {/* Patient Info - Aligned properly */}
        <div style={{ 
          borderBottom: '1px solid #000',
          paddingBottom: '6px',
          marginBottom: '10px',
          fontSize: '11pt',
          lineHeight: '1.5'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%' }}><strong>Name:</strong> {patient.name}</td>
                <td style={{ width: '50%', textAlign: 'right' }}><strong>Date:</strong> {format(new Date(), 'dd-MM-yyyy hh:mm a')}</td>
              </tr>
              <tr>
                <td><strong>Age/Sex:</strong> {patient.age}y / {patient.gender?.charAt(0)}</td>
                <td style={{ textAlign: 'right' }}><strong>Mobile:</strong> {patient.phone}</td>
              </tr>
              <tr>
                <td><strong>Office ID:</strong> {patient.uhid}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Symptoms */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Symptoms:</strong>
          <textarea
            value={formData.complaints}
            onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
            rows="2"
            placeholder="Generalised weakness, Chest pain"
            style={{ 
              width: '100%', 
              fontSize: '10.5pt', 
              padding: '4px 6px', 
              border: '1px solid #ccc', 
              borderRadius: '3px',
              marginTop: '3px'
            }}
          />
        </div>
        {formData.complaints && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Symptoms:</strong> {formData.complaints}
          </div>
        )}

        {/* Notes Section - NEW */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Notes:</strong>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows="2"
            placeholder="Clinical notes: Recently admitted with NSTEMI, ECHO—ICMP, Moderate MR, LVEF 40%"
            style={{ 
              width: '100%', 
              fontSize: '10.5pt', 
              padding: '4px 6px', 
              border: '1px solid #ccc', 
              borderRadius: '3px',
              marginTop: '3px'
            }}
          />
        </div>
        {formData.notes && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Notes:</strong> {formData.notes}
          </div>
        )}

        {/* Vitals - Compact */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Vitals:</strong>
          <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
            <input
              type="text"
              value={formData.vitals.pulse}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, pulse: e.target.value }})}
              placeholder="Pulse: 70"
              style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
            <input
              type="text"
              value={formData.vitals.spo2}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value }})}
              placeholder="SPO2: 96"
              style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
            <input
              type="text"
              value={formData.vitals.bp}
              onChange={(e) => setFormData({ ...formData, vitals: { ...formData.vitals, bp: e.target.value }})}
              placeholder="BP: 110/80"
              style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>
        </div>
        {(formData.vitals.pulse || formData.vitals.spo2 || formData.vitals.bp) && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Vitals:</strong> Pulse: {formData.vitals.pulse || '-'} /min, SPO2: {formData.vitals.spo2 || '-'} %, BP: {formData.vitals.bp || '-'} mmHg
          </div>
        )}

        {/* Investigation Results - COMPACT, NO GRAY BACKGROUNDS */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt', display: 'block', marginBottom: '5px' }}>Investigation Results:</strong>

          {/* KFT - Compact */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>Kidney Function Test KFT</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.kft.date} onChange={(e) => updateInvestigation('kft', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.uricAcid} onChange={(e) => updateInvestigation('kft', 'uricAcid', e.target.value)} placeholder="S. Uric acid" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.bloodUrea} onChange={(e) => updateInvestigation('kft', 'bloodUrea', e.target.value)} placeholder="Blood Urea" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.creatinine} onChange={(e) => updateInvestigation('kft', 'creatinine', e.target.value)} placeholder="S Creatinine" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* CBC - Compact */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>CBC - Complete Blood Count</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.cbc.date} onChange={(e) => updateInvestigation('cbc', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.cbc.hemoglobin} onChange={(e) => updateInvestigation('cbc', 'hemoglobin', e.target.value)} placeholder="Hemoglobin" style={{ width: '120px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* RBS - Compact */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>RBS (Random Blood Sugar)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.rbs.date} onChange={(e) => updateInvestigation('rbs', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.rbs.value} onChange={(e) => updateInvestigation('rbs', 'value', e.target.value)} placeholder="Random Blood Sugar" style={{ width: '120px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* LFT - Compact */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>Liver Function Test LFT</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.lft.date} onChange={(e) => updateInvestigation('lft', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lft.sgpt} onChange={(e) => updateInvestigation('lft', 'sgpt', e.target.value)} placeholder="SGPT (ALT)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lft.sgot} onChange={(e) => updateInvestigation('lft', 'sgot', e.target.value)} placeholder="SGOT (AST)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* ECG & Echo - Compact */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>ECG</div>
            <input type="text" value={formData.investigations.ecg} onChange={(e) => updateInvestigation('ecg', null, e.target.value)} placeholder="SR, QS V1-V5" style={{ width: '100%', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>Echocardiography-Colour Doppler</div>
            <input type="text" value={formData.investigations.echo} onChange={(e) => updateInvestigation('echo', null, e.target.value)} placeholder="LAD Hx, Normal Valves, LVEF 50%" style={{ width: '100%', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
          </div>
        </div>

        {/* Print Investigation Results - CLEAN, NO GRAY */}
        <div className="print-only" style={{ marginBottom: '8px' }}>
          {(hasInvestigationData('kft') || hasInvestigationData('cbc') || hasInvestigationData('rbs') || 
            hasInvestigationData('lft') || hasInvestigationData('ecg') || hasInvestigationData('echo')) && (
            <>
              <strong style={{ fontSize: '11pt', display: 'block', marginBottom: '4px' }}>Investigation Results:</strong>
              
              {hasInvestigationData('kft') && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>Kidney Function Test KFT</div>
                  <table style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>Kidney Function Test KFT</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>S. Uric acid</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>Blood Urea</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>S Creatinine</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.date ? format(new Date(formData.investigations.kft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.uricAcid ? `${formData.investigations.kft.uricAcid} mg/dL` : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.bloodUrea ? `${formData.investigations.kft.bloodUrea} mg/dl` : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.creatinine ? `${formData.investigations.kft.creatinine} mg/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('cbc') && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>CBC - Complete Blood Count</div>
                  <table style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>CBC - Complete Blood Count</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>Hemoglobin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.date ? format(new Date(formData.investigations.cbc.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.hemoglobin ? `${formData.investigations.cbc.hemoglobin} g/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('rbs') && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>RBS (Random Blood Sugar)</div>
                  <table style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>RBS (Random Blood Sugar)</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>Random Blood Sugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.rbs.date ? format(new Date(formData.investigations.rbs.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.rbs.value ? `${formData.investigations.rbs.value} mg/dl` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {hasInvestigationData('lft') && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ fontSize: '10pt', fontWeight: '600', marginBottom: '2px' }}>Liver Function Test LFT</div>
                  <table style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>Liver Function Test LFT</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>SGPT (ALT)</th>
                        <th style={{ padding: '3px 6px', border: '1px solid #000', textAlign: 'left' }}>SGOT (AST)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.date ? format(new Date(formData.investigations.lft.date), 'dd-MM-yyyy') : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.sgpt ? `${formData.investigations.lft.sgpt} U/L` : ''}</td>
                        <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.sgot ? `${formData.investigations.lft.sgot} U/L` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {formData.investigations.ecg && (
                <div style={{ fontSize: '10pt', marginBottom: '4px' }}>
                  <strong>ECG:</strong> {formData.investigations.ecg}
                </div>
              )}

              {formData.investigations.echo && (
                <div style={{ fontSize: '10pt', marginBottom: '4px' }}>
                  <strong>Echocardiography-Colour Doppler:</strong> {formData.investigations.echo}
                </div>
              )}
            </>
          )}
        </div>

        {/* Diagnosis */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Diagnosis: *</strong>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="IHD/NSTEMI/Moderate LVD/SR/HTN"
            required
            style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }}
          />
        </div>
        {formData.diagnosis && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Diagnosis:</strong> {formData.diagnosis}
          </div>
        )}

        {/* Medications Table - HINDI, NO GRAY, COMPACT */}
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          {formData.medications.length > 0 && (
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10.5pt',
              border: '1px solid #000'
            }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'center', width: '30px' }}>Rx</th>
                  <th style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'left' }}>नाम</th>
                  <th style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'center', width: '140px' }}>आवृत्ति</th>
                  <th style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'center', width: '70px' }}>अवधि</th>
                  <th style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'center', width: '100px' }}>टिप्पणियाँ</th>
                  <th className="no-print" style={{ padding: '4px', border: '1px solid #000', width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.medications.map((med, index) => (
                  <React.Fragment key={med.id}>
                    {/* Edit Mode */}
                    <tr className="no-print">
                      <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                          placeholder="Tablet Bisoheart (2.5mg)"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', marginBottom: '2px' }}
                        />
                        <input
                          type="text"
                          value={med.genericName}
                          onChange={(e) => updateMedication(med.id, 'genericName', e.target.value)}
                          placeholder="Bisoprolol"
                          style={{ width: '100%', border: 'none', fontSize: '9pt', color: '#555', padding: '2px', fontStyle: 'italic' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                          placeholder="1 tablet - दिन में एक बार"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                          placeholder="15 दिन"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000' }}>
                        <input
                          type="text"
                          value={med.timing}
                          onChange={(e) => updateMedication(med.id, 'timing', e.target.value)}
                          placeholder="सोने से पहले"
                          style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center' }}>
                        <button onClick={() => removeMedication(med.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                          <X style={{ width: '16px', height: '16px' }} />
                        </button>
                      </td>
                    </tr>

                    {/* Print Mode */}
                    <tr className="print-only">
                      <td style={{ padding: '4px 6px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', fontSize: '10.5pt' }}>{med.drugName}</div>
                        {med.genericName && <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginTop: '1px' }}>{med.genericName}</div>}
                      </td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'top', textAlign: 'center' }}>{med.frequency}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'top', textAlign: 'center' }}>{med.duration}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'top', textAlign: 'center' }}>{med.timing}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Add Medication - Improved */}
          <div className="no-print" style={{ marginTop: '10px' }}>
            {showDrugSearch && (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#999', width: '18px', height: '18px' }} />
                  <input
                    type="text"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    placeholder="खोजें: Bisoheart, Ecosprin, Concor..."
                    autoFocus
                    style={{ 
                      width: '100%', 
                      paddingLeft: '35px', 
                      paddingRight: '35px', 
                      padding: '8px',
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
                          borderBottom: idx < drugSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
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
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <Search style={{ width: '16px', height: '16px' }} />
                  <span>दवा खोजें</span>
                </button>
                <span style={{ color: '#9ca3af' }}>या</span>
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
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  <span>मैन्युअल रूप से जोड़ें</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advised Investigations */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Advised Investigations:</strong>
          <input
            type="text"
            value={formData.advisedInvestigations}
            onChange={(e) => setFormData({ ...formData, advisedInvestigations: e.target.value })}
            placeholder="Exercise regularly"
            style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }}
          />
        </div>
        {formData.advisedInvestigations && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Advised Investigations:</strong> {formData.advisedInvestigations}
          </div>
        )}

        {/* Next Visit - NEW USP */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Next Visit:</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
            <Calendar style={{ width: '18px', height: '18px', color: '#6b7280' }} />
            <input
              type="date"
              value={formData.nextVisit}
              onChange={(e) => setFormData({ ...formData, nextVisit: e.target.value })}
              style={{ fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px' }}
            />
          </div>
        </div>
        {formData.nextVisit && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Next Visit:</strong> {format(new Date(formData.nextVisit), 'dd-MM-yyyy')}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrescriptionWriter;
