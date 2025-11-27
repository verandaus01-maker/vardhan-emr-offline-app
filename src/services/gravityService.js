import DatabaseService, { db } from './database';

/**
 * Gravity Software Integration Service
 * Syncs appointment and walk-in data from Gravity HMS
 */
class GravityIntegrationService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.listeners = [];
  }

  /**
   * Initialize Gravity integration
   */
  async initialize() {
    console.log('Initializing Gravity integration...');

    // Load last sync time
    this.lastSyncTime = await DatabaseService.getSetting('gravityLastSyncTime');

    // Set up auto-sync (every 2 minutes for real-time updates)
    this.startAutoSync(2);

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());

    console.log('Gravity integration initialized');
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes = 2) {
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
    console.log('Device online - syncing with Gravity');
    if (!this.isSyncing) {
      await this.performSync();
    }
  }

  /**
   * Main sync function
   */
  async performSync() {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      return { success: false, message: 'Device is offline' };
    }

    this.isSyncing = true;
    this.notifyListeners('syncStart', { timestamp: new Date() });

    try {
      console.log('Starting Gravity sync...');

      // Get Gravity API credentials
      const apiUrl = await DatabaseService.getSetting('gravityApiUrl');
      const apiKey = await DatabaseService.getSetting('gravityApiKey');

      if (!apiUrl || !apiKey) {
        throw new Error('Gravity API credentials not configured');
      }

      // Sync appointments
      const appointments = await this.syncAppointments(apiUrl, apiKey);

      // Sync walk-ins
      const walkIns = await this.syncWalkIns(apiUrl, apiKey);

      // Update last sync time
      const now = new Date().toISOString();
      await DatabaseService.setSetting('gravityLastSyncTime', now);
      this.lastSyncTime = now;

      const result = {
        success: true,
        timestamp: now,
        appointments: appointments.count,
        walkIns: walkIns.count
      };

      this.notifyListeners('syncComplete', result);

      console.log('Gravity sync completed:', result);
      return result;

    } catch (error) {
      console.error('Gravity sync failed:', error);
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
   * Sync appointments from Gravity
   */
  async syncAppointments(apiUrl, apiKey) {
    const since = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const response = await fetch(`${apiUrl}/api/appointments?since=${since}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Gravity API error: ${response.status}`);
      }

      const appointments = await response.json();

      let synced = 0;
      for (const appointment of appointments) {
        await this.processAppointment(appointment);
        synced++;
      }

      console.log(`Synced ${synced} appointments from Gravity`);

      return { count: synced, data: appointments };

    } catch (error) {
      console.error('Failed to sync appointments:', error);
      throw error;
    }
  }

  /**
   * Sync walk-ins from Gravity
   */
  async syncWalkIns(apiUrl, apiKey) {
    const since = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const response = await fetch(`${apiUrl}/api/walkins?since=${since}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Gravity API error: ${response.status}`);
      }

      const walkIns = await response.json();

      let synced = 0;
      for (const walkIn of walkIns) {
        await this.processWalkIn(walkIn);
        synced++;
      }

      console.log(`Synced ${synced} walk-ins from Gravity`);

      return { count: synced, data: walkIns };

    } catch (error) {
      console.error('Failed to sync walk-ins:', error);
      throw error;
    }
  }

  /**
   * Process appointment from Gravity
   */
  async processAppointment(gravityAppointment) {
    // Check if patient exists
    let patient = await db.patients.where('phone').equals(gravityAppointment.patientPhone).first();

    if (!patient) {
      // Create new patient
      const patientId = await DatabaseService.addPatient({
        name: gravityAppointment.patientName,
        age: gravityAppointment.patientAge || 0,
        gender: gravityAppointment.patientGender || 'Unknown',
        phone: gravityAppointment.patientPhone,
        email: gravityAppointment.patientEmail || '',
        address: gravityAppointment.patientAddress || '',
        registrationDate: new Date().toISOString(),
        source: 'gravity'
      });

      patient = await DatabaseService.getPatient(patientId);
    }

    // Check if appointment already exists
    const existing = await db.appointments
      .where('[patientId+date]')
      .equals([patient.id, gravityAppointment.date])
      .first();

    if (!existing) {
      // Create appointment
      await DatabaseService.addAppointment({
        patientId: patient.id,
        uhid: patient.uhid,
        date: gravityAppointment.date,
        time: gravityAppointment.time,
        doctorId: gravityAppointment.doctorId || 1,
        status: gravityAppointment.status || 'scheduled',
        type: 'appointment',
        patientName: patient.name,
        notes: gravityAppointment.notes || '',
        source: 'gravity',
        gravityId: gravityAppointment.id
      });

      console.log(`Created appointment for ${patient.name}`);
    } else {
      // Update existing appointment
      await db.appointments.update(existing.id, {
        status: gravityAppointment.status,
        time: gravityAppointment.time,
        notes: gravityAppointment.notes || '',
        updatedAt: new Date().toISOString()
      });

      console.log(`Updated appointment for ${patient.name}`);
    }
  }

  /**
   * Process walk-in from Gravity
   */
  async processWalkIn(gravityWalkIn) {
    // Check if patient exists
    let patient = await db.patients.where('phone').equals(gravityWalkIn.patientPhone).first();

    if (!patient) {
      // Create new patient
      const patientId = await DatabaseService.addPatient({
        name: gravityWalkIn.patientName,
        age: gravityWalkIn.patientAge || 0,
        gender: gravityWalkIn.patientGender || 'Unknown',
        phone: gravityWalkIn.patientPhone,
        email: gravityWalkIn.patientEmail || '',
        address: gravityWalkIn.patientAddress || '',
        registrationDate: new Date().toISOString(),
        source: 'gravity_walkin'
      });

      patient = await DatabaseService.getPatient(patientId);
    }

    // Create appointment with walk-in type
    await DatabaseService.addAppointment({
      patientId: patient.id,
      uhid: patient.uhid,
      date: gravityWalkIn.date || new Date().toISOString().split('T')[0],
      time: gravityWalkIn.time || new Date().toLocaleTimeString('en-US', { hour12: false }),
      doctorId: gravityWalkIn.doctorId || 1,
      status: 'in-progress',
      type: 'walk-in',
      patientName: patient.name,
      notes: 'Walk-in patient from Gravity',
      source: 'gravity',
      gravityId: gravityWalkIn.id
    });

    console.log(`Processed walk-in for ${patient.name}`);
  }

  /**
   * Push appointment to Gravity (when created in EMR)
   */
  async pushAppointmentToGravity(appointmentId) {
    const apiUrl = await DatabaseService.getSetting('gravityApiUrl');
    const apiKey = await DatabaseService.getSetting('gravityApiKey');

    if (!apiUrl || !apiKey) {
      console.log('Gravity not configured - skipping push');
      return;
    }

    const appointment = await db.appointments.get(appointmentId);
    const patient = await db.patients.get(appointment.patientId);

    try {
      const response = await fetch(`${apiUrl}/api/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientName: patient.name,
          patientPhone: patient.phone,
          patientEmail: patient.email,
          date: appointment.date,
          time: appointment.time,
          doctorId: appointment.doctorId,
          status: appointment.status,
          notes: appointment.notes
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to push to Gravity: ${response.status}`);
      }

      const result = await response.json();

      // Update with Gravity ID
      await db.appointments.update(appointmentId, {
        gravityId: result.id,
        syncedToGravity: true
      });

      console.log('Pushed appointment to Gravity:', result.id);

    } catch (error) {
      console.error('Failed to push appointment to Gravity:', error);
      // Don't throw - let it retry later
    }
  }

  /**
   * Add listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in Gravity listener:', error);
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
export const gravityService = new GravityIntegrationService();
export default gravityService;
