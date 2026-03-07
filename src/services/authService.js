import DatabaseService, { db } from './database';
import bcrypt from 'bcryptjs';

/**
 * Authentication and Authorization Service
 * Manages user login, roles, and permissions
 */

// Central sync server URL — derived from the current page's hostname so it works
// automatically regardless of which IP the hospital PC is accessed from.
// When doctors open http://192.168.1.131:3000 the server resolves to http://192.168.1.131:3001
// When opened locally via http://localhost:3000 it resolves to http://localhost:3001
const CENTRAL_SERVER = `${window.location.protocol}//${window.location.hostname}:3001`;

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.serverUrl = CENTRAL_SERVER;
  }

  /**
   * Get the central sync server URL
   */
  async getServerUrl() {
    return this.serverUrl;
  }

  /**
   * Try to authenticate against the central server.
   * Returns:
   *   { success: true, user: ... }         — authenticated OK
   *   { success: false, error: '...', serverReachable: true }  — server up, wrong credentials
   *   null                                 — server unreachable (network error / timeout)
   */
  async loginWithServer(username, password) {
    const serverUrl = await this.getServerUrl();
    if (!serverUrl) return null;
    try {
      const res = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 400) {
        // Server is reachable and explicitly rejected the credentials
        return { success: false, error: data.error || 'Invalid username or password', serverReachable: true };
      }
      if (!res.ok) return null; // 5xx or other — treat as unreachable
      return data; // { success: true, user: ... }
    } catch {
      return null; // Network error or timeout — fall through to local offline auth
    }
  }

  /**
   * Push any locally-created users (created when server was offline) to the central server.
   * Safe to call repeatedly — server uses ON CONFLICT(username) DO UPDATE.
   */
  async syncPendingUsersToServer() {
    try {
      const localUsers = await db.users.toArray();
      // Users without a serverId were created while the server was offline
      const pending = localUsers.filter(u => !u.serverId);
      if (pending.length === 0) return { pushed: 0 };
      let pushed = 0;
      for (const u of pending) {
        try {
          const res = await fetch(`${CENTRAL_SERVER}/api/auth/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...u, password: u.password }), // already hashed
            signal: AbortSignal.timeout(5000)
          });
          if (res.ok) {
            const data = await res.json();
            await db.users.update(u.id, { serverId: data.id });
            pushed++;
          }
        } catch { /* skip individual failures */ }
      }
      return { pushed };
    } catch {
      return { pushed: 0 };
    }
  }

  /**
   * Pull ALL patient/prescription/vital data from the central server into local IndexedDB.
   * Called automatically after login when local DB is empty (fresh device).
   * Progress callback: fn(msg, pct)
   */
  async pullDataFromServer(onProgress) {
    const report = (msg, pct) => { try { onProgress && onProgress(msg, pct); } catch {} };
    try {
      // ── Patients ──────────────────────────────────────────────────────────
      report('Downloading patients from server...', 5);
      let page = 1;
      let totalPatients = 0;
      while (true) {
        const res = await fetch(`${CENTRAL_SERVER}/api/patients?page=${page}&limit=500`, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) break;
        const { patients } = await res.json();
        if (!patients || patients.length === 0) break;
        for (const p of patients) {
          const existing = await db.patients.where('uhid').equals(p.uhid || '').first();
          if (!existing) {
            await db.patients.add({ ...p, id: undefined, syncStatus: 'synced' });
          }
        }
        totalPatients += patients.length;
        report(`Downloaded ${totalPatients} patients...`, Math.min(5 + Math.round(totalPatients / 200), 50));
        if (patients.length < 500) break;
        page++;
      }

      // ── Prescriptions ─────────────────────────────────────────────────────
      report('Downloading prescriptions...', 55);
      const rxRes = await fetch(`${CENTRAL_SERVER}/api/prescriptions?limit=5000`, { signal: AbortSignal.timeout(30000) });
      if (rxRes.ok) {
        const rxList = await rxRes.json();
        for (const rx of (Array.isArray(rxList) ? rxList : [])) {
          try { await db.prescriptions.add({ ...rx, id: undefined, syncStatus: 'synced' }); } catch {}
        }
        report(`Downloaded ${rxList.length} prescriptions...`, 70);
      }

      // ── Vitals ────────────────────────────────────────────────────────────
      report('Downloading vitals...', 75);
      const vRes = await fetch(`${CENTRAL_SERVER}/api/vitals?limit=10000`, { signal: AbortSignal.timeout(30000) });
      if (vRes.ok) {
        const vList = await vRes.json();
        for (const v of (Array.isArray(vList) ? vList : [])) {
          try { await db.vitals.add({ ...v, id: undefined, syncStatus: 'synced' }); } catch {}
        }
        report(`Downloaded ${vList.length} vitals...`, 90);
      }

      report('Sync complete!', 100);
      return { success: true, patients: totalPatients };
    } catch (err) {
      report(`Pull failed: ${err.message}`, 0);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync users from central server to local IndexedDB so all device logins work offline.
   * The server returns hashed passwords so local bcrypt compare still works.
   */
  async syncUsersFromServer() {
    const serverUrl = await this.getServerUrl();
    if (!serverUrl) return;
    try {
      const res = await fetch(`${serverUrl}/api/auth/users`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const serverUsers = await res.json();
      for (const u of serverUsers) {
        const existing = await db.users.where('username').equalsIgnoreCase(u.username).first();
        if (!existing) {
          await db.users.add({
            ...u,
            isActive: u.isActive === 1 || u.isActive === true,
          });
        } else {
          // Update local copy with server data (keeps password in sync)
          await db.users.update(existing.id, {
            password: u.password,
            name: u.name,
            role: u.role,
            permissions: u.permissions,
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

    // Restore stored session
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

    // Ensure admin always exists locally with the correct password on every device
    const users = await db.users?.count().catch(() => 0) || 0;
    if (users === 0) {
      await this.createDefaultAdmin();
    } else {
      // Make sure the local admin password matches the canonical password
      // (handles upgrades / password resets / fresh installs on existing DB)
      await this.ensureAdminPassword();
    }

    // Pull server users in background so all hospital accounts work offline
    this.syncUsersFromServer().catch(() => {});

    console.log('Authentication Service initialized');
  }

  /**
   * Ensures the local admin account always has the correct password.
   * Safe to call on every init — only updates if the hash doesn't match.
   */
  async ensureAdminPassword() {
    try {
      const admin = await db.users.where('username').equalsIgnoreCase('admin').first();
      if (!admin) {
        await this.createDefaultAdmin();
        return;
      }
      const correct = await bcrypt.compare('Vardhan@Hospital12*', admin.password);
      if (!correct) {
        const newHash = await bcrypt.hash('Vardhan@Hospital12*', 10);
        await db.users.update(admin.id, { password: newHash });
        console.log('Admin password updated to match canonical password');
      }
    } catch { /* ignore */ }
  }

  /**
   * Create default admin user
   */
  async createDefaultAdmin() {
    const defaultAdmin = {
      username: 'admin',
      password: await bcrypt.hash('Vardhan@Hospital12*', 10),
      name: 'System Administrator',
      email: 'admin@vardhanhospital.co.in',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    await db.users.add(defaultAdmin);
    console.log('Default admin user created (username: admin)');
  }

  /**
   * Login — tries central server first, then local IndexedDB (offline fallback)
   */
  async login(username, password) {
    try {
      // ── Step 0: Push any users created offline to server (so they can login from any device)
      this.syncPendingUsersToServer().catch(() => {});

      // ── Step 1: Try central server first ───────────────────────────────
      const serverResult = await this.loginWithServer(username, password);
      if (serverResult?.success) {
        const serverUser = serverResult.user;
        this.currentUser = { ...serverUser, _authSource: 'server' };
        this.isAuthenticated = true;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        // Sync all server users to local DB so offline logins work after this
        this.syncUsersFromServer().catch(() => {});
        // Fresh device — pull all patient data from server in background
        const localPatientCount = await db.patients.count().catch(() => 0);
        if (localPatientCount === 0) {
          this.pullDataFromServer().catch(() => {});
        }
        return { success: true, user: this.currentUser, freshDevice: localPatientCount === 0 };
      }
      if (serverResult?.serverReachable) {
        // Server is up and explicitly rejected — do NOT fall through to local DB
        throw new Error(serverResult.error || 'Invalid username or password');
      }

      // ── Step 2: Server unreachable (null) → try local offline auth ─────
      // First do a quick user sync in case the server briefly came back up
      await this.syncUsersFromServer();

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
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = {
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'staff',
        permissions: userData.permissions || this.getDefaultPermissions(userData.role),
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: this.currentUser.id,
        lastLogin: null
      };

      // ── Push to central server first (single source of truth) ──────────
      const serverUrl = await this.getServerUrl();
      let serverId = null;
      try {
        const res = await fetch(`${serverUrl}/api/auth/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newUser, plainPassword: userData.password }),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          serverId = data.id;
        }
      } catch {
        // Server unreachable — save locally and it will sync when server is back
      }

      // ── Save locally so this device works offline too ───────────────────
      const existing = await db.users.where('username').equalsIgnoreCase(userData.username).first();
      let userId;
      if (!existing) {
        userId = await db.users.add({ ...newUser, serverId });
      } else {
        userId = existing.id;
        await db.users.update(userId, { ...newUser, serverId });
      }

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
