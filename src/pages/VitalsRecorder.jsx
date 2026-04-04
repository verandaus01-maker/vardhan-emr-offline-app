import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Activity } from 'lucide-react';
import DatabaseService from '../services/database';

function VitalsRecorder() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    spo2: '',
    bloodSugar: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  const loadPatient = async () => {
    let patientData = await DatabaseService.getPatient(parseInt(patientId));
    if (!patientData) {
      patientData = await DatabaseService.db.patients.where('uhid').equals(patientId).first();
    }
    if (!patientData) {
      navigate('/patients');
      return;
    }
    setPatient(patientData);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const vitalsData = {
        patientId: parseInt(patientId),
        uhid: patient.uhid,
        date: new Date().toISOString(),
        recordedBy: 'Dr. Vivek Raj Singh',
        systolic: vitals.bloodPressureSystolic ? parseInt(vitals.bloodPressureSystolic) : null,
        diastolic: vitals.bloodPressureDiastolic ? parseInt(vitals.bloodPressureDiastolic) : null,
        pulse: vitals.heartRate,
        temperature: vitals.temperature,
        weight: vitals.weight,
        height: vitals.height,
        spo2: vitals.spo2,
        bloodSugar: vitals.bloodSugar,
        bmi: vitals.weight && vitals.height
          ? (parseFloat(vitals.weight) / Math.pow(parseFloat(vitals.height) / 100, 2)).toFixed(1)
          : null,
        notes: vitals.notes,
        syncStatus: 'pending'
      };

      await DatabaseService.addVitals(vitalsData);

      alert('✅ Vitals saved successfully!');
      navigate(`/patients/${patient?.uhid || patientId}`);

    } catch (error) {
      console.error('Failed to save vitals:', error);
      alert('Failed to save vitals: ' + error.message);
      setSaving(false);
    }
  };

  if (!patient) {
    return <div className="flex items-center justify-center h-96"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/patients/${patientId}`)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Patient</span>
      </button>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
          <Activity className="w-8 h-8 text-green-600" />
          <span>Record Vitals - {patient.name}</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Blood Pressure (mmHg)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Systolic"
                value={vitals.bloodPressureSystolic}
                onChange={(e) => setVitals({ ...vitals, bloodPressureSystolic: e.target.value })}
                className="input"
              />
              <span className="text-gray-600 font-bold">/</span>
              <input
                type="number"
                placeholder="Diastolic"
                value={vitals.bloodPressureDiastolic}
                onChange={(e) => setVitals({ ...vitals, bloodPressureDiastolic: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Heart Rate (bpm)</label>
            <input
              type="number"
              value={vitals.heartRate}
              onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              value={vitals.temperature}
              onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">SpO2 (%)</label>
            <input
              type="number"
              value={vitals.spo2}
              onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={vitals.weight}
              onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Height (cm)</label>
            <input
              type="number"
              value={vitals.height}
              onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Blood Sugar (mg/dL)</label>
            <input
              type="number"
              value={vitals.bloodSugar}
              onChange={(e) => setVitals({ ...vitals, bloodSugar: e.target.value })}
              className="input"
              placeholder="Random / Fasting / PP"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea
              value={vitals.notes}
              onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
              className="input"
              rows="3"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-success flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Vitals'}</span>
          </button>
          <button
            onClick={() => navigate(`/patients/${patientId}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default VitalsRecorder;
