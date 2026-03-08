/**
 * NexaCare Pro — Central Sync Server
 * Provides shared authentication and data across all hospital devices.
 * All devices on the hospital network connect to http://SERVER_IP:3001
 *
 * Run: node server.cjs
 * Requires: npm install express better-sqlite3 cors (already done)
 */

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Database setup ─────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'nexacare-server.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    email       TEXT,
    phone       TEXT,
    role        TEXT    NOT NULL DEFAULT 'staff',
    permissions TEXT    DEFAULT '[]',
    isActive    INTEGER NOT NULL DEFAULT 1,
    createdAt   TEXT    NOT NULL,
    updatedAt   TEXT,
    lastLogin   TEXT
  );

  CREATE TABLE IF NOT EXISTS patients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uhid            TEXT    UNIQUE,
    name            TEXT    NOT NULL,
    age             INTEGER,
    gender          TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    bloodGroup      TEXT,
    aadhaar         TEXT,
    allergies       TEXT,
    medicalHistory  TEXT,
    conditions      TEXT,
    registrationDate TEXT,
    createdAt       TEXT,
    updatedAt       TEXT,
    syncStatus      TEXT DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId   INTEGER,
    uhid        TEXT,
    date        TEXT,
    doctorId    INTEGER,
    complaints  TEXT,
    diagnosis   TEXT,
    notes       TEXT,
    medications TEXT,
    vitals      TEXT,
    investigations TEXT,
    advisedInvestigations TEXT,
    advice      TEXT,
    nextVisit   TEXT,
    createdAt   TEXT,
    updatedAt   TEXT,
    syncStatus  TEXT DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS vitals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId   INTEGER,
    uhid        TEXT,
    date        TEXT,
    recordedBy  TEXT,
    systolic    INTEGER,
    diastolic   INTEGER,
    pulse       TEXT,
    temperature TEXT,
    weight      TEXT,
    height      TEXT,
    spo2        TEXT,
    bloodSugar  TEXT,
    bmi         TEXT,
    notes       TEXT,
    createdAt   TEXT,
    syncStatus  TEXT DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId   INTEGER,
    uhid        TEXT,
    date        TEXT,
    time        TEXT,
    type        TEXT,
    status      TEXT DEFAULT 'scheduled',
    notes       TEXT,
    doctorId    INTEGER,
    createdAt   TEXT,
    updatedAt   TEXT,
    syncStatus  TEXT DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS labReports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId   INTEGER,
    uhid        TEXT,
    testType    TEXT,
    results     TEXT,
    analysisData TEXT,
    overallRisk TEXT,
    createdAt   TEXT,
    syncStatus  TEXT DEFAULT 'synced'
  );

  CREATE INDEX IF NOT EXISTS idx_patients_uhid       ON patients(uhid);
  CREATE INDEX IF NOT EXISTS idx_prescriptions_pid   ON prescriptions(patientId);
  CREATE INDEX IF NOT EXISTS idx_vitals_pid          ON vitals(patientId);
  CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(date);
  CREATE INDEX IF NOT EXISTS idx_labreports_pid      ON labReports(patientId);
`);

// Create default admin if no users exist
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('Vardhan@Hospital12*', 10);
  db.prepare(`
    INSERT INTO users (username, password, name, email, role, permissions, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run('admin', hash, 'System Administrator', 'admin@vardhanhospital.co.in',
    'admin', JSON.stringify(['all']), new Date().toISOString());
  console.log('✅ Default admin created: admin / Vardhan@Hospital12*');
}

// If admin exists with old password vardhan@2025, update it to the real hospital password
// (Run once on upgrade — safe because we check first)
try {
  const adminUser = db.prepare("SELECT * FROM users WHERE username='admin'").get();
  if (adminUser) {
    const hasOldPass = bcrypt.compareSync('vardhan@2025', adminUser.password);
    if (hasOldPass) {
      const newHash = bcrypt.hashSync('Vardhan@Hospital12*', 10);
      db.prepare("UPDATE users SET password=? WHERE username='admin'").run(newHash);
      console.log('✅ Admin password updated from default to hospital password');
    }
  }
} catch (e) { /* ignore */ }

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple request logger
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND isActive = 1').get(username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    // Update last login
    db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(new Date().toISOString(), user.id);

    const { password: _, ...safeUser } = user;
    safeUser.permissions = JSON.parse(safeUser.permissions || '[]');
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all users — includes hashed password so devices can do local bcrypt verify offline
app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, username, password, name, email, phone, role, permissions, isActive, createdAt, lastLogin FROM users').all();
  const result = users.map(u => ({ ...u, permissions: JSON.parse(u.permissions || '[]') }));
  res.json(result);
});

// Create user
// Accepts: plainPassword (plain text, we hash it) OR password (already hashed from client)
app.post('/api/auth/users', async (req, res) => {
  try {
    const { username, plainPassword, password, name, email, phone, role, permissions } = req.body;
    // Use plainPassword if provided (new user creation), else use pre-hashed password
    const rawPass = plainPassword || password;
    if (!rawPass) return res.status(400).json({ success: false, error: 'Password required' });
    // If it's already a bcrypt hash (starts with $2), use as-is; otherwise hash it
    const hash = rawPass.startsWith('$2') ? rawPass : await bcrypt.hash(rawPass, 10);
    const perms = JSON.stringify(permissions || []);
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO users (username, password, name, email, phone, role, permissions, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(username) DO UPDATE SET
        password=excluded.password, name=excluded.name, email=excluded.email,
        phone=excluded.phone, role=excluded.role, permissions=excluded.permissions,
        updatedAt=?
    `).run(username, hash, name, email || '', phone || '', role || 'staff', perms, now, now);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user
app.put('/api/auth/users/:id', (req, res) => {
  try {
    const { name, email, phone, role, permissions, isActive } = req.body;
    db.prepare(`
      UPDATE users SET name=?, email=?, phone=?, role=?, permissions=?, isActive=?, updatedAt=? WHERE id=?
    `).run(name, email, phone, role, JSON.stringify(permissions || []), isActive ? 1 : 0, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change password
app.post('/api/auth/users/:id/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password=?, updatedAt=? WHERE id=?')
      .run(hash, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Patients Routes ─────────────────────────────────────────────────────────
app.get('/api/patients', (req, res) => {
  const { page = 1, limit = 500, updatedAfter } = req.query;
  const offset = (page - 1) * limit;
  let rows;
  if (updatedAfter) {
    rows = db.prepare('SELECT * FROM patients WHERE updatedAt > ? OR createdAt > ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?')
      .all(updatedAfter, updatedAfter, parseInt(limit), offset);
  } else {
    rows = db.prepare('SELECT * FROM patients ORDER BY updatedAt DESC LIMIT ? OFFSET ?')
      .all(parseInt(limit), offset);
  }
  res.json({ patients: rows, page: parseInt(page), count: rows.length });
});

app.post('/api/patients', (req, res) => {
  try {
    const p = req.body;
    const now = new Date().toISOString();
    // Check if UHID already exists
    if (p.uhid) {
      const existing = db.prepare('SELECT id FROM patients WHERE uhid = ?').get(p.uhid);
      if (existing) {
        db.prepare(`UPDATE patients SET name=?, age=?, gender=?, phone=?, email=?, address=?, bloodGroup=?, updatedAt=? WHERE uhid=?`)
          .run(p.name, p.age, p.gender, p.phone, p.email, p.address, p.bloodGroup, now, p.uhid);
        return res.json({ success: true, id: existing.id, action: 'updated' });
      }
    }
    const result = db.prepare(`
      INSERT INTO patients (uhid,name,age,gender,phone,email,address,bloodGroup,aadhaar,allergies,medicalHistory,conditions,registrationDate,createdAt,updatedAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    `).run(p.uhid, p.name, p.age, p.gender, p.phone||'', p.email||'', p.address||'', p.bloodGroup||'', p.aadhaar||'', p.allergies||'', p.medicalHistory||'', p.conditions||'', p.registrationDate||'', p.createdAt||now, p.updatedAt||now);
    res.json({ success: true, id: result.lastInsertRowid, action: 'created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk upsert patients (for initial data push from admin device)
app.post('/api/patients/bulk', (req, res) => {
  const patients = req.body.patients || req.body;
  if (!Array.isArray(patients)) return res.status(400).json({ error: 'Expected array' });
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO patients (uhid,name,age,gender,phone,email,address,bloodGroup,aadhaar,allergies,medicalHistory,conditions,registrationDate,createdAt,updatedAt,syncStatus)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    ON CONFLICT(uhid) DO UPDATE SET name=excluded.name, updatedAt=excluded.updatedAt
  `);
  const insertMany = db.transaction((rows) => {
    let done = 0;
    for (const p of rows) {
      try {
        upsert.run(p.uhid||'', p.name, p.age, p.gender, p.phone||'', p.email||'', p.address||'', p.bloodGroup||'', p.aadhaar||'', p.allergies||'', p.medicalHistory||'', p.conditions||'', p.registrationDate||'', p.createdAt||now, p.updatedAt||now);
        done++;
      } catch (e) { /* skip bad rows */ }
    }
    return done;
  });
  const done = insertMany(patients);
  res.json({ success: true, inserted: done, total: patients.length });
});

// ─── Prescriptions Routes ────────────────────────────────────────────────────
app.get('/api/prescriptions', (req, res) => {
  const { patientId, uhid, limit = 100, updatedAfter } = req.query;
  let rows;
  if (patientId) {
    rows = db.prepare('SELECT * FROM prescriptions WHERE patientId=? ORDER BY createdAt DESC LIMIT ?').all(parseInt(patientId), parseInt(limit));
  } else if (updatedAfter) {
    rows = db.prepare('SELECT * FROM prescriptions WHERE updatedAt>? OR createdAt>? ORDER BY createdAt DESC LIMIT ?').all(updatedAfter, updatedAfter, parseInt(limit));
  } else {
    rows = db.prepare('SELECT * FROM prescriptions ORDER BY createdAt DESC LIMIT ?').all(parseInt(limit));
  }
  const result = rows.map(r => ({ ...r, medications: tryParse(r.medications), vitals: tryParse(r.vitals), investigations: tryParse(r.investigations) }));
  res.json(result);
});

app.post('/api/prescriptions', (req, res) => {
  try {
    const p = req.body;
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO prescriptions (patientId,uhid,date,doctorId,complaints,diagnosis,notes,medications,vitals,investigations,advisedInvestigations,advice,nextVisit,createdAt,updatedAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    `).run(p.patientId, p.uhid, p.date, p.doctorId||1, p.complaints||'', p.diagnosis||'', p.notes||'',
      JSON.stringify(p.medications||[]), JSON.stringify(p.vitals||{}), JSON.stringify(p.investigations||{}),
      p.advisedInvestigations||'', p.advice||'', p.nextVisit||'', p.createdAt||now, p.updatedAt||now);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/prescriptions/bulk', (req, res) => {
  const prescriptions = req.body.prescriptions || req.body;
  if (!Array.isArray(prescriptions)) return res.status(400).json({ error: 'Expected array' });
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO prescriptions (patientId,uhid,date,doctorId,complaints,diagnosis,notes,medications,vitals,investigations,advisedInvestigations,advice,nextVisit,createdAt,updatedAt,syncStatus)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
  `);
  const insertMany = db.transaction((rows) => {
    let done = 0;
    for (const p of rows) {
      try {
        insert.run(p.patientId, p.uhid, p.date, p.doctorId||1, p.complaints||'', p.diagnosis||'', p.notes||'',
          JSON.stringify(p.medications||[]), JSON.stringify(p.vitals||{}), JSON.stringify(p.investigations||{}),
          p.advisedInvestigations||'', p.advice||'', p.nextVisit||'', p.createdAt||now, p.updatedAt||now);
        done++;
      } catch (e) { /* skip */ }
    }
    return done;
  });
  const done = insertMany(prescriptions);
  res.json({ success: true, inserted: done });
});

// ─── Vitals Routes ───────────────────────────────────────────────────────────
app.get('/api/vitals', (req, res) => {
  const { patientId, limit = 100, updatedAfter } = req.query;
  let rows;
  if (patientId) {
    rows = db.prepare('SELECT * FROM vitals WHERE patientId=? ORDER BY createdAt DESC LIMIT ?').all(parseInt(patientId), parseInt(limit));
  } else if (updatedAfter) {
    rows = db.prepare('SELECT * FROM vitals WHERE createdAt>? ORDER BY createdAt DESC LIMIT ?').all(updatedAfter, parseInt(limit));
  } else {
    rows = db.prepare('SELECT * FROM vitals ORDER BY createdAt DESC LIMIT ?').all(parseInt(limit));
  }
  res.json(rows);
});

app.post('/api/vitals', (req, res) => {
  try {
    const v = req.body;
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO vitals (patientId,uhid,date,recordedBy,systolic,diastolic,pulse,temperature,weight,height,spo2,bloodSugar,bmi,notes,createdAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    `).run(v.patientId, v.uhid, v.date, v.recordedBy||'', v.systolic||null, v.diastolic||null, v.pulse||'', v.temperature||'', v.weight||'', v.height||'', v.spo2||'', v.bloodSugar||'', v.bmi||'', v.notes||'', v.createdAt||now);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/vitals/bulk', (req, res) => {
  const vitals = req.body.vitals || req.body;
  if (!Array.isArray(vitals)) return res.status(400).json({ error: 'Expected array' });
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO vitals (patientId,uhid,date,recordedBy,systolic,diastolic,pulse,temperature,weight,height,spo2,bloodSugar,bmi,notes,createdAt,syncStatus)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
  `);
  const insertMany = db.transaction((rows) => {
    let done = 0;
    for (const v of rows) {
      try {
        insert.run(v.patientId, v.uhid, v.date, v.recordedBy||'', v.systolic||null, v.diastolic||null, v.pulse||'', v.temperature||'', v.weight||'', v.height||'', v.spo2||'', v.bloodSugar||'', v.bmi||'', v.notes||'', v.createdAt||now);
        done++;
      } catch (e) { /* skip */ }
    }
    return done;
  });
  const done = insertMany(vitals);
  res.json({ success: true, inserted: done });
});

// ─── Appointments Routes ─────────────────────────────────────────────────────
app.get('/api/appointments', (req, res) => {
  const { date, limit = 200, updatedAfter } = req.query;
  let rows;
  if (date) {
    rows = db.prepare("SELECT * FROM appointments WHERE date LIKE ? ORDER BY time").all(`${date}%`);
  } else if (updatedAfter) {
    rows = db.prepare('SELECT * FROM appointments WHERE updatedAt>? OR createdAt>? ORDER BY date DESC LIMIT ?').all(updatedAfter, updatedAfter, parseInt(limit));
  } else {
    rows = db.prepare('SELECT * FROM appointments ORDER BY date DESC LIMIT ?').all(parseInt(limit));
  }
  res.json(rows);
});

app.post('/api/appointments', (req, res) => {
  try {
    const a = req.body;
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO appointments (patientId,uhid,date,time,type,status,notes,doctorId,createdAt,updatedAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,?,?,?,'synced')
    `).run(a.patientId, a.uhid, a.date, a.time||'', a.type||'Consultation', a.status||'scheduled', a.notes||'', a.doctorId||1, a.createdAt||now, a.updatedAt||now);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE appointments SET status=?, updatedAt=? WHERE id=?').run(status, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Lab Reports Routes ──────────────────────────────────────────────────────
app.get('/api/lab-reports', (req, res) => {
  const { patientId, limit = 100 } = req.query;
  let rows;
  if (patientId) {
    rows = db.prepare('SELECT * FROM labReports WHERE patientId=? ORDER BY createdAt DESC LIMIT ?').all(parseInt(patientId), parseInt(limit));
  } else {
    rows = db.prepare('SELECT * FROM labReports ORDER BY createdAt DESC LIMIT ?').all(parseInt(limit));
  }
  const result = rows.map(r => ({ ...r, results: tryParse(r.results), analysisData: tryParse(r.analysisData) }));
  res.json(result);
});

app.post('/api/lab-reports', (req, res) => {
  try {
    const r = req.body;
    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO labReports (patientId,uhid,testType,results,analysisData,overallRisk,createdAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,'synced')
    `).run(r.patientId, r.uhid, r.testType||'', JSON.stringify(r.results||[]), JSON.stringify(r.analysisData||{}), r.overallRisk||'normal', r.createdAt||now);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Sync endpoint (for existing syncService compatibility) ──────────────────
app.get('/api/sync/changes', (req, res) => {
  const { since } = req.query;
  const sinceDate = since || new Date(0).toISOString();
  res.json({
    patients: db.prepare('SELECT * FROM patients WHERE updatedAt>? OR createdAt>?').all(sinceDate, sinceDate),
    prescriptions: db.prepare('SELECT * FROM prescriptions WHERE updatedAt>? OR createdAt>?').all(sinceDate, sinceDate).map(r => ({ ...r, medications: tryParse(r.medications) })),
    vitals: db.prepare('SELECT * FROM vitals WHERE createdAt>?').all(sinceDate),
    appointments: db.prepare('SELECT * FROM appointments WHERE updatedAt>? OR createdAt>?').all(sinceDate, sinceDate),
    labReports: db.prepare('SELECT * FROM labReports WHERE createdAt>?').all(sinceDate).map(r => ({ ...r, results: tryParse(r.results) }))
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    patients: db.prepare('SELECT COUNT(*) as c FROM patients').get().c,
    prescriptions: db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c,
    vitals: db.prepare('SELECT COUNT(*) as c FROM vitals').get().c,
    appointments: db.prepare('SELECT COUNT(*) as c FROM appointments').get().c,
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'NexaCare Pro Sync Server', version: '1.0', timestamp: new Date().toISOString() });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tryParse(str) {
  if (!str) return null;
  if (typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch { return str; }
}

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NexaCare Pro — Central Sync Server');
  console.log(`  Running at http://0.0.0.0:${PORT}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log('');
  console.log('  Dedicated static IP (hospital IT): http://1.22.20.11:3001');
  console.log('  Physical PC IP:                   http://192.168.1.131:3001');
  console.log('');
  console.log('  All devices (hospital + remote Hyderabad) open: http://1.22.20.11:3000');
  console.log('  IT must: forward 1.22.20.11:3001→192.168.1.131:3001');
  console.log('           forward 1.22.20.11:3000→192.168.1.131:3000');
  console.log('           allow inbound on ports 3000 and 3001 in Windows Firewall');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
