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
const os = require('os');

// Detect the local LAN IP (e.g. 192.168.1.131) for display in startup messages.
// Server always listens on 0.0.0.0 so every network interface is reachable.
function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'this-PC';
}
const LAN_IP = getLanIp();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// ─── Cloud vs Local detection ────────────────────────────────────────────────
// Railway / Render always set process.env.PORT. Hospital local never does.
const IS_CLOUD = !!process.env.PORT;

// ─── Database setup ─────────────────────────────────────────────────────────
// DATABASE_PATH env allows persistent storage on Railway volumes
// Railway volume: set env var DATABASE_PATH=/data/nexacare-server.db and mount volume at /data
const DB_PATH = process.env.DATABASE_PATH
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'nexacare-server.db')
    : path.join(__dirname, 'nexacare-server.db'));
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
    syncStatus  TEXT DEFAULT 'synced',
    status      TEXT DEFAULT 'doctor_complete'
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

// Migrate existing databases: add status column if it doesn't exist yet
try {
  db.prepare("ALTER TABLE prescriptions ADD COLUMN status TEXT DEFAULT 'doctor_complete'").run();
} catch (e) { /* column already exists — ignore */ }

// Fix existing records that were wrongly defaulted to 'doctor_complete':
// If a prescription has no diagnosis and no real medications, it was a staff draft
try {
  db.prepare(`
    UPDATE prescriptions
    SET status = 'staff_draft'
    WHERE status = 'doctor_complete'
      AND (diagnosis IS NULL OR diagnosis = '')
      AND (medications IS NULL OR medications = '[]' OR medications = '')
  `).run();
} catch (e) { /* ignore */ }

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
  const { page = 1, limit = 500, updatedAfter, search } = req.query;
  const offset = (page - 1) * limit;
  let rows;
  if (search) {
    const q = `%${search}%`;
    rows = db.prepare('SELECT * FROM patients WHERE name LIKE ? OR uhid LIKE ? OR phone LIKE ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?')
      .all(q, q, q, parseInt(limit), offset);
  } else if (updatedAfter) {
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

// Get next available UHID (so all profiles generate unique IDs)
app.get('/api/patients/next-uhid', (req, res) => {
  const row = db.prepare(`SELECT uhid FROM patients WHERE uhid LIKE 'VH%' ORDER BY uhid DESC LIMIT 1`).get();
  let next = 1;
  if (row && row.uhid) {
    const n = parseInt(row.uhid.slice(2));
    if (!isNaN(n)) next = n + 1;
  }
  res.json({ uhid: `VH${String(next).padStart(5, '0')}` });
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
  const { patientId, uhid, limit = 5000, page = 1, updatedAfter } = req.query;
  const lim = parseInt(limit);
  const offset = (parseInt(page) - 1) * lim;
  let rows;
  // All queries use dedup subquery: keep only MIN(id) per unique uhid+createdAt
  if (patientId) {
    rows = db.prepare(`
      SELECT p.* FROM prescriptions p
      INNER JOIN (SELECT MIN(id) as id FROM prescriptions WHERE patientId=? GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON p.id = d.id
      ORDER BY p.createdAt DESC LIMIT ? OFFSET ?
    `).all(parseInt(patientId), lim, offset);
  } else if (uhid) {
    rows = db.prepare(`
      SELECT p.* FROM prescriptions p
      INNER JOIN (SELECT MIN(id) as id FROM prescriptions WHERE uhid=? GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON p.id = d.id
      ORDER BY p.createdAt DESC LIMIT ? OFFSET ?
    `).all(uhid, lim, offset);
  } else if (updatedAfter) {
    rows = db.prepare(`
      SELECT p.* FROM prescriptions p
      INNER JOIN (SELECT MIN(id) as id FROM prescriptions GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON p.id = d.id
      WHERE p.updatedAt>? OR p.createdAt>?
      ORDER BY p.createdAt DESC LIMIT ? OFFSET ?
    `).all(updatedAfter, updatedAfter, lim, offset);
  } else {
    rows = db.prepare(`
      SELECT p.* FROM prescriptions p
      INNER JOIN (SELECT MIN(id) as id FROM prescriptions GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON p.id = d.id
      ORDER BY p.createdAt DESC LIMIT ? OFFSET ?
    `).all(lim, offset);
  }
  const result = rows.map(r => ({ ...r, medications: tryParse(r.medications), vitals: tryParse(r.vitals), investigations: tryParse(r.investigations) }));
  res.json(result);
});

app.post('/api/prescriptions', (req, res) => {
  try {
    const p = req.body;
    const now = new Date().toISOString();
    const status = p.status || (p.diagnosis ? 'doctor_complete' : 'staff_draft');
    const result = db.prepare(`
      INSERT INTO prescriptions (patientId,uhid,date,doctorId,complaints,diagnosis,notes,medications,vitals,investigations,advisedInvestigations,advice,nextVisit,status,createdAt,updatedAt,syncStatus)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    `).run(p.patientId, p.uhid, p.date, p.doctorId||1, p.complaints||'', p.diagnosis||'', p.notes||'',
      JSON.stringify(p.medications||[]), JSON.stringify(p.vitals||{}), JSON.stringify(p.investigations||{}),
      p.advisedInvestigations||'', p.advice||'', p.nextVisit||'', status, p.createdAt||now, p.updatedAt||now);
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
    INSERT INTO prescriptions (patientId,uhid,date,doctorId,complaints,diagnosis,notes,medications,vitals,investigations,advisedInvestigations,advice,nextVisit,status,createdAt,updatedAt,syncStatus)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'synced')
    ON CONFLICT DO NOTHING
  `);
  const upsertStatus = db.prepare(`
    UPDATE prescriptions SET status=?, updatedAt=?, syncStatus='synced'
    WHERE (uhid=? OR patientId=?) AND createdAt=?
  `);
  const insertMany = db.transaction((rows) => {
    let done = 0;
    for (const p of rows) {
      try {
        const status = p.status || (p.diagnosis ? 'doctor_complete' : 'staff_draft');
        const inserted = insert.run(p.patientId, p.uhid, p.date, p.doctorId||1, p.complaints||'', p.diagnosis||'', p.notes||'',
          JSON.stringify(p.medications||[]), JSON.stringify(p.vitals||{}), JSON.stringify(p.investigations||{}),
          p.advisedInvestigations||'', p.advice||'', p.nextVisit||'', status, p.createdAt||now, p.updatedAt||now);
        if (inserted.changes === 0 && p.createdAt && p.status) {
          // Record already exists — update status in case it changed (e.g. doctor_complete)
          upsertStatus.run(status, p.updatedAt||now, p.uhid||'', p.patientId||0, p.createdAt);
        }
        done++;
      } catch (e) { /* skip */ }
    }
    return done;
  });
  const done = insertMany(prescriptions);
  res.json({ success: true, inserted: done });
});

app.put('/api/prescriptions/:id', (req, res) => {
  try {
    const p = req.body;
    const now = new Date().toISOString();
    const status = p.status || (p.diagnosis ? 'doctor_complete' : 'staff_draft');
    db.prepare(`
      UPDATE prescriptions SET
        complaints=?, diagnosis=?, notes=?, medications=?, vitals=?, investigations=?,
        advisedInvestigations=?, advice=?, nextVisit=?, status=?, updatedAt=?, syncStatus='synced'
      WHERE id=?
    `).run(p.complaints||'', p.diagnosis||'', p.notes||'',
      JSON.stringify(p.medications||[]), JSON.stringify(p.vitals||{}), JSON.stringify(p.investigations||{}),
      p.advisedInvestigations||'', p.advice||'', p.nextVisit||'', status, p.updatedAt||now,
      req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Vitals Routes ───────────────────────────────────────────────────────────
app.get('/api/vitals', (req, res) => {
  const { patientId, limit = 10000, page = 1, updatedAfter } = req.query;
  const lim = parseInt(limit);
  const offset = (parseInt(page) - 1) * lim;
  let rows;
  // All queries use dedup subquery: keep only MIN(id) per unique uhid+createdAt
  if (patientId) {
    rows = db.prepare(`
      SELECT v.* FROM vitals v
      INNER JOIN (SELECT MIN(id) as id FROM vitals WHERE patientId=? GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON v.id = d.id
      ORDER BY v.createdAt DESC LIMIT ? OFFSET ?
    `).all(parseInt(patientId), lim, offset);
  } else if (updatedAfter) {
    rows = db.prepare(`
      SELECT v.* FROM vitals v
      INNER JOIN (SELECT MIN(id) as id FROM vitals GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON v.id = d.id
      WHERE v.createdAt>?
      ORDER BY v.createdAt DESC LIMIT ? OFFSET ?
    `).all(updatedAfter, lim, offset);
  } else {
    rows = db.prepare(`
      SELECT v.* FROM vitals v
      INNER JOIN (SELECT MIN(id) as id FROM vitals GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON v.id = d.id
      ORDER BY v.createdAt DESC LIMIT ? OFFSET ?
    `).all(lim, offset);
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
    // Return only deduplicated prescriptions/vitals (no duplicates sent to client)
    prescriptions: db.prepare(`
      SELECT p.* FROM prescriptions p
      INNER JOIN (SELECT MIN(id) as id FROM prescriptions GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON p.id = d.id
      WHERE p.updatedAt>? OR p.createdAt>?
    `).all(sinceDate, sinceDate).map(r => ({ ...r, medications: tryParse(r.medications) })),
    vitals: db.prepare(`
      SELECT v.* FROM vitals v
      INNER JOIN (SELECT MIN(id) as id FROM vitals GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')) d ON v.id = d.id
      WHERE v.createdAt>?
    `).all(sinceDate),
    appointments: db.prepare('SELECT * FROM appointments WHERE updatedAt>? OR createdAt>?').all(sinceDate, sinceDate),
    labReports: db.prepare('SELECT * FROM labReports WHERE createdAt>?').all(sinceDate).map(r => ({ ...r, results: tryParse(r.results) }))
  });
});

// ─── Admin: Deduplicate server database ──────────────────────────────────────
// Removes duplicate prescriptions and vitals (keeps earliest record per patient+timestamp)
app.post('/api/admin/dedup', (req, res) => {
  try {
    const rxDel = db.prepare(`
      DELETE FROM prescriptions WHERE id NOT IN (
        SELECT MIN(id) FROM prescriptions GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')
      )
    `).run();
    const vDel = db.prepare(`
      DELETE FROM vitals WHERE id NOT IN (
        SELECT MIN(id) FROM vitals GROUP BY COALESCE(uhid,''), COALESCE(createdAt,'')
      )
    `).run();
    const stats = {
      prescriptions: db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c,
      vitals: db.prepare('SELECT COUNT(*) as c FROM vitals').get().c,
    };
    console.log(`Dedup complete: removed ${rxDel.changes} prescription dupes, ${vDel.changes} vital dupes`);
    res.json({
      success: true,
      removed: { prescriptions: rxDel.changes, vitals: vDel.changes },
      remaining: stats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

// Version endpoint — clients poll this to detect when server has new code
let _serverVersion = null;
app.get('/api/version', (req, res) => {
  if (!_serverVersion) {
    try {
      _serverVersion = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
    } catch (_) { _serverVersion = Date.now().toString(); }
  }
  res.json({ version: _serverVersion });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tryParse(str) {
  if (!str) return null;
  if (typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch { return str; }
}

// ─── Serve React app ─────────────────────────────────────────────────────────
const DIST_PATH = path.join(__dirname, 'dist');
const APP_PORT = 3000;

if (fs.existsSync(DIST_PATH)) {
  // Serve static assets (JS/CSS with content hashes) with 1-day cache.
  // index.html must NEVER be cached — it references hashed filenames, so if
  // the browser caches index.html it will miss new JS/CSS after a rebuild.
  app.use(express.static(DIST_PATH, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for hashed assets
      }
    },
  }));
  // SPA fallback: all non-/api/* routes return index.html
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });

  // Also serve on port 3000 for hospital local network backward compatibility.
  // (Hospital devices already bookmarked :3000 — keep that working.)
  if (!IS_CLOUD) {
    const appExpress = require('express')();
    appExpress.use(require('cors')({ origin: '*' }));
    appExpress.use(express.static(DIST_PATH, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }));
    appExpress.get('/{*path}', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(DIST_PATH, 'index.html'));
    });
    appExpress.listen(APP_PORT, '0.0.0.0', () => {
      console.log(`  App server (local):  http://0.0.0.0:${APP_PORT}`);
    });
  }
} else {
  console.log(`  ⚠️  dist/ folder not found — run "npm run build" first`);
}

// ─── Remote update endpoint (called from Hyderabad to push new code to hospital) ──
const { execSync, exec } = require('child_process');
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'VardhanUpdate2025!';

app.post('/api/admin/update', (req, res) => {
  const { secret } = req.body;
  if (secret !== UPDATE_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json({ success: true, message: 'Updating code. Server will restart in ~5 seconds.' });
  // Force reset to remote — handles blocked git pull due to local dist/ changes
  setTimeout(() => {
    exec('git fetch origin && git reset --hard origin/claude/verify-local-deployment-09Im8', { cwd: __dirname, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('Update failed:', stderr);
      } else {
        console.log('Update successful:', stdout.trim(), '— restarting...');
        process.exit(0);
      }
    });
  }, 500);
});

// ─── Auto-update on startup: force reset to remote so local dist/ changes never block ──
try {
  execSync('git fetch origin', { cwd: __dirname, timeout: 15000 });
  const resetResult = execSync('git reset --hard origin/claude/verify-local-deployment-09Im8', { cwd: __dirname, timeout: 15000 }).toString().trim();
  console.log('✅ Auto-updated from git:', resetResult.split('\n')[0]);
} catch (e) {
  console.log('ℹ️  Git update skipped (no network / not a git repo):', e.message?.split('\n')[0]);
}

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  NexaCare Pro — Vardhan Hospital EMR Server');
  console.log(`  Port: ${PORT}  |  DB: ${DB_PATH}`);
  if (IS_CLOUD) {
    console.log('  Mode: CLOUD — React app + API on same port');
    console.log('  URL:  set by Railway/Render (check dashboard)');
  } else {
    console.log('  Mode: LOCAL HOSPITAL');
    console.log(`  LAN IP: ${LAN_IP}`);
    console.log(`  App (React):  http://${LAN_IP}:${APP_PORT}`);
    console.log(`  API server:   http://${LAN_IP}:${PORT}`);
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// ─── Port 80: combined React + API for all hospital devices ──────────────────
// Port 80 = no port number needed in URL. All devices on WiFi use http://LAN_IP
// serverUrl.js returns same-origin for port 80 so API calls route correctly.
if (!IS_CLOUD) {
  app.listen(80, '0.0.0.0', () => {
    console.log('');
    console.log('  ============================================');
    console.log('  HOSPITAL STAFF - Open Chrome and go to:');
    console.log('');
    console.log(`  PRIMARY:   http://${LAN_IP}`);
    console.log(`  FALLBACK:  http://${LAN_IP}:3000`);
    console.log('');
    console.log('  Works on ALL devices on hospital WiFi');
    console.log('  ============================================');
    console.log('');
  }).on('error', (e) => {
    if (e.code === 'EACCES') {
      console.log('  WARNING: Port 80 needs Administrator - run start.bat as Admin');
      console.log(`  Devices can use http://${LAN_IP}:3000 in the meantime`);
    } else if (e.code !== 'EADDRINUSE') {
      console.log('  Port 80 error:', e.message);
    }
  });
}
