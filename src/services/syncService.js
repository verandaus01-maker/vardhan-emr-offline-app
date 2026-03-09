import DatabaseService, { db } from './database';

/**
 * Sync Service for integrating with Doc On / Doctors App
 * Handles bidirectional sync between offline database and cloud
 */
class SyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.listeners = [];
  }

  /**
   * Initialize sync service
   */
  async initialize() {
    // Load last sync time from settings
    this.lastSyncTime = await DatabaseService.getSetting('lastSyncTime');

    // Set up auto-sync interval (every 5 minutes when online)
    this.startAutoSync();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    console.log('Sync service initialized');
  }

  /**
   * Start automatic sync when online
   */
  startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.performSync();
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    console.log('Device is online - starting sync');
    this.notifyListeners('online', { isOnline: true });

    // Trigger sync after a short delay
    setTimeout(() => {
      if (!this.isSyncing) {
        this.performSync();
      }
    }, 2000);
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Device is offline');
    this.notifyListeners('offline', { isOnline: false });
  }

  /**
   * Main sync function
   */
  async performSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      console.log('Cannot sync - device is offline');
      return { success: false, message: 'Device is offline' };
    }

    this.isSyncing = true;
    this.notifyListeners('syncStart', { timestamp: new Date() });

    try {
      console.log('Starting sync process...');

      // Step 1: Push local changes to cloud
      const uploadResult = await this.uploadLocalChanges();

      // Step 2: Pull cloud changes to local
      const downloadResult = await this.downloadCloudChanges();

      // Step 3: Update last sync time
      const now = new Date().toISOString();
      await DatabaseService.setSetting('lastSyncTime', now);
      this.lastSyncTime = now;

      const result = {
        success: true,
        timestamp: now,
        uploaded: uploadResult,
        downloaded: downloadResult
      };

      this.notifyListeners('syncComplete', result);

      console.log('Sync completed successfully', result);
      return result;

    } catch (error) {
      console.error('Sync failed:', error);

      await DatabaseService.logSync('all', 'sync', 'failed', error.message);

      this.notifyListeners('syncError', { error: error.message });

      return {
        success: false,
        message: error.message,
        error
      };

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Upload local changes to cloud (Doc On API)
   */
  async uploadLocalChanges() {
    const pendingItems = await DatabaseService.getPendingSyncItems(100);

    if (pendingItems.length === 0) {
      console.log('No pending items to upload');
      return { count: 0, items: [] };
    }

    console.log(`Uploading ${pendingItems.length} pending items...`);

    const results = {
      success: 0,
      failed: 0,
      items: []
    };

    for (const item of pendingItems) {
      try {
        // Call Doc On API based on entity type
        await this.uploadToDocOn(item);

        // Mark as synced
        await DatabaseService.markSyncItemComplete(item.id);

        // Update entity sync status
        await this.updateEntitySyncStatus(item.entity, item.data.id, 'synced');

        results.success++;
        results.items.push({ id: item.id, status: 'success' });

        await DatabaseService.logSync(item.entity, item.action, 'success', 'Uploaded successfully');

      } catch (error) {
        console.error(`Failed to upload item ${item.id}:`, error);

        await DatabaseService.markSyncItemFailed(item.id, error.message);

        results.failed++;
        results.items.push({ id: item.id, status: 'failed', error: error.message });

        await DatabaseService.logSync(item.entity, item.action, 'failed', error.message);
      }
    }

    console.log(`Upload complete: ${results.success} success, ${results.failed} failed`);

    return results;
  }

  /**
   * Upload data to Doc On API
   */
  async uploadToDocOn(item) {
    // Get API endpoint and credentials from settings
    const apiUrl = await DatabaseService.getSetting('docOnApiUrl');
    const apiKey = await DatabaseService.getSetting('docOnApiKey');

    if (!apiUrl || !apiKey) {
      throw new Error('Doc On API credentials not configured');
    }

    // Map entity to API endpoint
    const endpoints = {
      patients: '/api/patients',
      prescriptions: '/api/prescriptions',
      vitals: '/api/vitals',
      appointments: '/api/appointments',
      labReports: '/api/lab-reports'
    };

    const endpoint = endpoints[item.entity];
    if (!endpoint) {
      throw new Error(`Unknown entity type: ${item.entity}`);
    }

    // Make API call
    const method = item.action === 'create' ? 'POST' : 'PUT';
    const url = item.action === 'create' ?
      `${apiUrl}${endpoint}` :
      `${apiUrl}${endpoint}/${item.data.id}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Client': 'Vardhan-EMR-Offline'
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * Download changes from cloud
   */
  async downloadCloudChanges() {
    const apiUrl = await DatabaseService.getSetting('docOnApiUrl');
    const apiKey = await DatabaseService.getSetting('docOnApiKey');

    if (!apiUrl || !apiKey) {
      console.log('Doc On API not configured - skipping download');
      return { count: 0, items: [] };
    }

    try {
      // Get changes since last sync
      const since = this.lastSyncTime || new Date(0).toISOString();

      const response = await fetch(`${apiUrl}/api/sync/changes?since=${since}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Client': 'Vardhan-EMR-Offline'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const changes = await response.json();

      // Apply changes to local database
      const results = await this.applyCloudChanges(changes);

      return results;

    } catch (error) {
      console.error('Failed to download cloud changes:', error);
      throw error;
    }
  }

  /**
   * Apply cloud changes to local database
   */
  async applyCloudChanges(changes) {
    const results = {
      patients: 0,
      prescriptions: 0,
      vitals: 0,
      appointments: 0,
      labReports: 0
    };

    // Apply patient changes
    if (changes.patients) {
      for (const patient of changes.patients) {
        await this.mergePatient(patient);
        results.patients++;
      }
    }

    // Apply prescription changes
    if (changes.prescriptions) {
      for (const prescription of changes.prescriptions) {
        await this.mergePrescription(prescription);
        results.prescriptions++;
      }
    }

    // Apply vitals changes
    if (changes.vitals) {
      for (const vital of changes.vitals) {
        await this.mergeVitals(vital);
        results.vitals++;
      }
    }

    // Apply appointment changes
    if (changes.appointments) {
      for (const appointment of changes.appointments) {
        await this.mergeAppointment(appointment);
        results.appointments++;
      }
    }

    // Apply lab report changes
    if (changes.labReports) {
      for (const report of changes.labReports) {
        await this.mergeLabReport(report);
        results.labReports++;
      }
    }

    console.log('Applied cloud changes:', results);
    return results;
  }

  /**
   * Merge patient data with conflict resolution
   */
  async mergePatient(cloudPatient) {
    const localPatient = await db.patients.where('uhid').equals(cloudPatient.uhid).first();

    if (!localPatient) {
      // New patient from cloud
      await db.patients.add({
        ...cloudPatient,
        syncStatus: 'synced'
      });
    } else {
      // Conflict resolution: use most recent update
      const cloudTime = new Date(cloudPatient.updatedAt);
      const localTime = new Date(localPatient.updatedAt);

      if (cloudTime > localTime) {
        // Cloud version is newer
        await db.patients.update(localPatient.id, {
          ...cloudPatient,
          id: localPatient.id,
          syncStatus: 'synced'
        });
      }
      // If local is newer, it will be uploaded in next sync
    }
  }

  /**
   * Merge prescription data — deduplicated by uhid+createdAt so that
   * locally-created records (different local ID vs cloud ID) are not doubled.
   */
  async mergePrescription(cloudPrescription) {
    // 1. Fast check by primary key (works when cloud & local IDs match)
    if (cloudPrescription.id) {
      const existingById = await db.prescriptions.get(cloudPrescription.id);
      if (existingById) return;
    }
    // 2. Dedup check by uhid+createdAt (catches locally-created records
    //    that were uploaded and came back from cloud with a different ID)
    if (cloudPrescription.createdAt) {
      const key = cloudPrescription.uhid || String(cloudPrescription.patientId || '');
      if (key) {
        const existingByTime = await db.prescriptions
          .where('createdAt').equals(cloudPrescription.createdAt)
          .filter(p => (cloudPrescription.uhid ? p.uhid === cloudPrescription.uhid : p.patientId === cloudPrescription.patientId))
          .first();
        if (existingByTime) return;
      }
    }
    await db.prescriptions.add({ ...cloudPrescription, syncStatus: 'synced' });
  }

  /**
   * Merge vitals data — deduplicated by uhid+createdAt.
   */
  async mergeVitals(cloudVitals) {
    // 1. Fast check by primary key
    if (cloudVitals.id) {
      const existingById = await db.vitals.get(cloudVitals.id);
      if (existingById) return;
    }
    // 2. Dedup check by uhid+createdAt
    if (cloudVitals.createdAt) {
      const existingByTime = await db.vitals
        .where('createdAt').equals(cloudVitals.createdAt)
        .filter(v => (cloudVitals.uhid ? v.uhid === cloudVitals.uhid : v.patientId === cloudVitals.patientId))
        .first();
      if (existingByTime) return;
    }
    await db.vitals.add({ ...cloudVitals, syncStatus: 'synced' });
  }

  /**
   * Merge appointment data
   */
  async mergeAppointment(cloudAppointment) {
    const existing = await db.appointments.get(cloudAppointment.id);

    if (!existing) {
      await db.appointments.add({
        ...cloudAppointment,
        syncStatus: 'synced'
      });
    } else {
      // Update if cloud version is newer
      const cloudTime = new Date(cloudAppointment.updatedAt || cloudAppointment.createdAt);
      const localTime = new Date(existing.updatedAt || existing.createdAt);

      if (cloudTime > localTime) {
        await db.appointments.update(existing.id, {
          ...cloudAppointment,
          id: existing.id,
          syncStatus: 'synced'
        });
      }
    }
  }

  /**
   * Merge lab report data
   */
  async mergeLabReport(cloudReport) {
    const existing = await db.labReports.get(cloudReport.id);

    if (!existing) {
      await db.labReports.add({
        ...cloudReport,
        syncStatus: 'synced'
      });
    }
  }

  /**
   * Update entity sync status
   */
  async updateEntitySyncStatus(entity, id, status) {
    const tables = {
      patients: db.patients,
      prescriptions: db.prescriptions,
      vitals: db.vitals,
      appointments: db.appointments,
      labReports: db.labReports
    };

    const table = tables[entity];
    if (table) {
      await table.update(id, { syncStatus: status });
    }
  }

  /**
   * Import patient data from Doc On
   * Used for initial migration of 27,000 patients
   */
  async importPatientsFromDocOn(progressCallback) {
    const apiUrl = await DatabaseService.getSetting('docOnApiUrl');
    const apiKey = await DatabaseService.getSetting('docOnApiKey');

    if (!apiUrl || !apiKey) {
      throw new Error('Doc On API credentials not configured');
    }

    try {
      console.log('Starting patient import from Doc On...');

      let page = 1;
      const pageSize = 500;
      let totalImported = 0;

      while (true) {
        // Fetch patients page by page
        const response = await fetch(
          `${apiUrl}/api/patients?page=${page}&pageSize=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'X-Client': 'Vardhan-EMR-Offline'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const patients = data.patients || data;

        if (!patients || patients.length === 0) {
          break;
        }

        // Import patients
        for (const patient of patients) {
          try {
            // Check if patient already exists
            const existing = await db.patients.where('uhid').equals(patient.uhid).first();

            if (!existing) {
              await db.patients.add({
                ...patient,
                syncStatus: 'synced',
                importedAt: new Date().toISOString()
              });
              totalImported++;
            }
          } catch (error) {
            console.error(`Failed to import patient ${patient.uhid}:`, error);
          }
        }

        console.log(`Imported ${totalImported} patients so far...`);

        // Call progress callback
        if (progressCallback) {
          progressCallback({
            page,
            count: patients.length,
            total: totalImported
          });
        }

        // Check if there are more pages
        if (patients.length < pageSize) {
          break;
        }

        page++;

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`Import complete: ${totalImported} patients imported`);

      await DatabaseService.logSync('patients', 'import', 'success',
        `Imported ${totalImported} patients from Doc On`);

      return {
        success: true,
        totalImported
      };

    } catch (error) {
      console.error('Import failed:', error);
      await DatabaseService.logSync('patients', 'import', 'failed', error.message);
      throw error;
    }
  }

  /**
   * Add sync listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      isOnline: navigator.onLine
    };
  }

  /**
   * Force sync now
   */
  async syncNow() {
    return await this.performSync();
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
