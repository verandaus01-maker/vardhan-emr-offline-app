import DatabaseService, { db } from './database';
import bcrypt from 'bcryptjs';

/**
 * Authentication and Authorization Service
 * Manages user login, roles, and permissions
 *
 * SERVER ARCHITECTURE:
 *   The central sync server always runs on port 3001 of the hospital PC.
 *   The server URL is derived dynamically from window.location.hostname so the
 *   app works regardless of which IP/hostname is used to access it:
 *     - localhost:3000       → syncs to localhost:3001       (hospital PC itself)
 *     - 192.168.1.131:3000  → syncs to 192.168.1.131:3001  (local WiFi devices)
 *     - 1.22.20.11:3000     → syncs to 1.22.20.11:3001     (direct/external access)
 *
 * LOGIN FLOW:
 *   1. Try server at <hostname>:3001 (5-second timeout)
 *   2. If server auth SUCCEEDS → use server result, sync all users locally, pull data if fresh device
 *   3. If server is UNREACHABLE or returns ANY error → fall through to local IndexedDB
 *   4. Local auth: look up user, bcrypt.compare — works fully offline
 *
 * ADMIN GUARANTEE:
 *   On every device startup, if admin doesn't exist locally it is created.
 *   If admin's stored password hash is missing or malformed, it is reset.
 *   Admin can ALWAYS log in with: admin / Vardhan@Hospital12*
 */

const CENTRAL_SERVER = `http://${window.location.hostname}:3001`;

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  // ─── Server communication ────────────────────────────────────────────────────

  /**
   * Attempt server login. Returns user data on success, null on any failure.
   * We intentionally return null for both "wrong password" and "unreachable" —
   * both fall through to local so offline auth always works as a safety net.
   */
  async loginWithServer(username, password) {
    try {
      const res = await fetch(`${CENTRAL_SERVER}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.success ? data : null;
    } catch {
      return null; // Server unreachable, timeout, or network error
    }
  }

  /**
   * Sync ALL users from the central server into local IndexedDB.
   * Runs after login so every hospital account works offline.
   * Server sends hashed passwords — bcrypt compare works locally.
   */
  async syncUsersFromServer() {
    try {
      const res = await fetch(`${CENTRAL_SERVER}/api/auth/users`, {
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return;
      const serverUsers = await res.json();
      for (const u of serverUsers) {
        const existing = await db.users.where('username').equalsIgnoreCase(u.username).first();
        const userData = {
          ...u,
          isActive: u.isActive === 1 || u.isActive === true
        };
        if (!existing) {
          await db.users.add(userData);
        } else {
          await db.users.update(existing.id, {
            password: u.password,
            name: u.name,
            role: u.role,
            permissions: u.permissions,
            isActive: userData.isActive,
            serverId: u.id
          });
        }
      }
    } catch {
      // Silently ignore — offline mode uses local DB
    }
  }

  /**
   * Push all local users to the central server.
   * Call this after creating users while server was offline.
   */
  async syncPendingUsersToServer() {
    try {
      const localUsers = await db.users.toArray();
      for (const u of localUsers) {
        try {
          const res = await fetch(`${CENTRAL_SERVER}/api/auth/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...u }), // password already hashed
            signal: AbortSignal.timeout(5000)
          });
          if (res.ok) {
            const data = await res.json();
            await db.users.update(u.id, { serverId: data.id });
          }
        } catch { /* skip individual failures */ }
      }
    } catch { /* ignore */ }
  }

  /**
   * Pull ALL patient/prescription/vital data from server into local IndexedDB.
   * Auto-called after login when local patient count is 0 (fresh device).
   * Also available manually via Settings → "Pull All Data from Server".
   */
  async pullDataFromServer(onProgress) {
    const report = (msg, pct) => { try { onProgress?.(msg, pct); } catch {} };
    try {
      // ── Patients (paginated, handles 70k+ records) ────────────────────────
      report('Downloading patients...', 5);
      let page = 1;
      let totalPatients = 0;
      while (true) {
        const res = await fetch(
          `${CENTRAL_SERVER}/api/patients?page=${page}&limit=500`,
          { signal: AbortSignal.timeout(30000) }
        );
        if (!res.ok) break;
        const { patients } = await res.json();
        if (!patients?.length) break;
        for (const p of patients) {
          try {
            const exists = p.uhid
              ? await db.patients.where('uhid').equals(p.uhid).first()
              : null;
            if (!exists) await db.patients.add({ ...p, id: undefined, syncStatus: 'synced' });
          } catch {}
        }
        totalPatients += patients.length;
        report(`Downloading patients… ${totalPatients}`, Math.min(5 + totalPatients / 200, 50));
        if (patients.length < 500) break;
        page++;
      }

      // ── Prescriptions ───────────────────────────────────────────────────
      report('Downloading prescriptions...', 55);
      const rxRes = await fetch(`${CENTRAL_SERVER}/api/prescriptions?limit=5000`, { signal: AbortSignal.timeout(30000) });
      let totalRx = 0;
      if (rxRes.ok) {
        const rxList = await rxRes.json();
        for (const rx of (Array.isArray(rxList) ? rxList : [])) {
          try { await db.prescriptions.add({ ...rx, id: undefined, syncStatus: 'synced' }); totalRx++; } catch {}
        }
        report(`Downloaded ${totalRx} prescriptions`, 70);
      }

      // ── Vitals ──────────────────────────────────────────────────────────
      report('Downloading vitals...', 75);
      const vRes = await fetch(`${CENTRAL_SERVER}/api/vitals?limit=10000`, { signal: AbortSignal.timeout(30000) });
      let totalVitals = 0;
      if (vRes.ok) {
        const vList = await vRes.json();
        for (const v of (Array.isArray(vList) ? vList : [])) {
          try { await db.vitals.add({ ...v, id: undefined, syncStatus: 'synced' }); totalVitals++; } catch {}
        }
      }

      report('✅ Sync complete!', 100);
      return { success: true, patients: totalPatients, prescriptions: totalRx, vitals: totalVitals };
    } catch (err) {
      report(`Pull failed: ${err.message}`, 0);
      return { success: false, error: err.message };
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  /**
   * Called once when the app starts.
   * Guarantees local admin always exists and is usable.
   */
  async initialize() {
    console.log('AuthService: initializing…');

    // Restore previous session
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        this.isAuthenticated = true;
      } catch {
        this.logout();
      }
    }

    // Guarantee admin always works on this device
    await this._ensureLocalAdmin();

    // Pull all server users in background (non-blocking — does not delay startup)
    this.syncUsersFromServer().catch(() => {});

    console.log('AuthService: ready');
  }

  /**
   * Guarantees the local admin account exists and has a valid password hash.
   * - If admin missing: create with Vardhan@Hospital12*
   * - If admin's hash is missing or malformed (doesn't start with $2b/$2a): reset it
   * - If hash looks valid: leave it alone (respects password changes via UI)
   */
  async _ensureLocalAdmin() {
    try {
      const admin = await db.users.where('username').equalsIgnoreCase('admin').first();
      const hashLooksValid = admin?.password && /^\$2[ab]\$/.test(admin.password);
      if (!admin) {
        await this.createDefaultAdmin();
      } else if (!hashLooksValid) {
        // Hash is null/undefined/corrupted — reset without running bcrypt.compare
        const newHash = await bcrypt.hash('Vardhan@Hospital12*', 10);
        await db.users.update(admin.id, { password: newHash, isActive: true });
        console.log('AuthService: admin password hash was invalid, reset to default');
      }
      // If hash looks valid, leave it alone — admin may have changed password via UI
    } catch (e) {
      console.error('AuthService: _ensureLocalAdmin error', e);
    }
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  /**
   * Main login entry point.
   *
   * Priority:
   *   1. Central server (<hostname>:3001) — all devices use the same hostname they opened the app with
   *   2. Local IndexedDB fallback — when server is offline or unreachable
   *
   * Both paths verify the password. Wrong credentials always fail.
   */
  async login(username, password) {
    try {
      // ── Step 1: Central server auth ─────────────────────────────────────
      const serverResult = await this.loginWithServer(username, password);
      if (serverResult) {
        this.currentUser = { ...serverResult.user, _authSource: 'server' };
        this.isAuthenticated = true;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        // Sync all users locally in background (keeps offline logins updated)
        this.syncUsersFromServer().catch(() => {});
        // If this is a fresh device (empty DB), pull all data in background
        const patientCount = await db.patients.count().catch(() => 0);
        if (patientCount === 0) {
          this.pullDataFromServer().catch(() => {});
        }
        return { success: true, user: this.currentUser, freshDevice: patientCount === 0 };
      }

      // ── Step 2: Local IndexedDB fallback (server unreachable) ───────────
      const user = await db.users
        .where('username')
        .equalsIgnoreCase(username)
        .first();

      if (!user) throw new Error('Invalid username or password');
      if (!user.isActive) throw new Error('Account is disabled. Contact the administrator.');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid username or password');

      await db.users.update(user.id, { lastLogin: new Date().toISOString() });
      const { password: _pw, ...safe } = user;
      this.currentUser = { ...safe, _authSource: 'local' };
      this.isAuthenticated = true;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };

    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ─── Session / Permissions ───────────────────────────────────────────────────

  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('currentUser');
  }

  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    return this.currentUser.permissions?.includes(permission) || false;
  }

  hasRole(role) {
    if (!this.isAuthenticated || !this.currentUser) return false;
    return this.currentUser.role === role;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  canWrite() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || this.currentUser.role === 'doctor';
  }

  // ─── User management ─────────────────────────────────────────────────────────

  /**
   * Create default admin — used on fresh devices.
   */
  async createDefaultAdmin() {
    const hash = await bcrypt.hash('Vardhan@Hospital12*', 10);
    await db.users.add({
      username: 'admin',
      password: hash,
      name: 'System Administrator',
      email: 'admin@vardhanhospital.co.in',
      role: 'admin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    console.log('AuthService: default admin created');
  }

  /**
   * Create a new user (admin only).
   * Saves to server first, then locally. If server is offline, saves locally
   * and syncs when server comes back online via Settings → Sync Users to Server.
   */
  async createUser(userData) {
    if (!this.hasRole('admin')) throw new Error('Only administrators can create users');

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
      createdBy: this.currentUser?.id,
      lastLogin: null
    };

    // Push to server (single source of truth for multi-device access)
    let serverId = null;
    try {
      const res = await fetch(`${CENTRAL_SERVER}/api/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, plainPassword: userData.password }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) serverId = (await res.json()).id;
    } catch {
      // Server offline — saved locally, sync later
    }

    // Save locally
    const existing = await db.users.where('username').equalsIgnoreCase(userData.username).first();
    let userId;
    if (!existing) {
      userId = await db.users.add({ ...newUser, serverId });
    } else {
      userId = existing.id;
      await db.users.update(userId, { ...newUser, serverId });
    }
    return { success: true, userId };
  }

  async updateUser(userId, updates) {
    if (!this.hasRole('admin') && userId !== this.currentUser?.id) {
      throw new Error('Permission denied');
    }
    delete updates.password;
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = this.currentUser?.id;
    await db.users.update(userId, updates);
    return { success: true };
  }

  async deactivateUser(userId) {
    if (!this.hasRole('admin')) throw new Error('Only administrators can deactivate users');
    if (userId === this.currentUser?.id) throw new Error('You cannot deactivate your own account');
    await db.users.update(userId, {
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: this.currentUser?.id
    });
    return { success: true };
  }

  async getAllUsers() {
    if (!this.hasRole('admin')) throw new Error('Only administrators can view all users');
    const users = await db.users.toArray();
    return users.map(({ password, ...u }) => u);
  }

  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await db.users.get(userId);
      if (!user) throw new Error('User not found');
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) throw new Error('Current password is incorrect');
      const hash = await bcrypt.hash(newPassword, 10);
      await db.users.update(userId, { password: hash, passwordChangedAt: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

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
    return { admin: ['all'], doctor: FULL_CLINICAL }[role] || READ_ONLY;
  }

  getRoleDisplayName(role) {
    return {
      admin: 'Administrator', doctor: 'Doctor', nurse: 'Nurse',
      receptionist: 'Receptionist', lab_technician: 'Lab Technician', staff: 'Staff'
    }[role] || role;
  }
}

export const authService = new AuthService();
export default authService;
