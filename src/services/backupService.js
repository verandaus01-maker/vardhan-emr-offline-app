import DatabaseService from './database';
import { db } from './database';

/**
 * Backup and Restore Service
 * Handles automatic backups, manual backups, and data restoration
 * CRITICAL for production deployment - prevents data loss
 */

class BackupService {
  constructor() {
    this.AUTO_BACKUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    this.MAX_AUTO_BACKUPS = 5;
    this.backupTimer = null;
  }

  /**
   * Initialize backup service with automatic backups
   */
  async initialize() {
    console.log('🔄 Initializing Backup Service...');

    // Check for existing backups
    await this.checkAndRestoreLastBackup();

    // Start automatic backup
    this.startAutomaticBackup();

    console.log('✅ Backup Service initialized');
  }

  /**
   * Start automatic backup every hour
   */
  startAutomaticBackup() {
    // Clear any existing timer
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    // Create initial backup
    this.createAutomaticBackup();

    // Set up recurring backup
    this.backupTimer = setInterval(() => {
      this.createAutomaticBackup();
    }, this.AUTO_BACKUP_INTERVAL);

    console.log('⏰ Automatic backup scheduled every hour');
  }

  /**
   * Stop automatic backup
   */
  stopAutomaticBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      console.log('⏸️ Automatic backup stopped');
    }
  }

  /**
   * Create automatic backup to localStorage
   */
  async createAutomaticBackup() {
    try {
      console.log('📦 Creating automatic backup...');

      const backup = await this.exportDatabase();
      const timestamp = new Date().toISOString();

      // Save to localStorage
      const backupKey = `nexacare_auto_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify({
        timestamp,
        data: backup,
        version: '1.0',
        type: 'automatic'
      }));

      // Clean up old backups
      this.cleanupOldBackups();

      console.log('✅ Automatic backup created:', timestamp);
      return true;
    } catch (error) {
      console.error('❌ Automatic backup failed:', error);
      return false;
    }
  }

  /**
   * Export entire database to JSON
   */
  async exportDatabase() {
    console.log('📤 Exporting database...');

    const [patients, prescriptions, vitals, labReports, appointments, users, settings] = await Promise.all([
      db.patients.toArray(),
      db.prescriptions.toArray(),
      db.vitals.toArray(),
      db.labReports.toArray(),
      db.appointments.toArray(),
      db.users.toArray(),
      db.settings ? db.settings.toArray() : []
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      hospital: 'Vardhan Hospital',
      counts: {
        patients: patients.length,
        prescriptions: prescriptions.length,
        vitals: vitals.length,
        labReports: labReports.length,
        appointments: appointments.length,
        users: users.length
      },
      data: {
        patients,
        prescriptions,
        vitals,
        labReports,
        appointments,
        users: users.map(u => ({ ...u, password: undefined })), // Don't export passwords
        settings
      }
    };

    console.log('✅ Database exported:', backup.counts);
    return backup;
  }

  /**
   * Create manual backup and download as file
   */
  async createManualBackup() {
    try {
      console.log('💾 Creating manual backup...');

      const backup = await this.exportDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `NexaCare_Backup_${timestamp}.json`;

      // Create downloadable file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Manual backup downloaded:', filename);
      return { success: true, filename, counts: backup.counts };
    } catch (error) {
      console.error('❌ Manual backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreFromFile(file) {
    try {
      console.log('📥 Restoring from file:', file.name);

      const text = await file.text();
      const backup = JSON.parse(text);

      return await this.restoreDatabase(backup);
    } catch (error) {
      console.error('❌ Restore from file failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore database from backup data
   */
  async restoreDatabase(backup) {
    try {
      console.log('🔄 Restoring database...');

      if (!backup.data) {
        throw new Error('Invalid backup format');
      }

      // Clear existing data (optional - can merge instead)
      // await this.clearDatabase();

      // Restore data
      const { data } = backup;
      const results = {
        patients: 0,
        prescriptions: 0,
        vitals: 0,
        labReports: 0,
        appointments: 0,
        users: 0
      };

      if (data.patients?.length > 0) {
        await db.patients.bulkPut(data.patients);
        results.patients = data.patients.length;
      }

      if (data.prescriptions?.length > 0) {
        await db.prescriptions.bulkPut(data.prescriptions);
        results.prescriptions = data.prescriptions.length;
      }

      if (data.vitals?.length > 0) {
        await db.vitals.bulkPut(data.vitals);
        results.vitals = data.vitals.length;
      }

      if (data.labReports?.length > 0) {
        await db.labReports.bulkPut(data.labReports);
        results.labReports = data.labReports.length;
      }

      if (data.appointments?.length > 0) {
        await db.appointments.bulkPut(data.appointments);
        results.appointments = data.appointments.length;
      }

      // Don't restore users automatically - security risk
      // Admin can restore users manually if needed

      console.log('✅ Database restored:', results);
      return { success: true, results };
    } catch (error) {
      console.error('❌ Database restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and restore last automatic backup if database is empty
   */
  async checkAndRestoreLastBackup() {
    try {
      // Check if database has data
      const patientCount = await db.patients.count();

      if (patientCount > 0) {
        console.log('✅ Database has data, no restore needed');
        return;
      }

      // Database is empty, try to restore from last backup
      console.log('⚠️ Database is empty, checking for backups...');

      const backups = this.getAutomaticBackups();
      if (backups.length === 0) {
        console.log('ℹ️ No automatic backups found');
        return;
      }

      // Get most recent backup
      const lastBackup = backups[0];
      console.log('🔄 Restoring from last backup:', lastBackup.timestamp);

      const result = await this.restoreDatabase(lastBackup.data);

      if (result.success) {
        console.log('✅ Successfully restored from automatic backup');
        alert('Database was empty. Restored from last automatic backup.\nPatients restored: ' + result.results.patients);
      }
    } catch (error) {
      console.error('❌ Auto-restore failed:', error);
    }
  }

  /**
   * Get list of automatic backups from localStorage
   */
  getAutomaticBackups() {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexacare_auto_backup_')) {
        try {
          const backup = JSON.parse(localStorage.getItem(key));
          backups.push({
            key,
            timestamp: backup.timestamp,
            data: backup.data,
            counts: backup.data.counts
          });
        } catch (e) {
          console.error('Error parsing backup:', key, e);
        }
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return backups;
  }

  /**
   * Clean up old automatic backups, keep only last 5
   */
  cleanupOldBackups() {
    const backups = this.getAutomaticBackups();

    if (backups.length > this.MAX_AUTO_BACKUPS) {
      const toDelete = backups.slice(this.MAX_AUTO_BACKUPS);
      toDelete.forEach(backup => {
        localStorage.removeItem(backup.key);
      });
      console.log(`🗑️ Cleaned up ${toDelete.length} old backups`);
    }
  }

  /**
   * Clear all database data (use with caution!)
   */
  async clearDatabase() {
    console.warn('⚠️ Clearing all database data...');

    await Promise.all([
      db.patients.clear(),
      db.prescriptions.clear(),
      db.vitals.clear(),
      db.labReports.clear(),
      db.appointments.clear(),
      // Don't clear users - keep admin access
    ]);

    console.log('✅ Database cleared');
  }

  /**
   * Get backup statistics
   */
  getBackupStats() {
    const backups = this.getAutomaticBackups();

    return {
      autoBackupCount: backups.length,
      lastBackupTime: backups.length > 0 ? backups[0].timestamp : null,
      nextBackupIn: this.AUTO_BACKUP_INTERVAL,
      isRunning: this.backupTimer !== null
    };
  }
}

// Create singleton instance
const backupService = new BackupService();

export default backupService;
