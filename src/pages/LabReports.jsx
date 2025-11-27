import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Search, User } from 'lucide-react';
import DatabaseService from '../services/database';
import reportAnalysisService from '../services/reportAnalysisService';
import { format } from 'date-fns';

function LabReports() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // upload, alerts

  useEffect(() => {
    loadCriticalAlerts();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchPatients = async () => {
    const results = await DatabaseService.searchPatients(searchQuery);
    setSearchResults(results.slice(0, 5));
  };

  const loadCriticalAlerts = async () => {
    const allAlerts = await DatabaseService.db.alerts
      .orderBy('createdAt')
      .reverse()
      .limit(50)
      .toArray();
    setAlerts(allAlerts);
  };

  const handleAddTest = () => {
    setTestResults([...testResults, { name: '', value: '', unit: '' }]);
  };

  const handleRemoveTest = (index) => {
    setTestResults(testResults.filter((_, i) => i !== index));
  };

  const handleTestChange = (index, field, value) => {
    const updated = [...testResults];
    updated[index][field] = value;
    setTestResults(updated);
  };

  const handleAnalyze = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    if (testResults.length === 0) {
      alert('Please add at least one test result');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        patientId: selectedPatient.id,
        uhid: selectedPatient.uhid,
        patientName: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        reportDate: new Date().toISOString(),
        tests: testResults.filter(t => t.name && t.value)
      };

      const analysis = await reportAnalysisService.analyzeReport(reportData);
      setAnalysisResult(analysis);

      // Reload alerts
      await loadCriticalAlerts();

      // Show notification if there are critical findings
      if (analysis.criticalFindings.length > 0) {
        alert(`⚠️ CRITICAL: ${analysis.criticalFindings.length} abnormal values detected! Please review immediately.`);
      } else if (analysis.abnormalTests.length > 0) {
        alert(`⚠️ ${analysis.abnormalTests.length} values outside normal range detected.`);
      } else {
        alert('✅ All test results are within normal range.');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze report: ' + error.message);
    }
    setLoading(false);
  };

  const handleClearForm = () => {
    setTestResults([]);
    setAnalysisResult(null);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-300';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      case 'mild': return 'text-blue-600 bg-blue-50 border-blue-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-300';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs font-bold bg-yellow-500 text-white rounded">MEDIUM</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded">INFO</span>;
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
        <FileText className="w-8 h-8 text-blue-600" />
        <span>Lab Reports & Analysis</span>
      </h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'upload'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload & Analyze
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 font-semibold flex items-center space-x-2 ${
            activeTab === 'alerts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>Critical Alerts</span>
          {alerts.filter(a => !a.read).length > 0 && (
            <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">
              {alerts.filter(a => !a.read).length}
            </span>
          )}
        </button>
      </div>

      {/* Upload & Analyze Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">1. Select Patient</h2>
            <div className="relative">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, UHID, or phone number..."
                  className="input pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => {
                        setSelectedPatient(patient);
                        setSearchQuery(patient.name);
                        setSearchResults([]);
                      }}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-0"
                    >
                      <div className="font-semibold">{patient.name}</div>
                      <div className="text-sm text-gray-600">
                        UHID: {patient.uhid} | {patient.age}Y/{patient.gender} | {patient.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedPatient && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">{selectedPatient.name}</div>
                    <div className="text-sm text-gray-600">
                      UHID: {selectedPatient.uhid} | Age: {selectedPatient.age} | Gender: {selectedPatient.gender}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery('');
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Change Patient
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test Results Input */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">2. Enter Test Results</h2>
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Test name (e.g., Hemoglobin)"
                    value={test.name}
                    onChange={(e) => handleTestChange(index, 'name', e.target.value)}
                    className="input flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g., 12.5)"
                    value={test.value}
                    onChange={(e) => handleTestChange(index, 'value', e.target.value)}
                    className="input w-32"
                  />
                  <input
                    type="text"
                    placeholder="Unit (optional)"
                    value={test.unit}
                    onChange={(e) => handleTestChange(index, 'unit', e.target.value)}
                    className="input w-32"
                  />
                  <button
                    onClick={() => handleRemoveTest(index)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={handleAddTest} className="btn-secondary">
                + Add Test
              </button>
            </div>
          </div>

          {/* Common Test Templates */}
          <div className="card">
            <h3 className="font-bold mb-3">Quick Add Common Tests</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Hemoglobin', unit: 'g/dL' },
                { name: 'WBC', unit: 'cells/μL' },
                { name: 'Platelet', unit: 'cells/μL' },
                { name: 'Blood Sugar (Fasting)', unit: 'mg/dL' },
                { name: 'HbA1c', unit: '%' },
                { name: 'Creatinine', unit: 'mg/dL' },
                { name: 'Total Cholesterol', unit: 'mg/dL' },
                { name: 'LDL', unit: 'mg/dL' },
                { name: 'HDL', unit: 'mg/dL' },
                { name: 'Triglycerides', unit: 'mg/dL' },
                { name: 'TSH', unit: 'mIU/L' }
              ].map((test) => (
                <button
                  key={test.name}
                  onClick={() => setTestResults([...testResults, { ...test, value: '' }])}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-blue-100 text-gray-700 rounded"
                >
                  {test.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !selectedPatient}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="spinner w-5 h-5"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Analyze Report</span>
                </>
              )}
            </button>
            <button onClick={handleClearForm} className="btn-secondary">
              Clear Form
            </button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Analysis Results</h2>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{analysisResult.totalTests}</div>
                    <div className="text-sm text-gray-600">Total Tests</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">{analysisResult.normalTests.length}</div>
                    <div className="text-sm text-gray-600">Normal</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-600">{analysisResult.abnormalTests.length}</div>
                    <div className="text-sm text-gray-600">Abnormal</div>
                  </div>
                </div>
              </div>

              {/* Critical Findings */}
              {analysisResult.criticalFindings.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-bold text-red-800">CRITICAL FINDINGS - IMMEDIATE ATTENTION REQUIRED</h3>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.criticalFindings.map((finding, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border border-red-300">
                        <div className="font-bold text-red-800">{finding.testName}</div>
                        <div className="text-sm">
                          Value: <span className="font-semibold">{finding.value} {finding.unit}</span> |
                          Normal: {finding.normalRange}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{finding.interpretation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abnormal Tests */}
              {analysisResult.abnormalTests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3">Abnormal Values</h3>
                  <div className="space-y-2">
                    {analysisResult.abnormalTests.map((test, idx) => (
                      <div key={idx} className={`p-3 border rounded ${getSeverityColor(test.severity)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{test.testName}</div>
                            <div className="text-sm">
                              Value: <span className="font-bold">{test.value} {test.unit}</span> |
                              Normal: {test.normalRange} |
                              Status: {test.status}
                            </div>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 bg-white rounded uppercase">
                            {test.severity}
                          </span>
                        </div>
                        <div className="text-sm mt-2">{test.interpretation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Normal Tests */}
              {analysisResult.normalTests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-3 text-green-700 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Normal Values</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult.normalTests.map((test, idx) => (
                      <div key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <span className="font-semibold">{test.testName}:</span> {test.value} {test.unit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysisResult.recommendations.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-bold mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {analysisResult.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Critical Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700">No Critical Alerts</h3>
              <p className="text-gray-600 mt-2">All lab reports are within normal ranges</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`card border-l-4 ${
                alert.priority === 'critical' ? 'border-red-600 bg-red-50' :
                alert.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getPriorityBadge(alert.priority)}
                      <span className="text-sm text-gray-600">
                        {format(new Date(alert.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                    <div className="font-bold text-lg mb-1">{alert.title}</div>
                    <div className="text-gray-700">{alert.message}</div>
                    {alert.metadata && (
                      <div className="mt-2 text-sm text-gray-600">
                        Patient: {alert.metadata.patientName} | UHID: {alert.metadata.uhid}
                      </div>
                    )}
                  </div>
                  {alert.type === 'lab_critical' && (
                    <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default LabReports;
