import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('VardhanEMRDatabase');

// Define database schema
db.version(1).stores({
  // Core entities
  patients: '++id, &uhid, name, phone, aadhaar, email, createdAt, updatedAt, syncStatus',
  prescriptions: '++id, patientId, uhid, date, doctorId, diagnosis, syncStatus, createdAt, updatedAt',
  vitals: '++id, patientId, uhid, date, recordedBy, syncStatus, createdAt',
  appointments: '++id, patientId, uhid, date, status, doctorId, syncStatus, createdAt',
  labReports: '++id, patientId, uhid, date, testType, syncStatus, createdAt',
  medications: '++id, patientId, prescriptionId, drugName, frequency, duration, createdAt',

  // System entities
  doctors: '++id, name, specialization, qualification, phone, email',
  settings: '++id, key, value',
  syncQueue: '++id, entity, action, data, status, attempts, createdAt',
  syncLog: '++id, timestamp, entity, action, status, message',

  // Templates and resources
  drugDatabase: '++id, name, genericName, category, dosageForm, commonDosages',
  prescriptionTemplates: '++id, doctorId, name, diagnosis, medications, advice',
  diagnosisTemplates: '++id, name, category, icdCode, commonMedications',

  // Analytics and reports
  dailyStats: '++id, date, doctorId, totalPatients, totalPrescriptions',
  backups: '++id, timestamp, size, status, filename'
});

// Database helper functions
export class DatabaseService {
  // Patient operations
  static async addPatient(patientData) {
    const patient = {
      ...patientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    const id = await db.patients.add(patient);
    await this.addToSyncQueue('patients', 'create', { id, ...patient });
    return id;
  }

  static async updatePatient(id, updates) {
    const updated = {
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    await db.patients.update(id, updated);
    await this.addToSyncQueue('patients', 'update', { id, ...updated });
  }

  static async getPatient(id) {
    return await db.patients.get(id);
  }

  static async getPatientByUHID(uhid) {
    return await db.patients.where('uhid').equals(uhid).first();
  }

  static async searchPatients(query) {
    const lowerQuery = query.toLowerCase();

    // Search by multiple fields
    const results = await db.patients.filter(patient =>
      patient.name?.toLowerCase().includes(lowerQuery) ||
      patient.uhid?.toLowerCase().includes(lowerQuery) ||
      patient.phone?.includes(query) ||
      patient.aadhaar?.includes(query) ||
      patient.email?.toLowerCase().includes(lowerQuery)
    ).toArray();

    return results;
  }

  static async getAllPatients(limit = 100, offset = 0) {
    return await db.patients
      .orderBy('updatedAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  // Prescription operations
  static async addPrescription(prescriptionData) {
    const prescription = {
      ...prescriptionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    const id = await db.prescriptions.add(prescription);

    // Add medications
    if (prescriptionData.medications && prescriptionData.medications.length > 0) {
      await Promise.all(
        prescriptionData.medications.map(med =>
          db.medications.add({
            ...med,
            prescriptionId: id,
            patientId: prescriptionData.patientId,
            createdAt: new Date().toISOString()
          })
        )
      );
    }

    await this.addToSyncQueue('prescriptions', 'create', { id, ...prescription });
    return id;
  }

  static async getPrescriptionsByPatient(patientId, limit = 50) {
    return await db.prescriptions
      .where('patientId')
      .equals(patientId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getPrescription(id) {
    const prescription = await db.prescriptions.get(id);
    if (prescription) {
      const medications = await db.medications
        .where('prescriptionId')
        .equals(id)
        .toArray();
      return { ...prescription, medications };
    }
    return null;
  }

  // Vitals operations
  static async addVitals(vitalsData) {
    const vitals = {
      ...vitalsData,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    const id = await db.vitals.add(vitals);
    await this.addToSyncQueue('vitals', 'create', { id, ...vitals });
    return id;
  }

  static async getVitalsByPatient(patientId, limit = 20) {
    return await db.vitals
      .where('patientId')
      .equals(patientId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getLatestVitals(patientId) {
    return await db.vitals
      .where('patientId')
      .equals(patientId)
      .reverse()
      .first();
  }

  // Appointment operations
  static async addAppointment(appointmentData) {
    const appointment = {
      ...appointmentData,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      status: appointmentData.status || 'scheduled'
    };
    const id = await db.appointments.add(appointment);
    await this.addToSyncQueue('appointments', 'create', { id, ...appointment });
    return id;
  }

  static async updateAppointmentStatus(id, status) {
    await db.appointments.update(id, {
      status,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    });
    await this.addToSyncQueue('appointments', 'update', { id, status });
  }

  static async getAppointmentsByDate(date, doctorId) {
    return await db.appointments
      .where('[date+doctorId]')
      .equals([date, doctorId])
      .toArray();
  }

  static async getTodayAppointments(doctorId) {
    const today = new Date().toISOString().split('T')[0];
    return await this.getAppointmentsByDate(today, doctorId);
  }

  // Doctor operations
  static async addDoctor(doctorData) {
    return await db.doctors.add(doctorData);
  }

  static async getDoctor(id) {
    return await db.doctors.get(id);
  }

  static async getAllDoctors() {
    return await db.doctors.toArray();
  }

  // Settings operations
  static async getSetting(key) {
    const setting = await db.settings.where('key').equals(key).first();
    return setting ? setting.value : null;
  }

  static async setSetting(key, value) {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id, { value });
    } else {
      await db.settings.add({ key, value });
    }
  }

  // Sync queue operations
  static async addToSyncQueue(entity, action, data) {
    return await db.syncQueue.add({
      entity,
      action,
      data,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString()
    });
  }

  static async getPendingSyncItems(limit = 50) {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .limit(limit)
      .toArray();
  }

  static async markSyncItemComplete(id) {
    await db.syncQueue.update(id, { status: 'completed' });
  }

  static async markSyncItemFailed(id, error) {
    const item = await db.syncQueue.get(id);
    await db.syncQueue.update(id, {
      status: 'failed',
      attempts: (item.attempts || 0) + 1,
      lastError: error
    });
  }

  static async logSync(entity, action, status, message) {
    return await db.syncLog.add({
      timestamp: new Date().toISOString(),
      entity,
      action,
      status,
      message
    });
  }

  // Drug database operations
  static async searchDrugs(query) {
    const lowerQuery = query.toLowerCase();
    return await db.drugDatabase.filter(drug =>
      drug.name?.toLowerCase().includes(lowerQuery) ||
      drug.genericName?.toLowerCase().includes(lowerQuery)
    ).limit(20).toArray();
  }

  static async addDrug(drugData) {
    return await db.drugDatabase.add(drugData);
  }

  // Template operations
  static async getPrescriptionTemplates(doctorId) {
    return await db.prescriptionTemplates
      .where('doctorId')
      .equals(doctorId)
      .toArray();
  }

  static async savePrescriptionTemplate(templateData) {
    return await db.prescriptionTemplates.add(templateData);
  }

  // Statistics
  static async getDailyStats(date, doctorId) {
    return await db.dailyStats
      .where('[date+doctorId]')
      .equals([date, doctorId])
      .first();
  }

  static async updateDailyStats(date, doctorId, stats) {
    const existing = await this.getDailyStats(date, doctorId);
    if (existing) {
      await db.dailyStats.update(existing.id, stats);
    } else {
      await db.dailyStats.add({ date, doctorId, ...stats });
    }
  }

  // Backup operations
  static async createBackup() {
    const timestamp = new Date().toISOString();
    const data = {
      patients: await db.patients.toArray(),
      prescriptions: await db.prescriptions.toArray(),
      vitals: await db.vitals.toArray(),
      appointments: await db.appointments.toArray(),
      medications: await db.medications.toArray(),
      labReports: await db.labReports.toArray(),
      timestamp
    };

    const jsonData = JSON.stringify(data);
    const size = new Blob([jsonData]).size;

    await db.backups.add({
      timestamp,
      size,
      status: 'completed',
      filename: `vardhan-emr-backup-${timestamp}.json`
    });

    return { data: jsonData, filename: `vardhan-emr-backup-${timestamp}.json` };
  }

  static async restoreBackup(backupData) {
    const data = JSON.parse(backupData);

    // Clear existing data
    await db.patients.clear();
    await db.prescriptions.clear();
    await db.vitals.clear();
    await db.appointments.clear();
    await db.medications.clear();
    await db.labReports.clear();

    // Restore data
    await db.patients.bulkAdd(data.patients);
    await db.prescriptions.bulkAdd(data.prescriptions);
    await db.vitals.bulkAdd(data.vitals);
    await db.appointments.bulkAdd(data.appointments);
    await db.medications.bulkAdd(data.medications);
    if (data.labReports) {
      await db.labReports.bulkAdd(data.labReports);
    }

    return true;
  }

  // Get database statistics
  static async getStats() {
    const [patients, prescriptions, vitals, appointments, pendingSync] = await Promise.all([
      db.patients.count(),
      db.prescriptions.count(),
      db.vitals.count(),
      db.appointments.count(),
      db.syncQueue.where('status').equals('pending').count()
    ]);

    return {
      totalPatients: patients,
      totalPrescriptions: prescriptions,
      totalVitals: vitals,
      totalAppointments: appointments,
      pendingSyncItems: pendingSync
    };
  }

  // Clear all data (use with caution)
  static async clearAllData() {
    await db.delete();
    await db.open();
  }
}

export default DatabaseService;
