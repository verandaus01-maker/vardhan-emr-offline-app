import DatabaseService, { db } from './database';

/**
 * Intelligent Report Analysis Service
 * Automatically detects abnormal values in lab reports and alerts doctor
 */

// Normal ranges for common lab tests
const NORMAL_RANGES = {
  // Complete Blood Count (CBC)
  'hemoglobin': { min: 12, max: 16, unit: 'g/dL', gender: { male: { min: 13.5, max: 17.5 }, female: { min: 12, max: 15.5 } } },
  'hb': { min: 12, max: 16, unit: 'g/dL', gender: { male: { min: 13.5, max: 17.5 }, female: { min: 12, max: 15.5 } } },
  'wbc': { min: 4000, max: 11000, unit: 'cells/μL', critical: { min: 2000, max: 30000 } },
  'rbc': { min: 4.5, max: 5.5, unit: 'million/μL', gender: { male: { min: 4.7, max: 6.1 }, female: { min: 4.2, max: 5.4 } } },
  'platelets': { min: 150000, max: 400000, unit: 'cells/μL', critical: { min: 50000, max: 1000000 } },
  'hematocrit': { min: 37, max: 47, unit: '%', gender: { male: { min: 40, max: 54 }, female: { min: 36, max: 46 } } },
  'mcv': { min: 80, max: 100, unit: 'fL' },
  'mch': { min: 27, max: 33, unit: 'pg' },
  'mchc': { min: 32, max: 36, unit: 'g/dL' },

  // Lipid Profile
  'cholesterol': { min: 0, max: 200, unit: 'mg/dL', borderline: 200, high: 240 },
  'total_cholesterol': { min: 0, max: 200, unit: 'mg/dL', borderline: 200, high: 240 },
  'hdl': { min: 40, max: 999, unit: 'mg/dL', optimal: 60 },
  'ldl': { min: 0, max: 100, unit: 'mg/dL', borderline: 130, high: 160, critical: 190 },
  'triglycerides': { min: 0, max: 150, unit: 'mg/dL', borderline: 150, high: 200, critical: 500 },
  'vldl': { min: 2, max: 30, unit: 'mg/dL' },

  // Liver Function Test (LFT)
  'sgot': { min: 0, max: 40, unit: 'U/L', alt: 'AST' },
  'ast': { min: 0, max: 40, unit: 'U/L' },
  'sgpt': { min: 0, max: 41, unit: 'U/L', alt: 'ALT' },
  'alt': { min: 0, max: 41, unit: 'U/L' },
  'alp': { min: 44, max: 147, unit: 'U/L' },
  'bilirubin_total': { min: 0.1, max: 1.2, unit: 'mg/dL', critical: 3.0 },
  'bilirubin_direct': { min: 0, max: 0.3, unit: 'mg/dL' },
  'albumin': { min: 3.5, max: 5.5, unit: 'g/dL' },
  'protein_total': { min: 6.0, max: 8.3, unit: 'g/dL' },

  // Kidney Function Test (KFT/RFT)
  'creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL', gender: { male: { min: 0.7, max: 1.3 }, female: { min: 0.6, max: 1.1 } } },
  'urea': { min: 7, max: 20, unit: 'mg/dL' },
  'bun': { min: 7, max: 20, unit: 'mg/dL' },
  'uric_acid': { min: 3.5, max: 7.2, unit: 'mg/dL', gender: { male: { min: 3.4, max: 7.0 }, female: { min: 2.4, max: 6.0 } } },
  'sodium': { min: 136, max: 145, unit: 'mEq/L', critical: { min: 120, max: 160 } },
  'potassium': { min: 3.5, max: 5.0, unit: 'mEq/L', critical: { min: 2.5, max: 6.5 } },
  'chloride': { min: 96, max: 106, unit: 'mEq/L' },

  // Blood Sugar
  'glucose_fasting': { min: 70, max: 100, unit: 'mg/dL', prediabetic: 100, diabetic: 126 },
  'glucose_random': { min: 70, max: 140, unit: 'mg/dL', diabetic: 200 },
  'glucose_pp': { min: 70, max: 140, unit: 'mg/dL', diabetic: 200 },
  'hba1c': { min: 4, max: 5.6, unit: '%', prediabetic: 5.7, diabetic: 6.5 },

  // Thyroid
  'tsh': { min: 0.4, max: 4.0, unit: 'μIU/mL' },
  't3': { min: 80, max: 200, unit: 'ng/dL' },
  't4': { min: 5.0, max: 12.0, unit: 'μg/dL' },

  // Other
  'esr': { min: 0, max: 20, unit: 'mm/hr', gender: { male: { max: 15 }, female: { max: 20 } } },
  'crp': { min: 0, max: 3, unit: 'mg/L', high: 10 },
  'vitamin_d': { min: 30, max: 100, unit: 'ng/mL', deficient: 20 },
  'vitamin_b12': { min: 200, max: 900, unit: 'pg/mL', deficient: 200 },
  'calcium': { min: 8.5, max: 10.5, unit: 'mg/dL' },
};

class ReportAnalysisService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('Initializing Report Analysis Service...');
    this.isInitialized = true;
    console.log('Report Analysis Service initialized');
  }

  /**
   * Analyze lab report and detect abnormalities
   */
  async analyzeReport(reportData) {
    const normalTests = [];
    const abnormalTests = [];
    const criticalFindings = [];
    let overallRisk = 'normal';

    // Use gender and age from reportData (handle both field naming conventions)
    const gender = reportData.gender || reportData.patientGender || null;
    const age = reportData.age || reportData.patientAge || null;

    // Parse and analyze each test value
    for (const test of reportData.tests || []) {
      const testAnalysis = this.analyzeTest(test, gender, age);

      if (testAnalysis.abnormal) {
        abnormalTests.push(testAnalysis);

        if (testAnalysis.severity === 'critical') {
          criticalFindings.push(testAnalysis);
          overallRisk = 'critical';
        } else if (testAnalysis.severity === 'high' && overallRisk !== 'critical') {
          overallRisk = 'high';
        } else if (testAnalysis.severity === 'moderate' && overallRisk === 'normal') {
          overallRisk = 'moderate';
        }
      } else {
        normalTests.push(testAnalysis);
      }
    }

    const analysis = {
      reportId: reportData.id,
      timestamp: new Date().toISOString(),
      totalTests: (reportData.tests || []).length,
      normalTests,
      abnormalTests,
      criticalFindings,
      warnings: this.generateWarnings(abnormalTests),
      recommendations: this.generateRecommendations(abnormalTests).map(r => r.action),
      overallRisk
    };

    // Save analysis to database
    await this.saveAnalysis(analysis, reportData);

    // Notify doctor if critical findings
    if (criticalFindings.length > 0) {
      await this.notifyDoctor(analysis, reportData);
    }

    return analysis;
  }

  /**
   * Analyze individual test
   */
  analyzeTest(test, gender = null, age = null) {
    const testName = test.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const value = parseFloat(test.value);

    // Get normal range
    let range = NORMAL_RANGES[testName];

    if (!range) {
      // Try to find alternative names
      for (const [key, val] of Object.entries(NORMAL_RANGES)) {
        if (val.alt && val.alt.toLowerCase() === test.name.toLowerCase()) {
          range = val;
          break;
        }
      }
    }

    if (!range || isNaN(value)) {
      return { abnormal: false, testName: test.name, value: test.value };
    }

    // Adjust for gender if applicable
    let min = range.min;
    let max = range.max;

    if (range.gender && gender) {
      const genderRange = range.gender[gender.toLowerCase()];
      if (genderRange) {
        min = genderRange.min !== undefined ? genderRange.min : min;
        max = genderRange.max !== undefined ? genderRange.max : max;
      }
    }

    // Determine severity
    let severity = 'normal';
    let status = 'Normal';
    let deviation = 0;

    if (value < min) {
      deviation = ((min - value) / min) * 100;
      if (range.critical && value < range.critical.min) {
        severity = 'critical';
        status = 'Critically Low';
      } else if (deviation > 50) {
        severity = 'high';
        status = 'Very Low';
      } else if (deviation > 20) {
        severity = 'moderate';
        status = 'Low';
      } else {
        severity = 'mild';
        status = 'Slightly Low';
      }
    } else if (value > max) {
      deviation = ((value - max) / max) * 100;
      if (range.critical && value > range.critical.max) {
        severity = 'critical';
        status = 'Critically High';
      } else if (range.diabetic && value >= range.diabetic) {
        severity = 'high';
        status = 'Diabetic Range';
      } else if (range.high && value >= range.high) {
        severity = 'high';
        status = 'High';
      } else if (range.borderline && value >= range.borderline) {
        severity = 'moderate';
        status = 'Borderline High';
      } else if (deviation > 50) {
        severity = 'high';
        status = 'Very High';
      } else if (deviation > 20) {
        severity = 'moderate';
        status = 'High';
      } else {
        severity = 'mild';
        status = 'Slightly High';
      }
    }

    return {
      testName: test.name,
      value: value,
      unit: range.unit,
      normalRange: `${min}-${max}`,
      abnormal: severity !== 'normal',
      severity: severity,
      status: status,
      deviation: Math.round(deviation),
      interpretation: this.getInterpretation(testName, value, severity, status)
    };
  }

  /**
   * Get interpretation for test result
   */
  getInterpretation(testName, value, severity, status) {
    const interpretations = {
      'hemoglobin': {
        'Critically Low': 'Severe anemia - immediate intervention required',
        'Very Low': 'Moderate to severe anemia - needs treatment',
        'Low': 'Mild anemia - investigate cause',
        'High': 'Possible dehydration or polycythemia'
      },
      'wbc': {
        'Critically High': 'Severe infection or leukemia - urgent evaluation needed',
        'High': 'Possible infection, inflammation, or stress',
        'Low': 'Weakened immune system - investigate cause'
      },
      'platelets': {
        'Critically Low': 'Severe bleeding risk - urgent care needed',
        'Low': 'Increased bleeding risk - monitor closely',
        'High': 'Possible clotting disorders'
      },
      'cholesterol': {
        'High': 'Increased cardiovascular risk - lifestyle changes needed',
        'Borderline High': 'Monitor and consider lifestyle modifications'
      },
      'ldl': {
        'Critically High': 'Very high cardiovascular risk - treatment required',
        'High': 'Elevated cardiovascular risk - diet and medication',
        'Borderline High': 'Borderline risk - lifestyle changes recommended'
      },
      'glucose_fasting': {
        'Diabetic Range': 'Diabetes diagnosis - treatment required',
        'High': 'Prediabetic - lifestyle changes urgently needed',
        'Borderline High': 'Impaired fasting glucose - monitor closely'
      },
      'creatinine': {
        'High': 'Possible kidney dysfunction - evaluate kidney function',
        'Very High': 'Significant kidney impairment - specialist referral'
      },
      'potassium': {
        'Critically High': 'Life-threatening - can cause cardiac arrest',
        'Critically Low': 'Life-threatening - can cause cardiac arrhythmias'
      }
    };

    return interpretations[testName]?.[status] || `${status} - requires doctor's evaluation`;
  }

  /**
   * Generate warnings
   */
  generateWarnings(abnormalities) {
    const warnings = [];

    // Check for critical combinations
    const highBP = abnormalities.some(a => a.testName.includes('Pressure'));
    const highCholesterol = abnormalities.some(a => a.testName.toLowerCase().includes('cholesterol') && a.severity !== 'mild');
    const highGlucose = abnormalities.some(a => a.testName.toLowerCase().includes('glucose') && a.severity !== 'mild');

    if (highBP && highCholesterol) {
      warnings.push({
        type: 'cardiovascular',
        message: 'High blood pressure with elevated cholesterol significantly increases heart disease risk',
        urgency: 'high'
      });
    }

    if (highGlucose && highCholesterol) {
      warnings.push({
        type: 'metabolic',
        message: 'Diabetic tendency with lipid abnormality - metabolic syndrome risk',
        urgency: 'high'
      });
    }

    // Check for anemia
    const lowHb = abnormalities.find(a => ['hemoglobin', 'hb'].includes(a.testName.toLowerCase()));
    if (lowHb && lowHb.severity !== 'mild') {
      warnings.push({
        type: 'anemia',
        message: 'Anemia detected - investigate underlying cause',
        urgency: lowHb.severity === 'critical' ? 'critical' : 'moderate'
      });
    }

    return warnings;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(abnormalities) {
    const recommendations = [];

    for (const abnormality of abnormalities) {
      if (abnormality.severity === 'critical') {
        recommendations.push({
          test: abnormality.testName,
          action: 'Immediate medical attention required',
          priority: 'urgent'
        });
      } else if (abnormality.severity === 'high') {
        recommendations.push({
          test: abnormality.testName,
          action: 'Schedule follow-up consultation within 3-7 days',
          priority: 'high'
        });
      } else if (abnormality.severity === 'moderate') {
        recommendations.push({
          test: abnormality.testName,
          action: 'Repeat test in 2-4 weeks, monitor closely',
          priority: 'moderate'
        });
      }
    }

    return recommendations;
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(analysis, reportData) {
    const patientId = typeof reportData === 'object' ? reportData.patientId : reportData;

    // Build results array compatible with PatientDetails display
    const allTests = [...(analysis.normalTests || []), ...(analysis.abnormalTests || [])];
    const results = allTests.map(t => ({
      testName: t.testName,
      value: t.value,
      unit: t.unit || '',
      range: t.normalRange || '',
      status: t.status || 'Normal'
    }));

    await db.labReports.add({
      patientId: patientId,
      uhid: typeof reportData === 'object' ? reportData.uhid : null,
      testType: 'Lab Analysis',
      results,
      analysisData: analysis,
      abnormalitiesCount: (analysis.abnormalTests || []).length,
      criticalCount: (analysis.criticalFindings || []).length,
      overallRisk: analysis.overallRisk,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      reviewed: false
    });
  }

  /**
   * Notify doctor of critical findings
   */
  async notifyDoctor(analysis, reportData) {
    const criticalNames = analysis.criticalFindings.map(f => f.testName).join(', ');
    // Create alert in database
    await db.alerts?.add({
      type: 'lab_critical',
      patientId: reportData.patientId,
      priority: 'critical',
      title: `Critical Lab Results - ${reportData.patientName || 'Patient'}`,
      message: `Critical values detected: ${criticalNames}`,
      metadata: {
        patientName: reportData.patientName,
        uhid: reportData.uhid,
        details: analysis.criticalFindings
      },
      createdAt: new Date().toISOString(),
      read: false
    });

    // You can add push notification, SMS, or email here
    console.log('🚨 CRITICAL ALERT:', analysis.criticalFindings);
  }

  /**
   * Get abnormal reports for patient
   */
  async getAbnormalReports(patientId) {
    return await db.labReports
      .where('patientId')
      .equals(patientId)
      .and(report => report.abnormalitiesCount > 0)
      .reverse()
      .toArray();
  }

  /**
   * Get all pending critical alerts
   */
  async getCriticalAlerts() {
    return await db.alerts
      ?.where('read')
      .equals(false)
      .and(alert => alert.priority === 'urgent')
      .reverse()
      .toArray() || [];
  }
}

export const reportAnalysisService = new ReportAnalysisService();
export default reportAnalysisService;
