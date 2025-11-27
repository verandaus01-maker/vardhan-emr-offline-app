import DatabaseService, { db } from './database';
import bcrypt from 'bcryptjs';

/**
 * Authentication and Authorization Service
 * Manages user login, roles, and permissions
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize auth service
   */
  async initialize() {
    console.log('Initializing Authentication Service...');

    // Check if there's a stored session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Failed to restore session:', error);
        this.logout();
      }
    }

    // Create default admin user if no users exist
    const users = await db.users?.count() || 0;
    if (users === 0) {
      await this.createDefaultAdmin();
    }

    console.log('Authentication Service initialized');
  }

  /**
   * Create default admin user
   */
  async createDefaultAdmin() {
    const defaultAdmin = {
      username: 'admin',
      password: await bcrypt.hash('vardhan@2025', 10),
      name: 'System Administrator',
      email: 'admin@vardhanhospital.co.in',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    await db.users.add(defaultAdmin);
    console.log('Default admin user created (username: admin, password: vardhan@2025)');
    console.log('⚠️ IMPORTANT: Please change the default password immediately!');
  }

  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      const user = await db.users
        .where('username')
        .equalsIgnoreCase(username)
        .first();

      if (!user) {
        throw new Error('Invalid username or password');
      }

      if (!user.isActive) {
        throw new Error('Account is disabled. Contact administrator.');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await db.users.update(user.id, {
        lastLogin: new Date().toISOString()
      });

      // Set current user (exclude password)
      const { password: _, ...userWithoutPassword } = user;
      this.currentUser = userWithoutPassword;
      this.isAuthenticated = true;

      // Store session
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      return {
        success: true,
        user: this.currentUser
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout
   */
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('currentUser');
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }

    // Admin has all permissions
    if (this.currentUser.role === 'admin') {
      return true;
    }

    return this.currentUser.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role) {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }

    return this.currentUser.role === role;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await db.users.get(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.users.update(userId, {
        password: hashedPassword,
        passwordChangedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData) {
    if (!this.hasRole('admin')) {
      throw new Error('Only administrators can create users');
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = {
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role || 'staff',
        permissions: userData.permissions || this.getDefaultPermissions(userData.role),
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser.id,
        lastLogin: null
      };

      const userId = await db.users.add(newUser);
      return { success: true, userId };
    } catch (error) {
      console.error('User creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId, updates) {
    if (!this.hasRole('admin') && userId !== this.currentUser?.id) {
      throw new Error('Permission denied');
    }

    try {
      // Don't allow password updates through this method
      delete updates.password;

      updates.updatedAt = new Date().toISOString();
      updates.updatedBy = this.currentUser.id;

      await db.users.update(userId, updates);
      return { success: true };
    } catch (error) {
      console.error('User update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete/deactivate user (admin only)
   */
  async deactivateUser(userId) {
    if (!this.hasRole('admin')) {
      throw new Error('Only administrators can deactivate users');
    }

    if (userId === this.currentUser.id) {
      throw new Error('You cannot deactivate your own account');
    }

    try {
      await db.users.update(userId, {
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: this.currentUser.id
      });
      return { success: true };
    } catch (error) {
      console.error('User deactivation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    if (!this.hasRole('admin')) {
      throw new Error('Only administrators can view all users');
    }

    const users = await db.users.toArray();
    // Remove passwords from response
    return users.map(({ password, ...user }) => user);
  }

  /**
   * Get default permissions for role
   */
  getDefaultPermissions(role) {
    const rolePermissions = {
      'admin': ['all'],
      'doctor': [
        'view_patients',
        'edit_patients',
        'add_patients',
        'view_prescriptions',
        'create_prescriptions',
        'view_vitals',
        'record_vitals',
        'view_appointments',
        'create_appointments',
        'view_lab_reports',
        'analyze_lab_reports',
        'view_reports'
      ],
      'nurse': [
        'view_patients',
        'view_prescriptions',
        'view_vitals',
        'record_vitals',
        'view_appointments',
        'view_lab_reports'
      ],
      'receptionist': [
        'view_patients',
        'add_patients',
        'edit_patients',
        'view_appointments',
        'create_appointments',
        'manage_appointments'
      ],
      'lab_technician': [
        'view_patients',
        'view_lab_reports',
        'add_lab_reports',
        'analyze_lab_reports'
      ],
      'staff': [
        'view_patients',
        'view_appointments'
      ]
    };

    return rolePermissions[role] || rolePermissions['staff'];
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role) {
    const roleNames = {
      'admin': 'Administrator',
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'receptionist': 'Receptionist',
      'lab_technician': 'Lab Technician',
      'staff': 'Staff'
    };

    return roleNames[role] || role;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
