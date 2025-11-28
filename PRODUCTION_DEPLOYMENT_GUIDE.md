# 🚀 NexaCare Pro - Production Deployment Guide
## Vardhan Hospital - Go-Live Tomorrow

**Product:** NexaCare Pro v1.0
**Developed by:** NexaVoyagers Technologies Pvt. Ltd.
**Client:** Vardhan Hospital, Varanasi
**Deployment Date:** [Tomorrow]
**Prepared by:** Technical Team

---

## ⚠️ CRITICAL: Pre-Deployment Checklist

### Before You Start:
- [ ] Backup hospital's existing patient data
- [ ] Ensure hospital has stable internet (for initial setup only)
- [ ] Verify static IP address for server (if using local server)
- [ ] Prepare all doctor/staff login credentials
- [ ] Download this application to USB drive as backup
- [ ] Test on ONE device first before mass deployment

---

## 📋 What's Included

### ✅ Features:
1. **Patient Management** - Complete EMR with search, history
2. **Prescription Writer** - Digital prescriptions with templates
3. **Vitals Recording** - BP, Pulse, Temp, SpO2, Weight, Height
4. **Lab Reports** - Upload and track all lab investigations
5. **Appointments** - Schedule and manage patient appointments
6. **AI Lab Analysis** - Automatic detection of abnormal values
7. **Doc On Import** - Import existing patient data
8. **Automatic Backup** - Protects data every hour
9. **User Management** - 2-5 users with role-based access
10. **Offline-First** - Works without internet

---

## 🎯 Deployment Options

### **Option 1: Static Server (RECOMMENDED for Hospital)**

**Best for:** Central hospital server accessible by all devices

#### Step 1: Server Setup

```bash
# On hospital server (Windows/Linux)

1. Copy the entire 'dist' folder to server
   Location: C:\NexaCare\app (Windows) or /var/www/nexacare (Linux)

2. Install Node.js (if not installed)
   Download: https://nodejs.org (LTS version)

3. Open Command Prompt/Terminal in the folder

4. Install a simple HTTP server:
   npm install -g serve

5. Start the server:
   serve -s dist -l 3000

   # For production (keeps running):
   serve -s dist -l 3000 --no-clipboard
```

#### Step 2: Find Server IP Address

```bash
# Windows:
ipconfig
# Look for "IPv4 Address"

# Linux/Mac:
ifconfig
# Look for "inet" address
```

**Example:** Server IP might be `192.168.1.100`

#### Step 3: Access from Devices

**URL Format:** `http://[SERVER-IP]:3000`

**Examples:**
- `http://192.168.1.100:3000`
- `http://10.0.0.50:3000`

**Configure on Each Device:**
1. Open browser (Chrome recommended)
2. Type the URL
3. Bookmark it
4. Add to home screen (mobile/tablet)

---

### **Option 2: Individual Installation (Each Device)**

**Best for:** Tablets/phones that need offline access

#### Desktop (Windows/Mac/Linux):

1. Copy `dist` folder to desktop
2. Install Node.js
3. Open terminal in `dist` folder
4. Run: `npx serve -s . -l 3000`
5. Open browser: `http://localhost:3000`
6. Bookmark the URL

#### Mobile/Tablet (PWA Installation):

1. Open `http://[SERVER-IP]:3000` in Chrome/Safari
2. Click browser menu (⋮)
3. Select "Add to Home Screen" or "Install App"
4. Name it "NexaCare Pro"
5. App icon will appear on home screen
6. Launch like a normal app - WORKS OFFLINE!

---

## 🔐 Security Configuration

### 1. **HTTPS Setup (IMPORTANT for Production)**

**Why:** Protects patient data in transit

#### Using ngrok (Quick Setup):
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
```

#### Using Let's Encrypt (Permanent):
```bash
# Install certbot
# Follow: https://certbot.eff.org/

# Get certificate for your domain
sudo certbot certonly --standalone -d nexacare.vardhanhospital.com

# Configure your server to use HTTPS
```

### 2. **Network Security**

```bash
# Firewall Rules (Windows):
- Allow port 3000 for local network only
- Block external access

# Router Configuration:
- Set static IP for server
- Enable MAC address filtering
- Disable port forwarding from internet
```

### 3. **Access Control**

**Login Credentials:**
- **Default Admin:** username: `admin`, password: `vardhan@2025`
- **⚠️ CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN**

**User Roles Available:**
1. **Admin** - Full access
2. **Doctor** - Patient records, prescriptions
3. **Nurse** - Vitals, basic patient info
4. **Receptionist** - Appointments, patient registration
5. **Lab Tech** - Lab reports only

---

## 📱 Device-Specific Installation

### **Tablets (Android/iOS):**

1. Connect to hospital WiFi
2. Open Chrome (Android) or Safari (iOS)
3. Go to `http://[SERVER-IP]:3000`
4. Login with credentials
5. Tap menu → "Add to Home Screen"
6. Customize name: "NexaCare - Vardhan Hospital"
7. Icon appears - works like native app!

**Offline Mode:**
- Once installed, works WITHOUT internet
- Data syncs when back online
- Auto-backup every hour

### **Doctor's Tablets - Special Setup:**

```bash
# Each doctor should:
1. Install app as above
2. Login with THEIR credentials (not admin)
3. Test by adding one test patient
4. Verify they can:
   - Search patients
   - Write prescription
   - Record vitals
   - View lab reports
```

### **Desktop App (Optional):**

For a true desktop experience:

```bash
# We can create an Electron wrapper
# Contact NexaVoyagers for desktop build
# Email: contact@nexavoyagers.com
```

---

## 💾 Data Migration

### Importing Existing Patient Data

#### From Doc On System:

1. Go to **Doc On Importer** in sidebar
2. Upload CSV files:
   - `patients.csv`
   - `visits.csv`
   - `vitals.csv`
   - `lab_results.csv`
3. Click "Import All"
4. Wait for completion
5. Verify patient count on Dashboard

#### From Other Systems:

1. Export data to CSV format
2. Use **CSV Import** in sidebar
3. Map columns to NexaCare fields
4. Import and verify

**⚠️ IMPORTANT:**
- Do this ONCE on the main server
- Other devices will sync automatically
- Create backup BEFORE importing

---

## 🔄 Backup & Data Protection

### Automatic Backups:

**System creates backups every hour automatically.**

Location: Browser localStorage (5 copies kept)

### Manual Backups:

1. Go to **Backup & Restore** in sidebar
2. Click "Download Backup File"
3. Save to:
   - USB Drive
   - Network Drive
   - Cloud Storage (Google Drive/Dropbox)

**Recommended Schedule:**
- **Daily:** Before closing
- **Weekly:** Sunday evening
- **Monthly:** Last day of month
- **Before Updates:** Always!

### Restore Data:

1. Go to **Backup & Restore**
2. Click "Select Backup File"
3. Choose `.json` backup file
4. Confirm restore
5. Page will reload with restored data

---

## 👥 User Management

### Creating User Accounts:

1. Login as **Admin**
2. Go to **User Management** (sidebar)
3. Click "Add New User"
4. Fill details:
   - Full Name
   - Username (unique)
   - Email
   - Role (Doctor/Nurse/etc.)
   - Password (user must change on first login)
5. Save

### For 2-5 Users Setup:

**Example Configuration:**

| User | Role | Permissions |
|------|------|-------------|
| Dr. Vivek Raj Singh | Admin | Full access |
| Dr. [Name] | Doctor | Patients, Prescriptions, Vitals, Labs |
| Nurse [Name] | Nurse | Vitals, Basic patient info |
| [Name] | Receptionist | Appointments, Registration |
| [Name] | Lab Tech | Lab reports only |

### User Permissions by Role:

```
ADMIN:
  ✓ All features
  ✓ User management
  ✓ System settings
  ✓ Backups
  ✓ Data import/export

DOCTOR:
  ✓ View/edit patients
  ✓ Write prescriptions
  ✓ Record vitals
  ✓ View lab reports
  ✓ Appointments
  ✗ User management
  ✗ System settings

NURSE:
  ✓ View patients
  ✓ Record vitals
  ✓ View prescriptions
  ✗ Write prescriptions
  ✗ Edit patient records

RECEPTIONIST:
  ✓ Register new patients
  ✓ Schedule appointments
  ✓ View patient list
  ✗ Medical records
  ✗ Prescriptions

LAB TECH:
  ✓ Upload lab reports
  ✓ View lab history
  ✗ Patient records
  ✗ Prescriptions
```

---

## 🏥 Go-Live Procedure (Tomorrow)

### Timeline: 8:00 AM - 12:00 PM

#### **8:00 AM - 9:00 AM: Server Setup**

- [ ] Set up hospital server
- [ ] Install Node.js and dependencies
- [ ] Copy application files
- [ ] Start server
- [ ] Note down server IP
- [ ] Test access from one device

#### **9:00 AM - 10:00 AM: Data Import**

- [ ] Backup existing data
- [ ] Import patient data from Doc On
- [ ] Verify patient count
- [ ] Check sample patient records
- [ ] Create first manual backup

#### **10:00 AM - 11:00 AM: Device Setup**

- [ ] Install on doctor's tablets (2-3)
- [ ] Install on desktop computers
- [ ] Install on nurse stations
- [ ] Install on reception
- [ ] Test from each device

#### **11:00 AM - 12:00 PM: Training & Testing**

- [ ] Train doctors (see training guide)
- [ ] Train nurses
- [ ] Train reception staff
- [ ] Create test appointments
- [ ] Write test prescription
- [ ] Record test vitals
- [ ] Upload test lab report

#### **12:00 PM: Go-Live**

- [ ] All systems operational
- [ ] Support contact ready
- [ ] Backup verified
- [ ] Users logged in
- [ ] **START USING FOR REAL PATIENTS**

---

## 📞 Support & Troubleshooting

### Common Issues:

#### 1. "Cannot connect to server"

**Solution:**
- Check server is running
- Verify IP address is correct
- Check WiFi connection
- Restart server: `Ctrl+C` then restart serve command

#### 2. "Patient not found" error

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard reload (Ctrl+Shift+R)
- Restore from latest backup if needed

#### 3. "Login failed"

**Solution:**
- Verify username/password
- Check Caps Lock
- Reset password from admin account

#### 4. Data not syncing

**Solution:**
- Check internet connection
- Check sync status in header
- Click "Sync" button manually
- Verify server is reachable

#### 5. App slow/frozen

**Solution:**
- Close other browser tabs
- Clear browser cache
- Restart browser
- Restart device if needed

### Emergency Recovery:

#### If database gets corrupted:

1. Go to **Backup & Restore**
2. Choose most recent automatic backup
3. Click "Restore"
4. System will reload with backup data

#### If server crashes:

1. Restart server:
   ```bash
   # Stop: Ctrl+C
   # Start: serve -s dist -l 3000
   ```

2. If still fails, reboot server
3. Access automatic backups from any device

---

## 📊 Monitoring & Maintenance

### Daily Checks:

- [ ] Verify backup ran (check Backup & Restore page)
- [ ] Check pending sync items (top right corner)
- [ ] Review patient count on dashboard
- [ ] Ensure all users can login

### Weekly Maintenance:

- [ ] Download manual backup to USB
- [ ] Review user accounts
- [ ] Check system logs
- [ ] Update if new version available

### Monthly Tasks:

- [ ] Full system backup to external drive
- [ ] Review and archive old data
- [ ] Update user passwords
- [ ] Test restore procedure

---

## 🎓 Training Resources

See **TRAINING_GUIDE.md** for:
- Doctor training (30 minutes)
- Nurse training (20 minutes)
- Reception training (15 minutes)
- Quick reference cards
- Video tutorials (if available)

---

## 📧 Contact & Support

### NexaVoyagers Technologies Pvt. Ltd.

**Email:** contact@nexavoyagers.com
**Product:** NexaCare Pro v1.0
**License:** Proprietary - Licensed to Vardhan Hospital

**Support Hours:** Mon-Sat, 9 AM - 6 PM
**Emergency:** [Provide emergency contact]

### License Information:

```
Product: NexaCare Pro™ v1.0
License Type: Single Hospital License
Licensed to: Vardhan Hospital, Varanasi
Installation Date: [Tomorrow's Date]
License Key: [Will be provided]
Users Allowed: Up to 5 concurrent users
Devices: Unlimited within hospital network
```

**⚠️ Important Legal Notes:**
- This software is proprietary
- Unauthorized copying prohibited
- For Vardhan Hospital use only
- Support included for 1 year
- Updates included for 1 year

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Server running and accessible
- [ ] All devices can access application
- [ ] Users created and can login
- [ ] Patient data imported and verified
- [ ] Backup system working
- [ ] At least one prescription written successfully
- [ ] At least one vital recorded
- [ ] At least one appointment created
- [ ] Manual backup downloaded to safe location
- [ ] Staff trained
- [ ] Support contact saved
- [ ] This guide kept for reference

---

## 🎯 Success Criteria

**Deployment is successful when:**

1. ✅ All doctors can access from their tablets
2. ✅ Patient search works instantly
3. ✅ Prescriptions can be written and printed
4. ✅ Vitals can be recorded
5. ✅ Lab reports can be uploaded
6. ✅ Appointments can be scheduled
7. ✅ System works offline
8. ✅ Data is automatically backed up
9. ✅ All imported patient records visible
10. ✅ Staff knows how to use basic features

---

## 📱 Quick Access URLs

**After deployment, bookmark these:**

- Main Application: `http://[SERVER-IP]:3000`
- Dashboard: `http://[SERVER-IP]:3000/`
- Patients: `http://[SERVER-IP]:3000/patients`
- Backup: `http://[SERVER-IP]:3000/backup-restore`
- Settings: `http://[SERVER-IP]:3000/settings`

**Save this as:**
- Desktop shortcut
- Browser bookmark
- Mobile home screen icon

---

## 🔒 Security Best Practices

1. **Change default passwords immediately**
2. **Use HTTPS in production** (ngrok or Let's Encrypt)
3. **Regular backups** - daily minimum
4. **Limit network access** - hospital WiFi only
5. **Lock devices** when not in use
6. **Review user access** regularly
7. **Monitor login attempts**
8. **Keep USB backup** off-site
9. **Update software** when notified
10. **Train staff** on security

---

## 📄 Appendix: Technical Specifications

### System Requirements:

**Server:**
- OS: Windows 10+, Linux, macOS
- RAM: 4GB minimum, 8GB recommended
- Storage: 50GB available
- Network: 100Mbps LAN

**Client Devices:**
- Browser: Chrome 90+, Safari 14+, Edge 90+
- RAM: 2GB minimum
- Storage: 500MB available
- Screen: 10" minimum for tablets

### Network Requirements:

- Local network: 100Mbps
- Internet: 10Mbps (for initial setup only)
- Static IP for server (recommended)
- WiFi for mobile devices

### Performance:

- Page load: <2 seconds
- Patient search: <100ms
- Data sync: Real-time
- Backup: Every 60 minutes
- Offline capability: Full

---

**END OF PRODUCTION DEPLOYMENT GUIDE**

**Prepared by:** NexaVoyagers Technologies
**For:** Vardhan Hospital, Varanasi
**Version:** 1.0
**Date:** [Current Date]

---

Good Luck with Tomorrow's Deployment! 🚀
