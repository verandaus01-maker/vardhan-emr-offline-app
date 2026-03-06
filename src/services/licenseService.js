/**
 * License Validation Service
 * Validates NexaCare Pro license for production deployment
 * Licensed to: Vardhan Hospital, Varanasi
 */

class LicenseService {
  constructor() {
    this.LICENSE_KEY = 'NEXACARE-VARDHAN-2025-PRO-EMR-001';
    this.LICENSED_TO = 'Vardhan Hospital';
    this.LICENSED_LOCATION = 'Varanasi';
    this.LICENSE_EXPIRY = '2026-12-31'; // 1 year from deployment
    this.MAX_USERS = 20;
    this.PRODUCT_VERSION = '1.0';
  }

  /**
   * Initialize license service
   */
  async initialize() {
    console.log('🔐 Initializing License Service...');

    // Store license information
    const licenseInfo = {
      productName: 'NexaCare Pro',
      version: this.PRODUCT_VERSION,
      licenseKey: this.LICENSE_KEY,
      licensedTo: this.LICENSED_TO,
      location: this.LICENSED_LOCATION,
      expiryDate: this.LICENSE_EXPIRY,
      maxUsers: this.MAX_USERS,
      installDate: new Date().toISOString(),
      licenseType: 'Single Hospital License',
      vendor: 'NexaVoyagers Technologies Pvt. Ltd.'
    };

    // Save license to localStorage
    localStorage.setItem('nexacare_license', JSON.stringify(licenseInfo));

    // Validate on startup
    const validation = this.validateLicense();

    if (!validation.valid) {
      console.error('❌ License validation failed:', validation.error);
    } else {
      console.log('✅ License validated successfully');
    }

    return validation;
  }

  /**
   * Validate license
   */
  validateLicense() {
    try {
      const licenseData = localStorage.getItem('nexacare_license');

      if (!licenseData) {
        return {
          valid: false,
          error: 'License not found. Please contact NexaVoyagers Technologies.'
        };
      }

      const license = JSON.parse(licenseData);

      // Check license key
      if (license.licenseKey !== this.LICENSE_KEY) {
        return {
          valid: false,
          error: 'Invalid license key'
        };
      }

      // Check expiry
      const expiryDate = new Date(license.expiryDate);
      const today = new Date();

      if (today > expiryDate) {
        return {
          valid: false,
          error: 'License expired. Please renew your license.',
          expired: true,
          expiryDate: license.expiryDate
        };
      }

      // Check if expiring soon (within 30 days)
      const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
      const expiringSoon = daysUntilExpiry <= 30;

      return {
        valid: true,
        license,
        daysUntilExpiry,
        expiringSoon,
        expiryWarning: expiringSoon ? `License expires in ${daysUntilExpiry} days` : null
      };
    } catch (error) {
      return {
        valid: false,
        error: 'License validation error: ' + error.message
      };
    }
  }

  /**
   * Get license information
   */
  getLicenseInfo() {
    const licenseData = localStorage.getItem('nexacare_license');
    if (!licenseData) return null;

    try {
      return JSON.parse(licenseData);
    } catch (error) {
      console.error('Error parsing license:', error);
      return null;
    }
  }

  /**
   * Check if license allows adding more users
   */
  canAddUser(currentUserCount) {
    const validation = this.validateLicense();

    if (!validation.valid) {
      return {
        allowed: false,
        reason: validation.error
      };
    }

    if (currentUserCount >= this.MAX_USERS) {
      return {
        allowed: false,
        reason: `License limit reached. Maximum ${this.MAX_USERS} users allowed.`
      };
    }

    return {
      allowed: true,
      remainingSlots: this.MAX_USERS - currentUserCount
    };
  }

  /**
   * Get license display information
   */
  getLicenseDisplay() {
    const validation = this.validateLicense();

    if (!validation.valid) {
      return {
        status: 'invalid',
        message: validation.error,
        color: 'red'
      };
    }

    const { license, daysUntilExpiry, expiringSoon } = validation;

    return {
      status: 'valid',
      productName: license.productName,
      version: license.version,
      licensedTo: license.licensedTo,
      location: license.location,
      expiryDate: license.expiryDate,
      daysUntilExpiry,
      maxUsers: license.maxUsers,
      licenseType: license.licenseType,
      vendor: license.vendor,
      installDate: license.installDate,
      expiringSoon,
      expiryWarning: expiringSoon ? `Expires in ${daysUntilExpiry} days` : null,
      color: expiringSoon ? 'yellow' : 'green'
    };
  }

  /**
   * Show license warning if expiring soon
   */
  checkExpiryWarning() {
    const validation = this.validateLicense();

    if (validation.valid && validation.expiringSoon) {
      console.warn(`⚠️ ${validation.expiryWarning}`);
      return validation.expiryWarning;
    }

    return null;
  }

  /**
   * Get support contact information
   */
  getSupportInfo() {
    return {
      vendor: 'NexaVoyagers Technologies Pvt. Ltd.',
      email: 'contact@nexavoyagers.com',
      phone: '+91 XXXX-XXXXXX',
      supportHours: 'Mon-Sat, 9 AM - 6 PM',
      website: 'https://nexavoyagers.com'
    };
  }
}

// Create singleton instance
const licenseService = new LicenseService();

export default licenseService;
