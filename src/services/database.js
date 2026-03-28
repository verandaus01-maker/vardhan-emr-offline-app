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

// Version 2: Add alerts table for critical findings
db.version(2).stores({
  alerts: '++id, type, patientId, priority, read, createdAt'
});

// Version 3: Add users table for authentication and authorization
db.version(3).stores({
  users: '++id, &username, email, role, isActive, createdAt, lastLogin'
});

// Version 4: Add compound indexes for appointments and dailyStats queries
db.version(4).stores({
  appointments: '++id, patientId, uhid, date, status, doctorId, syncStatus, createdAt, [date+doctorId]',
  dailyStats: '++id, date, doctorId, totalPatients, totalPrescriptions, [date+doctorId]'
});

// Version 5: Add status index to prescriptions for 2-stage workflow
// status: 'staff_draft' (filled by staff, awaiting doctor) | 'doctor_complete' (doctor finished)
db.version(5).stores({
  prescriptions: '++id, patientId, uhid, date, doctorId, diagnosis, status, syncStatus, createdAt, updatedAt'
});

// Version 6: Backfill status field on all existing prescriptions that have no status
// (prescriptions created before the 2-stage workflow was added have status = undefined)
db.version(6).stores({}).upgrade(async tx => {
  await tx.table('prescriptions').toCollection().modify(rx => {
    if (!rx.status) {
      rx.status = rx.diagnosis ? 'doctor_complete' : 'staff_draft';
    }
  });
});

// Database helper functions
export class DatabaseService {
  // Expose db instance for direct access
  static db = db;

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
    const lowerQuery = query.toLowerCase().trim();
    const results = new Map(); // Use Map to avoid duplicates

    try {
      // Fast indexed search by UHID (exact match)
      if (query.length >= 2) {
        const uhidMatches = await db.patients
          .where('uhid')
          .startsWithIgnoreCase(query)
          .limit(50)
          .toArray();
        uhidMatches.forEach(p => results.set(p.id, p));
      }

      // Fast indexed search by phone (starts with)
      if (/^\d/.test(query)) {
        const phoneMatches = await db.patients
          .where('phone')
          .startsWith(query)
          .limit(50)
          .toArray();
        phoneMatches.forEach(p => results.set(p.id, p));
      }

      // Name search with filter (for partial matches)
      if (query.length >= 2 && results.size < 50) {
        const nameMatches = await db.patients
          .filter(patient =>
            patient.name?.toLowerCase().includes(lowerQuery)
          )
          .limit(50)
          .toArray();
        nameMatches.forEach(p => results.set(p.id, p));
      }

      return Array.from(results.values()).slice(0, 50);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
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

  static async updatePrescription(id, updates) {
    const updated = {
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };
    await db.prescriptions.update(id, updated);
    // Replace medications if provided
    if (updates.medications !== undefined) {
      await db.medications.where('prescriptionId').equals(id).delete();
      if (updates.medications.length > 0) {
        const prescription = await db.prescriptions.get(id);
        await Promise.all(
          updates.medications.map(med =>
            db.medications.add({
              ...med,
              prescriptionId: id,
              patientId: prescription?.patientId,
              createdAt: new Date().toISOString()
            })
          )
        );
      }
    }
    await this.addToSyncQueue('prescriptions', 'update', { id, ...updated });
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

  /**
   * Remove local duplicate prescriptions and vitals.
   * Keeps the FIRST (lowest id) record for each unique uhid+createdAt pair.
   * Returns count of records removed.
   */
  static async deduplicateLocalData() {
    const result = { prescriptions: 0, vitals: 0 };

    // Deduplicate prescriptions
    const allRx = await db.prescriptions.orderBy('id').toArray();
    const seenRx = new Map();
    const dupRxIds = [];
    for (const rx of allRx) {
      const key = `${rx.uhid || rx.patientId || ''}|${rx.createdAt || ''}`;
      if (seenRx.has(key)) {
        dupRxIds.push(rx.id);
      } else {
        seenRx.set(key, rx.id);
      }
    }
    if (dupRxIds.length > 0) {
      await db.prescriptions.bulkDelete(dupRxIds);
      result.prescriptions = dupRxIds.length;
    }

    // Deduplicate vitals
    const allVitals = await db.vitals.orderBy('id').toArray();
    const seenVitals = new Map();
    const dupVitalIds = [];
    for (const v of allVitals) {
      const key = `${v.uhid || v.patientId || ''}|${v.createdAt || ''}`;
      if (seenVitals.has(key)) {
        dupVitalIds.push(v.id);
      } else {
        seenVitals.set(key, v.id);
      }
    }
    if (dupVitalIds.length > 0) {
      await db.vitals.bulkDelete(dupVitalIds);
      result.vitals = dupVitalIds.length;
    }

    console.log(`Local dedup: removed ${result.prescriptions} prescription dupes, ${result.vitals} vital dupes`);
    return result;
  }
}

export default DatabaseService;
