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
    this.serverUrl = null; // Set from settings (docOnApiUrl)
  }

  /**
   * Get the central sync server URL from settings
   */
  async getServerUrl() {
    if (this.serverUrl) return this.serverUrl;
    const url = await DatabaseService.getSetting('docOnApiUrl');
    this.serverUrl = url || null;
    return this.serverUrl;
  }

  /**
   * Try to authenticate against the central server
   */
  async loginWithServer(username, password) {
    const serverUrl = await this.getServerUrl();
    if (!serverUrl) return null;
    try {
      const res = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null; // Server unreachable — fall through to local
    }
  }

  /**
   * Sync users from central server to local IndexedDB so all device logins work offline
   */
  async syncUsersFromServer() {
    const serverUrl = await this.getServerUrl();
    if (!serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/auth/users`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const serverUsers = await res.json();
      for (const u of serverUsers) {
        const existing = await db.users.where('username').equalsIgnoreCase(u.username).first();
        if (!existing) {
          // Add server user locally with a dummy hashed password marker
          // The real auth will go to server; local is for offline fallback
          await db.users.add({
            ...u,
            password: u.password || await bcrypt.hash('__server_auth__', 4),
            isActive: u.isActive === 1 || u.isActive === true,
          });
        }
      }
    } catch {
      // Ignore sync errors — offline mode will use local users
    }
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
   * Login — tries central server first, then local IndexedDB (offline fallback)
   */
  async login(username, password) {
    try {
      // ── Step 1: Try central server ──────────────────────────────────────
      const serverResult = await this.loginWithServer(username, password);
      if (serverResult?.success) {
        const serverUser = serverResult.user;
        this.currentUser = { ...serverUser, _authSource: 'server' };
        this.isAuthenticated = true;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        // Sync server users to local in background
        this.syncUsersFromServer().catch(() => {});

        return { success: true, user: this.currentUser };
      }
      if (serverResult && !serverResult.success) {
        // Server reachable but credentials wrong — don't fall through
        throw new Error(serverResult.error || 'Invalid username or password');
      }

      // ── Step 2: Local IndexedDB (offline / server unreachable) ──────────
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

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid username or password');
      }

      await db.users.update(user.id, { lastLogin: new Date().toISOString() });

      const { password: _, ...userWithoutPassword } = user;
      this.currentUser = { ...userWithoutPassword, _authSource: 'local' };
      this.isAuthenticated = true;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
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
   * Check if current user can write/edit data (not read-only).
   * Only admin and doctor have write access.
   */
  canWrite() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || this.currentUser.role === 'doctor';
  }

  /**
   * Get default permissions for role.
   * Doctor = full clinical access (like admin minus user management).
   * All others = read-only.
   */
  getDefaultPermissions(role) {
    const FULL_CLINICAL = [
      'view_patients', 'edit_patients', 'add_patients',
      'view_prescriptions', 'create_prescriptions',
      'view_vitals', 'record_vitals',
      'view_appointments', 'create_appointments', 'manage_appointments',
      'view_lab_reports', 'add_lab_reports', 'analyze_lab_reports',
      'view_reports', 'manage_data', 'backup_restore'
    ];
    const READ_ONLY = [
      'view_patients', 'view_prescriptions',
      'view_vitals', 'view_appointments', 'view_lab_reports'
    ];
    const rolePermissions = {
      'admin': ['all'],
      'doctor': FULL_CLINICAL,
      'nurse': READ_ONLY,
      'receptionist': READ_ONLY,
      'lab_technician': READ_ONLY,
      'staff': READ_ONLY
    };
    return rolePermissions[role] || READ_ONLY;
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
