import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, Printer, Search, Lock, CheckCircle } from 'lucide-react';
import DatabaseService from '../services/database';
import authService from '../services/authService';
import { format } from 'date-fns';

function PrescriptionWriter() {
  const { patientId, prescriptionId } = useParams();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isDoctor = currentUser?.role === 'doctor' || currentUser?.role === 'admin';
  const [patient, setPatient] = useState(null);
  const [existingPrescription, setExistingPrescription] = useState(null);
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
      cbc: { date: '', hemoglobin: '', tlc: '', platelets: '' },
      fbs: { date: '', value: '' },
      rbs: { date: '', value: '' },
      ppbs: { date: '', value: '' },
      hba1c: { date: '', value: '' },
      lft: { date: '', sgpt: '', sgot: '', totalBilirubin: '' },
      lipid: { date: '', totalCholesterol: '', ldl: '', hdl: '', triglycerides: '', vldl: '' },
      tsh: { date: '', value: '' },
      thyroidFull: { date: '', tsh: '', t3: '', t4: '' },
      bnp: { date: '', value: '' },
      electrolytes: { date: '', sodium: '', potassium: '', chloride: '' },
      enzymes: { date: '', ck: '', ckmb: '', troponin: '' },
      bloodGlucose: { date: '', fasting: '', postMeal: '' },
      ecg: '',
      echo: '',
      tmt: '',
      echoColourDoppler: ''
    },
    diagnosis: '',
    medications: [],
    advisedInvestigations: ''
  });
  const [saving, setSaving] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);

  // ═══════════════════════════════════════════════════
  // COMPREHENSIVE CARDIOLOGY DRUG DATABASE
  // ═══════════════════════════════════════════════════
  const drugDatabase = [
    // ── ANTIPLATELETS ──
    { name: 'Ecosprin', genericName: 'Aspirin', dosages: ['75mg', '150mg', '325mg'] },
    { name: 'Ecosprin AV', genericName: 'Aspirin + Atorvastatin', dosages: ['75/10', '75/20', '75/40'] },
    { name: 'Clopivas', genericName: 'Clopidogrel', dosages: ['75mg'] },
    { name: 'Clavix', genericName: 'Clopidogrel', dosages: ['75mg', '150mg'] },
    { name: 'Clavix AS', genericName: 'Clopidogrel + Aspirin', dosages: ['75/75', '75/150'] },
    { name: 'Deplatt A', genericName: 'Clopidogrel + Aspirin', dosages: ['75/75', '75/150'] },
    { name: 'Prasugrel', genericName: 'Prasugrel', dosages: ['5mg', '10mg'] },
    { name: 'Effient', genericName: 'Prasugrel', dosages: ['5mg', '10mg'] },
    { name: 'Brilinta', genericName: 'Ticagrelor', dosages: ['60mg', '90mg'] },
    { name: 'Ticagrelor', genericName: 'Ticagrelor', dosages: ['60mg', '90mg'] },

    // ── BETA BLOCKERS ──
    { name: 'Concor', genericName: 'Bisoprolol', dosages: ['1.25mg', '2.5mg', '5mg', '10mg'] },
    { name: 'Bisoheart', genericName: 'Bisoprolol', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Biselect', genericName: 'Bisoprolol', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Metolar XR', genericName: 'Metoprolol Succinate', dosages: ['12.5mg', '25mg', '50mg', '100mg'] },
    { name: 'Metosartan', genericName: 'Metoprolol', dosages: ['25mg', '50mg'] },
    { name: 'Aten', genericName: 'Atenolol', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Tenolol', genericName: 'Atenolol', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Carvedilol', genericName: 'Carvedilol', dosages: ['3.125mg', '6.25mg', '12.5mg', '25mg'] },
    { name: 'Cardivas', genericName: 'Carvedilol', dosages: ['3.125mg', '6.25mg', '12.5mg', '25mg'] },
    { name: 'Nebicard', genericName: 'Nebivolol', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Nebilong', genericName: 'Nebivolol', dosages: ['2.5mg', '5mg'] },
    { name: 'Propranolol', genericName: 'Propranolol', dosages: ['10mg', '20mg', '40mg', '80mg'] },

    // ── STATINS / LIPID LOWERING ──
    { name: 'Atorlip', genericName: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Lipitor', genericName: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Storvas', genericName: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Rosuvas', genericName: 'Rosuvastatin', dosages: ['5mg', '10mg', '20mg', '40mg'] },
    { name: 'Crestor', genericName: 'Rosuvastatin', dosages: ['5mg', '10mg', '20mg', '40mg'] },
    { name: 'Rozavel', genericName: 'Rosuvastatin', dosages: ['5mg', '10mg', '20mg', '40mg'] },
    { name: 'Pitavastatin', genericName: 'Pitavastatin', dosages: ['1mg', '2mg', '4mg'] },
    { name: 'Liponorm', genericName: 'Pravastatin', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Ezetrol', genericName: 'Ezetimibe', dosages: ['10mg'] },
    { name: 'Ezentia', genericName: 'Ezetimibe', dosages: ['10mg'] },
    { name: 'Rosuchek EZ', genericName: 'Rosuvastatin + Ezetimibe', dosages: ['10/10', '20/10'] },
    { name: 'Fenofibrate', genericName: 'Fenofibrate', dosages: ['67mg', '145mg', '160mg'] },
    { name: 'Tricor', genericName: 'Fenofibrate', dosages: ['145mg'] },

    // ── ACE INHIBITORS ──
    { name: 'Ramipril', genericName: 'Ramipril', dosages: ['1.25mg', '2.5mg', '5mg', '10mg'] },
    { name: 'Cardace', genericName: 'Ramipril', dosages: ['1.25mg', '2.5mg', '5mg', '10mg'] },
    { name: 'Hopace', genericName: 'Ramipril', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Lisinopril', genericName: 'Lisinopril', dosages: ['2.5mg', '5mg', '10mg', '20mg'] },
    { name: 'Listril', genericName: 'Lisinopril', dosages: ['2.5mg', '5mg', '10mg', '20mg'] },
    { name: 'Enalapril', genericName: 'Enalapril', dosages: ['2.5mg', '5mg', '10mg', '20mg'] },
    { name: 'Envas', genericName: 'Enalapril', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Perindopril', genericName: 'Perindopril', dosages: ['2mg', '4mg', '8mg'] },
    { name: 'Coversyl', genericName: 'Perindopril', dosages: ['2mg', '4mg', '8mg'] },
    { name: 'Fosinopril', genericName: 'Fosinopril', dosages: ['10mg', '20mg'] },

    // ── ARBs (Angiotensin Receptor Blockers) ──
    { name: 'Telma', genericName: 'Telmisartan', dosages: ['20mg', '40mg', '80mg'] },
    { name: 'Telmikind', genericName: 'Telmisartan', dosages: ['20mg', '40mg', '80mg'] },
    { name: 'Telvas', genericName: 'Telmisartan', dosages: ['40mg', '80mg'] },
    { name: 'Telma H', genericName: 'Telmisartan + Hydrochlorothiazide', dosages: ['40/12.5', '80/12.5', '80/25'] },
    { name: 'Losartan', genericName: 'Losartan', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Repace', genericName: 'Losartan', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Losartan H', genericName: 'Losartan + Hydrochlorothiazide', dosages: ['50/12.5', '100/12.5'] },
    { name: 'Olmesar', genericName: 'Olmesartan', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Olmin', genericName: 'Olmesartan', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Valsartan', genericName: 'Valsartan', dosages: ['40mg', '80mg', '160mg', '320mg'] },
    { name: 'Valzaar', genericName: 'Valsartan', dosages: ['40mg', '80mg', '160mg'] },
    { name: 'Irbesartan', genericName: 'Irbesartan', dosages: ['75mg', '150mg', '300mg'] },
    { name: 'Candesartan', genericName: 'Candesartan', dosages: ['4mg', '8mg', '16mg', '32mg'] },

    // ── ARNi (Sacubitril + Valsartan) ──
    { name: 'Vymada', genericName: 'Sacubitril + Valsartan', dosages: ['24/26mg', '49/51mg', '97/103mg'] },
    { name: 'Sacuval', genericName: 'Sacubitril + Valsartan', dosages: ['24/26mg', '49/51mg', '97/103mg'] },

    // ── CALCIUM CHANNEL BLOCKERS ──
    { name: 'Amlodipine', genericName: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Amlokind', genericName: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Stamlo', genericName: 'Amlodipine', dosages: ['5mg', '10mg'] },
    { name: 'Norvasc', genericName: 'Amlodipine', dosages: ['5mg', '10mg'] },
    { name: 'Dilzem', genericName: 'Diltiazem', dosages: ['30mg', '60mg', '90mg', '120mg'] },
    { name: 'Diltiazem CD', genericName: 'Diltiazem', dosages: ['90mg', '120mg', '180mg', '240mg'] },
    { name: 'Verapamil', genericName: 'Verapamil', dosages: ['40mg', '80mg', '120mg'] },
    { name: 'Nifedipine', genericName: 'Nifedipine', dosages: ['5mg', '10mg', '30mg', '60mg'] },
    { name: 'Felodipine', genericName: 'Felodipine', dosages: ['2.5mg', '5mg', '10mg'] },

    // ── DIURETICS ──
    { name: 'Dytor', genericName: 'Torasemide', dosages: ['5mg', '10mg', '20mg', '40mg', '100mg'] },
    { name: 'Dytor Plus', genericName: 'Torasemide + Spironolactone', dosages: ['5/50', '10/50'] },
    { name: 'Lasix', genericName: 'Furosemide', dosages: ['20mg', '40mg', '80mg'] },
    { name: 'Frusenex', genericName: 'Furosemide', dosages: ['40mg', '100mg'] },
    { name: 'Aldactone', genericName: 'Spironolactone', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Lasilactone', genericName: 'Furosemide + Spironolactone', dosages: ['20/50'] },
    { name: 'Eplerenone', genericName: 'Eplerenone', dosages: ['25mg', '50mg'] },
    { name: 'Inspra', genericName: 'Eplerenone', dosages: ['25mg', '50mg'] },
    { name: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', dosages: ['12.5mg', '25mg'] },
    { name: 'Indapamide', genericName: 'Indapamide', dosages: ['1.5mg', '2.5mg'] },
    { name: 'Zaroxolyn', genericName: 'Metolazone', dosages: ['2.5mg', '5mg'] },

    // ── NITRATES ──
    { name: 'Sorbitrate', genericName: 'Isosorbide Dinitrate', dosages: ['5mg', '10mg', '20mg'] },
    { name: 'Imdur', genericName: 'Isosorbide Mononitrate', dosages: ['20mg', '30mg', '60mg'] },
    { name: 'Ismo', genericName: 'Isosorbide Mononitrate', dosages: ['20mg', '40mg'] },
    { name: 'Nitrocontin', genericName: 'Nitroglycerin', dosages: ['2.6mg', '6.4mg'] },
    { name: 'Nitroglyn', genericName: 'Nitroglycerin Sublingual', dosages: ['0.5mg'] },

    // ── ANTI-ANGINALS / OTHERS ──
    { name: 'K Cor', genericName: 'Nicorandil', dosages: ['5mg', '10mg'] },
    { name: 'Nicoran', genericName: 'Nicorandil', dosages: ['5mg', '10mg'] },
    { name: 'Cytogard MR', genericName: 'Trimetazidine', dosages: ['35mg'] },
    { name: 'Vastarel MR', genericName: 'Trimetazidine', dosages: ['35mg'] },
    { name: 'Ivabrad', genericName: 'Ivabradine', dosages: ['5mg', '7.5mg'] },
    { name: 'Procoralan', genericName: 'Ivabradine', dosages: ['5mg', '7.5mg'] },
    { name: 'Ranolazine', genericName: 'Ranolazine', dosages: ['375mg', '500mg', '750mg'] },
    { name: 'Ranexa', genericName: 'Ranolazine', dosages: ['500mg', '1000mg'] },

    // ── ANTICOAGULANTS ──
    { name: 'Acitrom', genericName: 'Acenocoumarol', dosages: ['1mg', '2mg', '4mg'] },
    { name: 'Warfarin', genericName: 'Warfarin', dosages: ['1mg', '2mg', '5mg'] },
    { name: 'Warf', genericName: 'Warfarin', dosages: ['1mg', '2mg', '5mg'] },
    { name: 'Xarelto', genericName: 'Rivaroxaban', dosages: ['2.5mg', '10mg', '15mg', '20mg'] },
    { name: 'Rivaroxaban', genericName: 'Rivaroxaban', dosages: ['10mg', '15mg', '20mg'] },
    { name: 'Eliquis', genericName: 'Apixaban', dosages: ['2.5mg', '5mg'] },
    { name: 'Apixaban', genericName: 'Apixaban', dosages: ['2.5mg', '5mg'] },
    { name: 'Pradaxa', genericName: 'Dabigatran', dosages: ['75mg', '110mg', '150mg'] },
    { name: 'Dabigatran', genericName: 'Dabigatran', dosages: ['75mg', '110mg', '150mg'] },

    // ── SGLT2 INHIBITORS (Cardio-protective) ──
    { name: 'Jardiance', genericName: 'Empagliflozin', dosages: ['10mg', '25mg'] },
    { name: 'Dapaglyn', genericName: 'Dapagliflozin', dosages: ['5mg', '10mg'] },
    { name: 'Forxiga', genericName: 'Dapagliflozin', dosages: ['5mg', '10mg'] },
    { name: 'Farxiga', genericName: 'Dapagliflozin', dosages: ['10mg'] },
    { name: 'Canagliflozin', genericName: 'Canagliflozin', dosages: ['100mg', '300mg'] },
    { name: 'Invokana', genericName: 'Canagliflozin', dosages: ['100mg', '300mg'] },

    // ── ANTIARRHYTHMICS ──
    { name: 'Amiodarone', genericName: 'Amiodarone', dosages: ['100mg', '200mg'] },
    { name: 'Cordarone', genericName: 'Amiodarone', dosages: ['100mg', '200mg'] },
    { name: 'Tenvir', genericName: 'Amiodarone', dosages: ['200mg'] },
    { name: 'Mexitil', genericName: 'Mexiletine', dosages: ['150mg', '200mg'] },
    { name: 'Digoxin', genericName: 'Digoxin', dosages: ['0.125mg', '0.25mg'] },
    { name: 'Lanoxin', genericName: 'Digoxin', dosages: ['0.125mg', '0.25mg'] },
    { name: 'Flecainide', genericName: 'Flecainide', dosages: ['50mg', '100mg', '150mg'] },

    // ── ANTIHYPERTENSIVES (Combined) ──
    { name: 'Stamlo Beta', genericName: 'Amlodipine + Atenolol', dosages: ['5/25', '5/50'] },
    { name: 'Amlopin AT', genericName: 'Amlodipine + Atenolol', dosages: ['5/25', '5/50'] },
    { name: 'Twynsta', genericName: 'Telmisartan + Amlodipine', dosages: ['40/5', '80/5', '80/10'] },
    { name: 'Telma AM', genericName: 'Telmisartan + Amlodipine', dosages: ['40/5', '80/5'] },
    { name: 'Exforge', genericName: 'Valsartan + Amlodipine', dosages: ['80/5', '160/5', '160/10'] },
    { name: 'Sevikar', genericName: 'Olmesartan + Amlodipine', dosages: ['20/5', '40/5', '40/10'] },
    { name: 'Co-Diovan', genericName: 'Valsartan + HCTZ', dosages: ['80/12.5', '160/12.5', '160/25'] },
    { name: 'Clonidine', genericName: 'Clonidine', dosages: ['0.1mg', '0.2mg', '0.3mg'] },
    { name: 'Catapres', genericName: 'Clonidine', dosages: ['0.1mg', '0.2mg'] },
    { name: 'Prazosin', genericName: 'Prazosin', dosages: ['1mg', '2mg', '5mg'] },
    { name: 'Minipress', genericName: 'Prazosin', dosages: ['1mg', '2mg', '5mg'] },
    { name: 'Doxazosin', genericName: 'Doxazosin', dosages: ['1mg', '2mg', '4mg'] },

    // ── HEART FAILURE SPECIFIC ──
    { name: 'Vymada', genericName: 'Sacubitril + Valsartan (ARNI)', dosages: ['24/26mg', '49/51mg', '97/103mg'] },
    { name: 'Entresto', genericName: 'Sacubitril + Valsartan', dosages: ['24/26mg', '49/51mg'] },
    { name: 'Digoxin', genericName: 'Digoxin', dosages: ['0.125mg', '0.25mg'] },
    { name: 'Dopamine', genericName: 'Dopamine', dosages: ['200mg/5ml'] },

    // ── GASTROPROTECTIVES ──
    { name: 'Pansec DSR', genericName: 'Pantoprazole + Domperidone', dosages: ['40/30mg'] },
    { name: 'Pan D', genericName: 'Pantoprazole + Domperidone', dosages: ['40/10mg'] },
    { name: 'Pantop', genericName: 'Pantoprazole', dosages: ['20mg', '40mg'] },
    { name: 'Nexpro', genericName: 'Esomeprazole', dosages: ['20mg', '40mg'] },
    { name: 'Nexium', genericName: 'Esomeprazole', dosages: ['20mg', '40mg'] },
    { name: 'Omez', genericName: 'Omeprazole', dosages: ['10mg', '20mg', '40mg'] },
    { name: 'Razo', genericName: 'Rabeprazole', dosages: ['10mg', '20mg'] },

    // ── DIABETES (Cardio-relevant) ──
    { name: 'Glycomet', genericName: 'Metformin', dosages: ['500mg', '850mg', '1000mg'] },
    { name: 'Glucophage', genericName: 'Metformin', dosages: ['500mg', '1000mg'] },
    { name: 'Januvia', genericName: 'Sitagliptin', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Galvus', genericName: 'Vildagliptin', dosages: ['50mg'] },
    { name: 'Trajenta', genericName: 'Linagliptin', dosages: ['5mg'] },
    { name: 'Onglyza', genericName: 'Saxagliptin', dosages: ['2.5mg', '5mg'] },
    { name: 'Victoza', genericName: 'Liraglutide', dosages: ['0.6mg', '1.2mg', '1.8mg'] },
    { name: 'Ozempic', genericName: 'Semaglutide', dosages: ['0.25mg', '0.5mg', '1mg'] },

    // ── THYROID ──
    { name: 'Thyronorm', genericName: 'Levothyroxine', dosages: ['12.5mcg', '25mcg', '50mcg', '75mcg', '100mcg'] },
    { name: 'Eltroxin', genericName: 'Levothyroxine', dosages: ['25mcg', '50mcg', '100mcg'] },
    { name: 'Neomercazole', genericName: 'Carbimazole', dosages: ['5mg', '10mg', '20mg'] },

    // ── SUPPLEMENTS / SUPPORTIVE ──
    { name: 'Shelcal', genericName: 'Calcium + Vitamin D3', dosages: ['500mg'] },
    { name: 'Calcirol', genericName: 'Cholecalciferol (Vit D3)', dosages: ['60000IU'] },
    { name: 'Becosules', genericName: 'Vitamin B-Complex', dosages: ['1 capsule'] },
    { name: 'Folvite', genericName: 'Folic Acid', dosages: ['5mg'] },
    { name: 'Tonoferon', genericName: 'Iron + Folic Acid', dosages: ['1 capsule'] },
    { name: 'Orofer XT', genericName: 'Ferrous Ascorbate + Folic Acid', dosages: ['1 tablet'] },
    { name: 'Neurobion Forte', genericName: 'Vit B1+B6+B12', dosages: ['1 tablet'] },
    { name: 'Evion', genericName: 'Vitamin E', dosages: ['200mg', '400mg'] },
    { name: 'Zincovit', genericName: 'Zinc + Multivitamin', dosages: ['1 tablet'] },
    { name: 'Clexane', genericName: 'Enoxaparin', dosages: ['40mg', '60mg', '80mg'] },
    { name: 'Lonopin', genericName: 'Enoxaparin', dosages: ['40mg', '60mg'] },

    // ── SEDATIVES / ANXIOLYTICS ──
    { name: 'Klonaz', genericName: 'Clonazepam', dosages: ['0.25mg', '0.5mg', '1mg'] },
    { name: 'Alprax', genericName: 'Alprazolam', dosages: ['0.25mg', '0.5mg'] },
    { name: 'Restyl', genericName: 'Alprazolam', dosages: ['0.25mg', '0.5mg'] },
    { name: 'Nitrazepam', genericName: 'Nitrazepam', dosages: ['5mg', '10mg'] },
    { name: 'Calmpose', genericName: 'Diazepam', dosages: ['2mg', '5mg', '10mg'] },

    // ── ANALGESICS / ANTI-INFLAMMATORY ──
    { name: 'Calpol', genericName: 'Paracetamol', dosages: ['325mg', '500mg', '650mg'] },
    { name: 'Dolo', genericName: 'Paracetamol', dosages: ['500mg', '650mg'] },
    { name: 'Voveran', genericName: 'Diclofenac', dosages: ['25mg', '50mg'] },

    // ── HEPATO-PROTECTIVE ──
    { name: 'Utiliv', genericName: 'Ursodeoxycholic Acid', dosages: ['150mg', '300mg'] },
    { name: 'Udiliv', genericName: 'Ursodeoxycholic Acid', dosages: ['150mg', '300mg'] },
    { name: 'Livolin Forte', genericName: 'Phospholipids + Vit B', dosages: ['1 capsule'] },
  ];

  // FIX: Enhanced English to Hindi translation mapping
  const translateToHindi = (text) => {
    if (!text) return '';

    const translations = {
      // Frequency
      'once a day': 'दिन में एक बार',
      'twice a day': 'दिन में दो बार',
      'thrice a day': 'दिन में तीन बार',
      'once daily': 'दिन में एक बार',
      'twice daily': 'दिन में दो बार',
      'three times a day': 'दिन में तीन बार',
      '1 time a day': 'दिन में एक बार',
      '2 times a day': 'दिन में दो बार',
      '3 times a day': 'दिन में तीन बार',
      '1 tablet - once a day': '1 tablet - दिन में एक बार',
      '1 tablet - twice a day': '1 tablet - दिन में दो बार',
      '1 tablet - thrice a day': '1 tablet - दिन में तीन बार',
      '1 time': 'एक बार',
      '2 times': 'दो बार',
      '3 times': 'तीन बार',
      'once': 'एक बार',
      'twice': 'दो बार',
      'thrice': 'तीन बार',

      // Duration
      '1 day': '1 दिन',
      '2 days': '2 दिन',
      '3 days': '3 दिन',
      '5 days': '5 दिन',
      '7 days': '7 दिन',
      '10 days': '10 दिन',
      '14 days': '14 दिन',
      '15 days': '15 दिन',
      '20 days': '20 दिन',
      '30 days': '30 दिन',
      '1 month': '1 महीने',
      '2 months': '2 महीने',
      '3 months': '3 महीने',
      '6 months': '6 महीने',
      '1 week': '1 सप्ताह',
      '2 weeks': '2 सप्ताह',
      'days': 'दिन',
      'day': 'दिन',
      'weeks': 'सप्ताह',
      'week': 'सप्ताह',
      'months': 'महीने',
      'month': 'महीने',

      // ---- TIMING (5th column) ---- FIX: these were not translating
      'before sleep': 'सोने से पहले',
      'before bed': 'सोने से पहले',
      'at bedtime': 'सोने से पहले',
      'after sleep': 'सोने के बाद',
      'before food': 'खाने से पहले',
      'after food': 'खाने के बाद',
      'before meals': 'खाने से पहले',
      'after meals': 'खाने के बाद',
      'with food': 'खाने के साथ',
      'with meals': 'खाने के साथ',
      'empty stomach': 'खाली पेट',
      'morning': 'सुबह',
      'afternoon': 'दोपहर',
      'evening': 'शाम',
      'night': 'रात',
      'sublingual': 'जुबान के नीचे',
      'as needed': 'जरूरत पड़ने पर',
      'when required': 'जरूरत पड़ने पर',
      'sos': 'जरूरत पड़ने पर',
    };

    let translated = text.trim();

    // Replace full phrases first (longest first to avoid partial replacements)
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    sortedKeys.forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      translated = translated.replace(regex, translations[key]);
    });

    return translated;
  };

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  useEffect(() => {
    if (prescriptionId) {
      loadExistingPrescription();
    }
  }, [prescriptionId]);

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

  const loadExistingPrescription = async () => {
    const rx = await DatabaseService.getPrescription(parseInt(prescriptionId));
    if (!rx) return;
    setExistingPrescription(rx);
    // Pre-fill form with saved data
    const parseJSON = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return fallback; }
    };
    setFormData({
      complaints: rx.complaints || '',
      notes: rx.notes || '',
      vitals: parseJSON(rx.vitals, { pulse: '', spo2: '', bp: '' }),
      investigations: parseJSON(rx.investigations, formData.investigations),
      diagnosis: rx.diagnosis || '',
      medications: parseJSON(rx.medications, []),
      advisedInvestigations: rx.advisedInvestigations || '',
      nextVisit: rx.nextVisit || ''
    });
  };

  const searchDrugsLocal = () => {
    const searchLower = drugSearch.toLowerCase();
    const results = drugDatabase.filter(drug =>
      drug.name.toLowerCase().includes(searchLower) ||
      drug.genericName.toLowerCase().includes(searchLower)
    ).slice(0, 10);
    setDrugSuggestions(results);
  };

  const addMedication = (drug = null) => {
    const newMed = {
      id: Date.now(),
      drugName: drug ? `Tablet ${drug.name} (${drug.dosages[0]})` : '',
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
    // Doctor must enter diagnosis before completing
    if (isDoctor && !formData.diagnosis) {
      alert('Please enter diagnosis before completing');
      return;
    }

    setSaving(true);

    try {
      const isDraft = existingPrescription?.status === 'staff_draft';

      if (!isDoctor) {
        // Stage 1 — staff saves a draft
        const prescriptionData = {
          patientId: parseInt(patientId),
          uhid: patient.uhid,
          date: new Date().toISOString(),
          doctorId: null,
          complaints: '',
          notes: '',
          vitals: formData.vitals,
          investigations: { ...formData.investigations, ecg: '', echo: '', tmt: '', echoColourDoppler: '' },
          diagnosis: '',
          advisedInvestigations: '',
          nextVisit: '',
          medications: [],
          status: 'staff_draft'
        };
        if (existingPrescription) {
          await DatabaseService.updatePrescription(existingPrescription.id, prescriptionData);
        } else {
          await DatabaseService.addPrescription(prescriptionData);
        }
        alert('✅ Saved! Waiting for Doctor to complete.');
        navigate(`/patients/${patientId}`);

      } else {
        // Stage 2 — doctor completes
        const prescriptionData = {
          patientId: parseInt(patientId),
          uhid: patient.uhid,
          date: existingPrescription?.date || new Date().toISOString(),
          doctorId: currentUser?.id || 1,
          complaints: formData.complaints,
          notes: formData.notes,
          vitals: formData.vitals,
          diagnosis: formData.diagnosis,
          investigations: formData.investigations,
          advisedInvestigations: formData.advisedInvestigations,
          nextVisit: formData.nextVisit || '',
          medications: formData.medications,
          status: 'doctor_complete'
        };
        if (existingPrescription) {
          await DatabaseService.updatePrescription(existingPrescription.id, prescriptionData);
        } else {
          await DatabaseService.addPrescription(prescriptionData);
        }
        alert('✅ Prescription Complete!');
        navigate(`/patients/${patientId}`);
      }

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

  const isDraft = existingPrescription?.status === 'staff_draft';

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
          {isDoctor && (
            <button onClick={handlePrint} className="btn-secondary flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>Print</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : isDoctor ? (isDraft ? 'Complete & Save' : 'Save Prescription') : 'Save for Doctor'}</span>
          </button>
        </div>
      </div>

      {/* Stage banner — screen only */}
      {!isDoctor && (
        <div className="no-print" style={{ background: '#fefce8', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <div>
            <strong style={{ color: '#92400e' }}>Stage 1 — Staff Entry</strong>
            <p style={{ color: '#78350f', margin: 0, fontSize: '13px' }}>Fill vitals and pathology test values. Symptoms, ECG / Echo / TMT, Diagnosis and Medicines will be filled by Dr. Vivek.</p>
          </div>
        </div>
      )}
      {isDoctor && isDraft && (
        <div className="no-print" style={{ background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle style={{ color: '#16a34a', width: '24px', height: '24px', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#166534' }}>Stage 2 — Doctor Completion</strong>
            <p style={{ color: '#14532d', margin: 0, fontSize: '13px' }}>Vitals & pathology results filled by nursing are shown read-only. Please fill Symptoms, ECG / Echo / TMT, Diagnosis and Medications.</p>
          </div>
        </div>
      )}

      {/* Prescription Content */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '20px 30px',
        minHeight: '297mm',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Spacer for pre-printed hospital letterhead header - screen only */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '9pt', color: '#aaa', textAlign: 'center', border: '1px dashed #ddd', padding: '4px', borderRadius: '3px' }}>
            ↑ Pre-printed hospital header space (approx 55mm on actual letterhead)
          </div>
        </div>

        {/* @page rule for print margins matching Vardhan letterhead */}
        <style>{`
          @media print {
            @page {
              margin-top: 10mm;
              margin-bottom: 28mm;
              margin-left: 10mm;
              margin-right: 10mm;
            }
            @page :first {
              margin-top: 58mm;
            }
          }
          .inv-table th {
            font-weight: normal !important;
          }
        `}</style>

        {/* Patient Info */}
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

        {/* Symptoms — screen input is in doctor section below; print-only here for correct print order */}
        {formData.complaints && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Symptoms:</strong> {formData.complaints}
          </div>
        )}

        {/* Notes — screen input is in doctor section below; print-only here for correct print order */}
        {formData.notes && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Notes:</strong> {formData.notes}
          </div>
        )}

        {/* Vitals */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Vitals: {isDoctor && isDraft && <span style={{ fontSize: '9pt', color: '#059669', fontWeight: 'normal' }}>(filled by nursing — read only)</span>}</strong>
          <div style={{ display: 'flex', gap: '8px', marginTop: '3px', pointerEvents: (isDoctor && isDraft) ? 'none' : 'auto', opacity: (isDoctor && isDraft) ? 0.75 : 1, background: (isDoctor && isDraft) ? '#f9fafb' : 'transparent', borderRadius: '4px', padding: (isDoctor && isDraft) ? '4px 8px' : '0', border: (isDoctor && isDraft) ? '1px solid #e5e7eb' : 'none' }}>
            <input type="text" value={formData.vitals.pulse} onChange={(e) => !(isDoctor && isDraft) && setFormData({ ...formData, vitals: { ...formData.vitals, pulse: e.target.value }})} readOnly={isDoctor && isDraft} placeholder="Pulse: 70" style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', background: (isDoctor && isDraft) ? '#f9fafb' : 'white' }} />
            <input type="text" value={formData.vitals.spo2} onChange={(e) => !(isDoctor && isDraft) && setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value }})} readOnly={isDoctor && isDraft} placeholder="SPO2: 96" style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', background: (isDoctor && isDraft) ? '#f9fafb' : 'white' }} />
            <input type="text" value={formData.vitals.bp} onChange={(e) => !(isDoctor && isDraft) && setFormData({ ...formData, vitals: { ...formData.vitals, bp: e.target.value }})} readOnly={isDoctor && isDraft} placeholder="BP: 110/80" style={{ flex: 1, fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', background: (isDoctor && isDraft) ? '#f9fafb' : 'white' }} />
          </div>
        </div>
        {(formData.vitals.pulse || formData.vitals.spo2 || formData.vitals.bp) && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Vitals:</strong> Pulse: {formData.vitals.pulse || '-'} /min, SPO2: {formData.vitals.spo2 || '-'} %, BP: {formData.vitals.bp || '-'} mmHg
          </div>
        )}

        {/* Investigation Results - SCREEN */}
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt', display: 'block', marginBottom: '5px' }}>
            Investigation Results:
            {isDoctor && isDraft && <span style={{ fontSize: '9pt', color: '#059669', fontWeight: 'normal', marginLeft: '8px' }}>(filled by nursing — read only)</span>}
          </strong>
          {!isDoctor && <div style={{ fontSize: '9pt', color: '#888', marginBottom: '6px' }}>Fill only the tests performed. Empty tests will not appear on print.</div>}
          <div style={{ pointerEvents: (isDoctor && isDraft) ? 'none' : 'auto', opacity: (isDoctor && isDraft) ? 0.75 : 1, background: (isDoctor && isDraft) ? '#f9fafb' : 'transparent', borderRadius: '4px', padding: (isDoctor && isDraft) ? '8px' : '0', border: (isDoctor && isDraft) ? '1px solid #e5e7eb' : 'none' }}>

          {/* KFT */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Kidney Function Test KFT</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.kft.date} onChange={(e) => updateInvestigation('kft', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.uricAcid} onChange={(e) => updateInvestigation('kft', 'uricAcid', e.target.value)} placeholder="S. Uric acid" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.bloodUrea} onChange={(e) => updateInvestigation('kft', 'bloodUrea', e.target.value)} placeholder="Blood Urea" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.kft.creatinine} onChange={(e) => updateInvestigation('kft', 'creatinine', e.target.value)} placeholder="S Creatinine" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* CBC */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>CBC - Complete Blood Count</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.cbc.date} onChange={(e) => updateInvestigation('cbc', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.cbc.hemoglobin} onChange={(e) => updateInvestigation('cbc', 'hemoglobin', e.target.value)} placeholder="Hemoglobin" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.cbc.tlc} onChange={(e) => updateInvestigation('cbc', 'tlc', e.target.value)} placeholder="TLC" style={{ width: '80px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.cbc.platelets} onChange={(e) => updateInvestigation('cbc', 'platelets', e.target.value)} placeholder="Platelets" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* FBS */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>FBS - Fasting Blood Sugar</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.fbs.date} onChange={(e) => updateInvestigation('fbs', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.fbs.value} onChange={(e) => updateInvestigation('fbs', 'value', e.target.value)} placeholder="Fasting Blood Sugar" style={{ width: '130px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* RBS */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>RBS (Random Blood Sugar)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.rbs.date} onChange={(e) => updateInvestigation('rbs', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.rbs.value} onChange={(e) => updateInvestigation('rbs', 'value', e.target.value)} placeholder="Random Blood Sugar" style={{ width: '130px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* PPBS */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>PPBS - Post Prandial Blood Sugar</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.ppbs.date} onChange={(e) => updateInvestigation('ppbs', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.ppbs.value} onChange={(e) => updateInvestigation('ppbs', 'value', e.target.value)} placeholder="Post Prandial Sugar" style={{ width: '130px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* HbA1c */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>HbA1c (Glycated Hemoglobin)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.hba1c.date} onChange={(e) => updateInvestigation('hba1c', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.hba1c.value} onChange={(e) => updateInvestigation('hba1c', 'value', e.target.value)} placeholder="HbA1c %" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* LFT */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Liver Function Test LFT</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.lft.date} onChange={(e) => updateInvestigation('lft', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lft.sgpt} onChange={(e) => updateInvestigation('lft', 'sgpt', e.target.value)} placeholder="SGPT (ALT)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lft.sgot} onChange={(e) => updateInvestigation('lft', 'sgot', e.target.value)} placeholder="SGOT (AST)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lft.totalBilirubin} onChange={(e) => updateInvestigation('lft', 'totalBilirubin', e.target.value)} placeholder="Total Bilirubin" style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* Lipid Profile */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Lipid Profile</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.lipid.date} onChange={(e) => updateInvestigation('lipid', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lipid.totalCholesterol} onChange={(e) => updateInvestigation('lipid', 'totalCholesterol', e.target.value)} placeholder="Total Cholesterol" style={{ width: '120px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lipid.ldl} onChange={(e) => updateInvestigation('lipid', 'ldl', e.target.value)} placeholder="LDL" style={{ width: '70px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lipid.hdl} onChange={(e) => updateInvestigation('lipid', 'hdl', e.target.value)} placeholder="HDL" style={{ width: '70px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lipid.triglycerides} onChange={(e) => updateInvestigation('lipid', 'triglycerides', e.target.value)} placeholder="Triglycerides" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.lipid.vldl} onChange={(e) => updateInvestigation('lipid', 'vldl', e.target.value)} placeholder="VLDL" style={{ width: '70px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* TSH */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>TSH - Thyroid Stimulating Hormone</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.tsh.date} onChange={(e) => updateInvestigation('tsh', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.tsh.value} onChange={(e) => updateInvestigation('tsh', 'value', e.target.value)} placeholder="TSH (mIU/L)" style={{ width: '120px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* Thyroid Function Test Full */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Thyroid Function Test (T3/T4/TSH)</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.thyroidFull.date} onChange={(e) => updateInvestigation('thyroidFull', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.thyroidFull.tsh} onChange={(e) => updateInvestigation('thyroidFull', 'tsh', e.target.value)} placeholder="TSH" style={{ width: '80px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.thyroidFull.t3} onChange={(e) => updateInvestigation('thyroidFull', 't3', e.target.value)} placeholder="T3" style={{ width: '80px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.thyroidFull.t4} onChange={(e) => updateInvestigation('thyroidFull', 't4', e.target.value)} placeholder="T4" style={{ width: '80px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* BNP */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>BNP / NT-proBNP (Heart Failure Marker)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="date" value={formData.investigations.bnp.date} onChange={(e) => updateInvestigation('bnp', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.bnp.value} onChange={(e) => updateInvestigation('bnp', 'value', e.target.value)} placeholder="BNP / NT-proBNP" style={{ width: '140px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* Electrolytes */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Electrolytes</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.electrolytes.date} onChange={(e) => updateInvestigation('electrolytes', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.electrolytes.sodium} onChange={(e) => updateInvestigation('electrolytes', 'sodium', e.target.value)} placeholder="Sodium (Na+)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.electrolytes.potassium} onChange={(e) => updateInvestigation('electrolytes', 'potassium', e.target.value)} placeholder="Potassium (K+)" style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.electrolytes.chloride} onChange={(e) => updateInvestigation('electrolytes', 'chloride', e.target.value)} placeholder="Chloride (Cl-)" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* Enzymes / Cardiac Markers */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Cardiac Enzymes</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.enzymes.date} onChange={(e) => updateInvestigation('enzymes', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.enzymes.ck} onChange={(e) => updateInvestigation('enzymes', 'ck', e.target.value)} placeholder="CK Total" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.enzymes.ckmb} onChange={(e) => updateInvestigation('enzymes', 'ckmb', e.target.value)} placeholder="CK-MB" style={{ width: '80px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.enzymes.troponin} onChange={(e) => updateInvestigation('enzymes', 'troponin', e.target.value)} placeholder="Troponin I/T" style={{ width: '100px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          {/* Blood Glucose Estimation */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Blood Glucose Estimation</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input type="date" value={formData.investigations.bloodGlucose.date} onChange={(e) => updateInvestigation('bloodGlucose', 'date', e.target.value)} style={{ width: '110px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.bloodGlucose.fasting} onChange={(e) => updateInvestigation('bloodGlucose', 'fasting', e.target.value)} placeholder="Fasting" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
              <input type="text" value={formData.investigations.bloodGlucose.postMeal} onChange={(e) => updateInvestigation('bloodGlucose', 'postMeal', e.target.value)} placeholder="Post Meal" style={{ width: '90px', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999' }} />
            </div>
          </div>

          </div>{/* end pathology read-only wrapper */}
        </div>

        {/* Print Investigations */}
        <div className="print-only" style={{ marginBottom: '8px' }}>
          {(hasInvestigationData('kft') || hasInvestigationData('cbc') || hasInvestigationData('fbs') || hasInvestigationData('rbs') || hasInvestigationData('ppbs') || hasInvestigationData('hba1c') || hasInvestigationData('lft') || hasInvestigationData('lipid') || hasInvestigationData('tsh') || hasInvestigationData('thyroidFull') || hasInvestigationData('bnp') || hasInvestigationData('electrolytes') || hasInvestigationData('enzymes') || hasInvestigationData('bloodGlucose') || hasInvestigationData('ecg') || hasInvestigationData('echo') || hasInvestigationData('tmt')) && (
            <>
              <strong style={{ fontSize: '11pt', display: 'block', marginBottom: '4px' }}>Investigation Results:</strong>

              {/* KFT */}
              {hasInvestigationData('kft') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Kidney Function Test KFT</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>S. Uric acid</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Blood Urea</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>S Creatinine</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.date ? format(new Date(formData.investigations.kft.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.uricAcid ? `${formData.investigations.kft.uricAcid} mg/dL` : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.bloodUrea ? `${formData.investigations.kft.bloodUrea} mg/dl` : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.kft.creatinine ? `${formData.investigations.kft.creatinine} mg/dl` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* CBC */}
              {hasInvestigationData('cbc') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>CBC - Complete Blood Count</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Hemoglobin</th>
                      {formData.investigations.cbc.tlc && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>TLC</th>}
                      {formData.investigations.cbc.platelets && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Platelets</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.date ? format(new Date(formData.investigations.cbc.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.hemoglobin ? `${formData.investigations.cbc.hemoglobin} g/dl` : ''}</td>
                      {formData.investigations.cbc.tlc && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.tlc} /cumm</td>}
                      {formData.investigations.cbc.platelets && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.cbc.platelets} lakh/cumm</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* FBS */}
              {hasInvestigationData('fbs') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>FBS - Fasting Blood Sugar</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Fasting Blood Sugar</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.fbs.date ? format(new Date(formData.investigations.fbs.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.fbs.value ? `${formData.investigations.fbs.value} mg/dl` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* RBS */}
              {hasInvestigationData('rbs') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>RBS (Random Blood Sugar)</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Random Blood Sugar</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.rbs.date ? format(new Date(formData.investigations.rbs.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.rbs.value ? `${formData.investigations.rbs.value} mg/dl` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* PPBS */}
              {hasInvestigationData('ppbs') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>PPBS - Post Prandial Blood Sugar Test</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Post Prandial Blood Sugar</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.ppbs.date ? format(new Date(formData.investigations.ppbs.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.ppbs.value ? `${formData.investigations.ppbs.value} mg/dl` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* HbA1c */}
              {hasInvestigationData('hba1c') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>HbA1c (Glycated Hemoglobin)</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>HbA1c</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.hba1c.date ? format(new Date(formData.investigations.hba1c.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.hba1c.value ? `${formData.investigations.hba1c.value} %` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* LFT */}
              {hasInvestigationData('lft') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Liver Function Test LFT</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>SGPT (ALT)</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>SGOT (AST)</th>
                      {formData.investigations.lft.totalBilirubin && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Total Bilirubin</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.date ? format(new Date(formData.investigations.lft.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.sgpt ? `${formData.investigations.lft.sgpt} U/L` : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.sgot ? `${formData.investigations.lft.sgot} U/L` : ''}</td>
                      {formData.investigations.lft.totalBilirubin && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lft.totalBilirubin} mg/dL</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* Lipid Profile */}
              {hasInvestigationData('lipid') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Lipid Profile</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      {formData.investigations.lipid.totalCholesterol && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Total Cholesterol</th>}
                      {formData.investigations.lipid.ldl && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>LDL</th>}
                      {formData.investigations.lipid.hdl && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>HDL</th>}
                      {formData.investigations.lipid.triglycerides && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Triglycerides</th>}
                      {formData.investigations.lipid.vldl && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>VLDL</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.date ? format(new Date(formData.investigations.lipid.date), 'dd-MM-yyyy') : ''}</td>
                      {formData.investigations.lipid.totalCholesterol && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.totalCholesterol} mg/dL</td>}
                      {formData.investigations.lipid.ldl && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.ldl} mg/dL</td>}
                      {formData.investigations.lipid.hdl && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.hdl} mg/dL</td>}
                      {formData.investigations.lipid.triglycerides && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.triglycerides} mg/dL</td>}
                      {formData.investigations.lipid.vldl && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.lipid.vldl} mg/dL</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* TSH */}
              {hasInvestigationData('tsh') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>TSH - Thyroid Stimulating Hormone</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>TSH</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.tsh.date ? format(new Date(formData.investigations.tsh.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.tsh.value ? `${formData.investigations.tsh.value} mIU/L` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* Thyroid Full */}
              {hasInvestigationData('thyroidFull') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Thyroid Function Test (T3/T4/TSH)</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      {formData.investigations.thyroidFull.tsh && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>TSH</th>}
                      {formData.investigations.thyroidFull.t3 && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>T3</th>}
                      {formData.investigations.thyroidFull.t4 && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>T4</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.thyroidFull.date ? format(new Date(formData.investigations.thyroidFull.date), 'dd-MM-yyyy') : ''}</td>
                      {formData.investigations.thyroidFull.tsh && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.thyroidFull.tsh} mIU/L</td>}
                      {formData.investigations.thyroidFull.t3 && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.thyroidFull.t3} ng/dL</td>}
                      {formData.investigations.thyroidFull.t4 && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.thyroidFull.t4} µg/dL</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* BNP */}
              {hasInvestigationData('bnp') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>BNP / NT-proBNP</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>BNP / NT-proBNP</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.bnp.date ? format(new Date(formData.investigations.bnp.date), 'dd-MM-yyyy') : ''}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.bnp.value ? `${formData.investigations.bnp.value} pg/mL` : ''}</td>
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* Electrolytes */}
              {hasInvestigationData('electrolytes') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Electrolytes</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      {formData.investigations.electrolytes.sodium && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Sodium (Na+)</th>}
                      {formData.investigations.electrolytes.potassium && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Potassium (K+)</th>}
                      {formData.investigations.electrolytes.chloride && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Chloride (Cl-)</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.electrolytes.date ? format(new Date(formData.investigations.electrolytes.date), 'dd-MM-yyyy') : ''}</td>
                      {formData.investigations.electrolytes.sodium && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.electrolytes.sodium} mEq/L</td>}
                      {formData.investigations.electrolytes.potassium && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.electrolytes.potassium} mEq/L</td>}
                      {formData.investigations.electrolytes.chloride && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.electrolytes.chloride} mEq/L</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* Cardiac Enzymes */}
              {hasInvestigationData('enzymes') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Cardiac Enzymes</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      {formData.investigations.enzymes.ck && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>CK Total</th>}
                      {formData.investigations.enzymes.ckmb && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>CK-MB</th>}
                      {formData.investigations.enzymes.troponin && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Troponin</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.enzymes.date ? format(new Date(formData.investigations.enzymes.date), 'dd-MM-yyyy') : ''}</td>
                      {formData.investigations.enzymes.ck && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.enzymes.ck} U/L</td>}
                      {formData.investigations.enzymes.ckmb && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.enzymes.ckmb} U/L</td>}
                      {formData.investigations.enzymes.troponin && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.enzymes.troponin} ng/mL</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {/* Blood Glucose Estimation */}
              {hasInvestigationData('bloodGlucose') && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '2px' }}>Blood Glucose Estimation</strong>
                  <table className="inv-table" style={{ borderCollapse: 'collapse', fontSize: '10pt', border: '1px solid #000', width: 'auto' }}>
                    <thead><tr>
                      <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Date</th>
                      {formData.investigations.bloodGlucose.fasting && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Fasting</th>}
                      {formData.investigations.bloodGlucose.postMeal && <th style={{ padding: '3px 6px', border: '1px solid #000' }}>Post Meal</th>}
                    </tr></thead>
                    <tbody><tr>
                      <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.bloodGlucose.date ? format(new Date(formData.investigations.bloodGlucose.date), 'dd-MM-yyyy') : ''}</td>
                      {formData.investigations.bloodGlucose.fasting && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.bloodGlucose.fasting} mg/dl</td>}
                      {formData.investigations.bloodGlucose.postMeal && <td style={{ padding: '3px 6px', border: '1px solid #000' }}>{formData.investigations.bloodGlucose.postMeal} mg/dl</td>}
                    </tr></tbody>
                  </table>
                </div>
              )}

              {formData.investigations.ecg && <div style={{ fontSize: '10pt', marginBottom: '4px' }}><strong>ECG:</strong> {formData.investigations.ecg}</div>}
              {formData.investigations.echo && <div style={{ fontSize: '10pt', marginBottom: '4px' }}><strong>Echocardiography-Colour Doppler:</strong> {formData.investigations.echo}</div>}
              {formData.investigations.tmt && <div style={{ fontSize: '10pt', marginBottom: '4px' }}><strong>Treadmill Exercise Test (TMT):</strong> {formData.investigations.tmt}</div>}
            </>
          )}
        </div>

        {/* Doctor section divider — shown when doctor is completing a staff draft */}
        {isDoctor && isDraft && (
          <div className="no-print" style={{ margin: '16px 0 12px', padding: '10px 14px', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock style={{ width: '18px', height: '18px', color: '#16a34a' }} />
            <strong style={{ color: '#166534', fontSize: '11pt' }}>Dr. Vivek — Fill below (Symptoms, ECG / Echo / TMT, Diagnosis, Medicines)</strong>
          </div>
        )}

        {/* Staff: hide diagnosis+medications. Doctor: always show */}
        {!isDoctor && (
          <div className="no-print" style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', marginBottom: '8px', fontSize: '12pt', color: '#92400e' }}>
            <Lock style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px' }} />
            <strong>Symptoms, ECG / Echo / TMT, Diagnosis, Medicines and Advice</strong> — to be filled by Dr. Vivek after you save.
          </div>
        )}

        {/* Symptoms, Notes, ECG, Echo, TMT — Doctor fills on screen */}
        {isDoctor && (
          <>
            <div className="no-print" style={{ marginBottom: '8px' }}>
              <strong style={{ fontSize: '11pt' }}>Symptoms:</strong>
              <textarea
                value={formData.complaints}
                onChange={(e) => setFormData({ ...formData, complaints: e.target.value })}
                rows="2"
                placeholder="Generalised weakness, Chest pain"
                style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }}
              />
            </div>
            <div className="no-print" style={{ marginBottom: '8px' }}>
              <strong style={{ fontSize: '11pt' }}>Notes:</strong>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                placeholder="Clinical notes: Recently admitted with NSTEMI, ECHO—ICMP"
                style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }}
              />
            </div>
            <div className="no-print" style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>ECG</div>
              <input type="text" value={formData.investigations.ecg} onChange={(e) => updateInvestigation('ecg', null, e.target.value)} placeholder="SR, QS V1-V5, LBBB etc." style={{ width: '100%', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999', borderRadius: '3px' }} />
            </div>
            <div className="no-print" style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Echocardiography-Colour Doppler</div>
              <input type="text" value={formData.investigations.echo} onChange={(e) => updateInvestigation('echo', null, e.target.value)} placeholder="LAD Hx, Normal Valves, LVEF 50%" style={{ width: '100%', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999', borderRadius: '3px' }} />
            </div>
            <div className="no-print" style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10pt', fontWeight: '700', marginBottom: '2px' }}>Treadmill Exercise Test (TMT)</div>
              <input type="text" value={formData.investigations.tmt} onChange={(e) => updateInvestigation('tmt', null, e.target.value)} placeholder="Positive / Negative / Inconclusive" style={{ width: '100%', fontSize: '9.5pt', padding: '3px 4px', border: '1px solid #999', borderRadius: '3px' }} />
            </div>
          </>
        )}

        {/* Diagnosis */}
        {isDoctor && (
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Diagnosis: *</strong>
          <input type="text" value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} placeholder="IHD/NSTEMI/Moderate LVD/SR/HTN" required style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }} />
        </div>
        )}
        {formData.diagnosis && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Diagnosis:</strong> {formData.diagnosis}
          </div>
        )}

        {/* ===== MEDICATIONS TABLE — Doctor only ===== */}
        {isDoctor && <div style={{ marginTop: '8px', marginBottom: '8px' }}>

          {/* ── SINGLE TABLE - inputs visible on screen, Hindi text always present ── */}
          {/* Print CSS hides inputs and shows translated divs via display:none / display:block */}
          {formData.medications.length > 0 && (
            <>
              <style>{`
                @media screen {
                  .med-print-cell { display: none !important; }
                  .med-input-cell { display: block !important; }
                  .med-delete-col { display: table-cell !important; }
                  .med-delete-th { display: table-cell !important; }
                }
                @media print {
                  .med-print-cell { display: block !important; }
                  .med-input-cell { display: none !important; }
                  .med-delete-col { display: none !important; }
                  .med-delete-th { display: none !important; }
                  col.med-delete-col-group { display: none !important; width: 0 !important; }
                }
              `}</style>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', border: '1px solid #000', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '120px' }} />
                  <col className="med-delete-col-group med-delete-th" style={{ width: '34px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ padding: '5px 6px', border: '1px solid #000', textAlign: 'center', backgroundColor: 'transparent', fontWeight: '600' }}>Rx</th>
                    <th style={{ padding: '5px 6px', border: '1px solid #000', textAlign: 'left', backgroundColor: 'transparent', fontWeight: '600' }}>नाम</th>
                    <th style={{ padding: '5px 6px', border: '1px solid #000', textAlign: 'center', backgroundColor: 'transparent', fontWeight: '600' }}>आवृत्ति</th>
                    <th style={{ padding: '5px 6px', border: '1px solid #000', textAlign: 'center', backgroundColor: 'transparent', fontWeight: '600' }}>अवधि</th>
                    <th style={{ padding: '5px 6px', border: '1px solid #000', textAlign: 'center', backgroundColor: 'transparent', fontWeight: '600' }}>टिप्पणियाँ</th>
                    <th className="med-delete-th" style={{ padding: '4px', border: '1px solid #000', backgroundColor: 'transparent' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.medications.map((med, index) => (
                    <tr key={med.id}>
                      {/* Rx - number only */}
                      <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle', fontWeight: '600' }}>
                        {index + 1}
                      </td>

                      {/* Name cell - input on screen, styled div on print */}
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'top' }}>
                        <div className="med-input-cell">
                          <input
                            type="text"
                            value={med.drugName}
                            onChange={(e) => updateMedication(med.id, 'drugName', e.target.value)}
                            placeholder="Tablet Ecosprin AV (75/40)"
                            style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', marginBottom: '2px', fontWeight: '600' }}
                          />
                          <input
                            type="text"
                            value={med.genericName}
                            onChange={(e) => updateMedication(med.id, 'genericName', e.target.value)}
                            placeholder="Aspirin 75mg + Atorvastatin 40mg"
                            style={{ width: '100%', border: 'none', fontSize: '8.5pt', color: '#555', padding: '2px', fontStyle: 'italic', textTransform: 'uppercase' }}
                          />
                        </div>
                        <div className="med-print-cell">
                          <div style={{ fontWeight: '700', fontSize: '10.5pt' }}>{med.drugName}</div>
                          {med.genericName && (
                            <div style={{ fontSize: '8pt', color: '#444', fontStyle: 'italic', textTransform: 'uppercase', marginTop: '1px' }}>
                              {med.genericName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Frequency */}
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div className="med-input-cell">
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                            placeholder="1 tablet - once a day"
                            style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', textAlign: 'center' }}
                          />
                        </div>
                        <div className="med-print-cell" style={{ textAlign: 'center' }}>{translateToHindi(med.frequency)}</div>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div className="med-input-cell">
                          <input
                            type="text"
                            value={med.duration}
                            onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                            placeholder="15 days"
                            style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', textAlign: 'center' }}
                          />
                        </div>
                        <div className="med-print-cell" style={{ textAlign: 'center' }}>{translateToHindi(med.duration)}</div>
                      </td>

                      {/* Timing */}
                      <td style={{ padding: '4px 6px', border: '1px solid #000', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div className="med-input-cell">
                          <input
                            type="text"
                            value={med.timing}
                            onChange={(e) => updateMedication(med.id, 'timing', e.target.value)}
                            placeholder="before sleep"
                            style={{ width: '100%', border: 'none', fontSize: '10pt', padding: '2px', textAlign: 'center' }}
                          />
                        </div>
                        <div className="med-print-cell" style={{ textAlign: 'center' }}>{translateToHindi(med.timing)}</div>
                      </td>

                      {/* Delete button - screen only */}
                      <td className="med-delete-col" style={{ padding: '4px', border: '1px solid #000', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button onClick={() => removeMedication(med.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                          <X style={{ width: '16px', height: '16px' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Add Medication */}
          <div className="no-print" style={{ marginTop: '10px' }}>
            {showDrugSearch && (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#999', width: '18px', height: '18px' }} />
                  <input type="text" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)} placeholder="Search: Bisoheart, Utiliv, Ecosprin..." autoFocus style={{ width: '100%', paddingLeft: '35px', paddingRight: '35px', padding: '8px', border: '2px solid #3b82f6', borderRadius: '6px', fontSize: '10.5pt' }} />
                  <button onClick={() => { setShowDrugSearch(false); setDrugSearch(''); }} style={{ position: 'absolute', right: '10px', top: '10px', border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>

                {drugSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '4px', backgroundColor: 'white', border: '2px solid #3b82f6', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '240px', overflowY: 'auto' }}>
                    {drugSuggestions.map((drug, idx) => (
                      <button key={idx} onClick={() => addMedication(drug)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: idx < drugSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none', background: 'white', cursor: 'pointer', fontSize: '10.5pt' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{drug.name} ({drug.dosages.join(', ')})</div>
                        <div style={{ fontSize: '9pt', color: '#6b7280' }}>{drug.genericName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showDrugSearch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => setShowDrugSearch(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: '600', fontSize: '10.5pt', border: 'none', background: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  <Search style={{ width: '16px', height: '16px' }} />
                  <span>Search Drugs</span>
                </button>
                <span style={{ color: '#9ca3af' }}>or</span>
                <button onClick={() => addMedication()} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: '600', fontSize: '10.5pt', border: 'none', background: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                  <Plus style={{ width: '16px', height: '16px' }} />
                  <span>Add Manually</span>
                </button>
              </div>
            )}
          </div>
        </div>
        } {/* end isDoctor medications block */}

        {/* Advised Investigations — Doctor only */}
        {isDoctor && (
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Advised Investigations:</strong>
          <input type="text" value={formData.advisedInvestigations} onChange={(e) => setFormData({ ...formData, advisedInvestigations: e.target.value })} placeholder="Exercise regularly, Avoid stress" style={{ width: '100%', fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px' }} />
        </div>
        )}
        {formData.advisedInvestigations && (
          <div className="print-only" style={{ marginBottom: '6px', fontSize: '11pt' }}>
            <strong>Advised Investigations:</strong> {formData.advisedInvestigations}
          </div>
        )}

        {/* Next Visit — Doctor only */}
        {isDoctor && (
        <div className="no-print" style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '11pt' }}>Next Visit:</strong>
          <input
            type="date"
            value={formData.nextVisit || ''}
            onChange={(e) => setFormData({ ...formData, nextVisit: e.target.value })}
            style={{ fontSize: '10.5pt', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', marginTop: '3px', marginLeft: '8px' }}
          />
        </div>
        )}
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
