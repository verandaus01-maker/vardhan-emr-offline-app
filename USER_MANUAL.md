# Vardhan Hospital EMR - Complete User Manual

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Dashboard](#dashboard)
3. [Patient Management](#patient-management)
4. [Writing Prescriptions](#writing-prescriptions)
5. [Recording Vitals](#recording-vitals)
6. [Appointments](#appointments)
7. [Reports](#reports)
8. [Data Migration](#data-migration)
9. [Settings](#settings)
10. [Offline Mode](#offline-mode)
11. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Quick Start

### First Time Login

1. **Open the App** on your tablet
2. The app will automatically initialize
3. You'll see the Dashboard

### Understanding the Interface

```
┌─────────────────────────────────────────────────┐
│  🏥 Vardhan Hospital EMR    Status  Sync  👤 Dr │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────┐   MAIN CONTENT AREA                  │
│  │ HOME │   • Dashboard                          │
│  │ PATIENTS│   • Patient Search                  │
│  │ APPTS│   • Prescriptions                     │
│  │ REPORTS│   • etc.                             │
│  │ SETTINGS│                                     │
│  └──────┘                                        │
└─────────────────────────────────────────────────┘
```

---

## 🏠 Dashboard

The Dashboard is your home screen showing:

### 1. Statistics Cards
- **Total Patients**: All patients in your database
- **Prescriptions**: Total prescriptions written
- **Vitals**: Total vitals recorded
- **Appointments**: Scheduled appointments

### 2. Today's Appointments
- Shows today's patient schedule
- Color-coded by status:
  - 🟡 Yellow: Scheduled
  - 🔵 Blue: In Progress
  - 🟢 Green: Completed

### 3. Recent Prescriptions
- Last 5 prescriptions written
- Click to view details

### 4. Quick Actions
- **Search Patient**: Jump to patient search
- **New Appointment**: Schedule appointment
- **Import from Doc On**: Start data migration
- **Settings**: Configure system

---

## 👥 Patient Management

### Searching for Patients

1. Click **"Patients"** in sidebar
2. Type in the search box:
   - Patient name (e.g., "Rajesh Kumar")
   - UHID (e.g., "VH27001")
   - Phone number (e.g., "9876543210")
   - Aadhaar number
   - Email

3. Results appear instantly as you type
4. Click on patient card to open details

### Adding New Patients

1. Click **"Add New Patient"** button
2. Fill required fields (marked with *):
   - Full Name *
   - Age *
   - Gender *
   - Phone Number *
3. Optional fields:
   - Email
   - Address
   - Blood Group
   - Aadhaar Number
   - Known Allergies
4. Click **"Add Patient"**

**UHID is auto-generated** (e.g., VH00001, VH00002, etc.)

### Viewing Patient Details

Patient details page shows:

#### A. Personal Information
- Name, Age, Gender, UHID
- Contact: Phone, Email, Address
- Verification status

#### B. Medical Information
- Blood Group
- Known Allergies ⚠️
- Latest Vitals

#### C. Chronic Conditions
- List of ongoing conditions
- Add new conditions with "+" button

#### D. Quick Actions
- **Write New Prescription** - Start consultation
- **Record Vitals** - Enter vital signs
- **View Full History** - See all records

#### E. Previous Consultations
- Shows last 10 prescriptions
- Each shows:
  - Date and doctor
  - Diagnosis
  - Medications prescribed
- Click "View →" to see full prescription

---

## 📝 Writing Prescriptions

### Step-by-Step Guide

#### 1. Open Prescription Writer
- From patient details, click **"Write New Prescription"**

#### 2. Patient Information
- Auto-filled at the top
- Shows: Name, Age, Gender, UHID, Phone

#### 3. Chief Complaints
```
Example:
"Chest discomfort for 2 days, breathlessness on exertion"
```
- Describe patient's main complaints
- Optional but recommended

#### 4. Diagnosis
```
Example:
"Hypertension Stage 2, Type 2 Diabetes Mellitus"
```
- **Required field**
- Quick buttons available for common diagnoses:
  - Hypertension Stage 2
  - Type 2 Diabetes
  - Acute URTI
  - Angina Pectoris

#### 5. Adding Medications

**Option A: Search Drug Database**
1. Click **"Search Drug Database"**
2. Type drug name (e.g., "Amlodipine")
3. Select from suggestions
4. Medication auto-filled with common dosage

**Option B: Add Manually**
1. Click **"Add Manually"**
2. Fill in:
   - Medicine name (e.g., "Tab. Amlodipine 5mg")
   - Dosage (e.g., "1 tablet")
   - Frequency:
     - Once daily (OD)
     - Twice daily (BD)
     - Thrice daily (TDS)
     - Four times (QID)
     - Morning (1-0-0)
     - Evening (0-0-1)
     - Morning & Evening (1-0-1)
     - SOS (If needed)
   - Duration (e.g., "30 days")
   - Instructions:
     - After food
     - Before food
     - With food
     - Empty stomach
     - At bedtime

**To Remove**: Click the "×" button on medication

#### 6. Investigations
```
Example:
"Complete Blood Count, Lipid Profile, ECG, 2D Echo"
```
- Lab tests or investigations to be done

#### 7. Advice & Lifestyle Modifications
```
Example:
"Low salt diet, Regular exercise 30 min daily, Avoid smoking,
Monitor BP daily, Reduce stress"
```
- Patient education and lifestyle advice

#### 8. Follow-up
- Select follow-up period:
  - 3 days
  - 1 week
  - 2 weeks
  - 1 month (common)
  - 3 months
  - 6 months
  - SOS (If needed)
- Set next visit date (optional)

#### 9. Save & Print
- Click **"Save Prescription"**
  - Saved locally (works offline)
  - Queued for sync to Doc On
- Click **"Print"** to print prescription
  - Hospital letterhead
  - Doctor signature
  - QR code for verification

### Prescription Layout

```
╔═══════════════════════════════════════════════════╗
║  ℞ Prescription                     Date: DD-MMM-YY║
║  Vardhan Hospital - Cardiology                    ║
║  Dr. Vivek Raj Singh, MD (Cardiology)            ║
║───────────────────────────────────────────────────║
║  Patient: [Name] | Age: XX | UHID: VHXXXXX       ║
╠═══════════════════════════════════════════════════╣
║  Chief Complaints:                                ║
║  [Patient complaints]                             ║
║                                                   ║
║  Diagnosis:                                       ║
║  [Diagnosis]                                      ║
║                                                   ║
║  💊 Medications:                                  ║
║  1. Tab. [Medicine] - [Dose] - [Frequency] - [Days]║
║  2. ...                                           ║
║                                                   ║
║  🔬 Investigations:                               ║
║  [Tests advised]                                  ║
║                                                   ║
║  📝 Advice:                                       ║
║  [Lifestyle modifications]                        ║
║                                                   ║
║  Follow-up: [Period]                             ║
║───────────────────────────────────────────────────║
║                            Dr. Vivek Raj Singh    ║
║                            MD (Cardiology)        ║
╚═══════════════════════════════════════════════════╝
```

---

## 📊 Recording Vitals

### How to Record Vitals

1. From patient details, click **"Record Vitals"**
2. Fill in available measurements:

   **Blood Pressure**
   - Systolic / Diastolic (e.g., 120/80)

   **Heart Rate**
   - Beats per minute (e.g., 72)

   **Temperature**
   - In Fahrenheit (e.g., 98.6)

   **SpO2**
   - Oxygen saturation % (e.g., 98)

   **Weight**
   - In kilograms (e.g., 78.5)

   **Height**
   - In centimeters (e.g., 170)

   **Blood Sugar**
   - mg/dL (specify: Random/Fasting/PP)

   **Notes**
   - Any additional observations

3. Click **"Save Vitals"**

### Viewing Vitals History

- In patient details, vitals section shows:
  - Latest vital signs
  - Date recorded
- Click "View Full History" to see trends

---

## 📅 Appointments

### Today's Schedule

1. Click **"Appointments"** in sidebar
2. View today's appointments:
   - Patient name
   - Scheduled time
   - Appointment type
   - Status

### Status Colors
- 🟡 **Scheduled**: Not started
- 🔵 **In Progress**: Currently consulting
- 🟢 **Completed**: Finished

### Adding New Appointment

1. Click **"New Appointment"**
2. Fill details:
   - Patient (search and select)
   - Date and time
   - Appointment type
   - Notes
3. Click **"Schedule"**

---

## 📈 Reports

### Available Reports

1. **Overview Statistics**
   - Total patients
   - Total prescriptions
   - Vitals recorded
   - Pending sync items

2. **Monthly Summary**
   - Consultations per month
   - Common diagnoses
   - Patient demographics

3. **Custom Reports** (Coming Soon)
   - Date range selection
   - Export to PDF/Excel

---

## 🔄 Data Migration

### Importing from Doc On

#### Prerequisites
1. Doc On API URL and API Key (from Doc On support)
2. Stable internet connection
3. 30-60 minutes for 27,000 patients

#### Steps

1. **Configure API** (one-time)
   - Go to Settings
   - Enter Doc On API URL
   - Enter API Key
   - Save

2. **Start Import**
   - Go to Data Migration
   - Click **"Start Import from Doc On"**
   - Confirm the action

3. **Monitor Progress**
   - Progress bar shows current status
   - Page shows: "Imported 1,500 of 27,000 patients"
   - Do NOT close app during import

4. **Completion**
   - Success message appears
   - Verify in Patients page
   - Create backup immediately

### Import/Export CSV

#### Export to CSV
1. Go to Data Migration
2. Click **"Export to CSV"**
3. File downloads automatically
4. Use for external analysis or backup

#### Import from CSV
1. Prepare CSV with columns:
   ```
   UHID, Name, Age, Gender, Phone, Email, Address, Blood Group
   ```
2. Go to Data Migration
3. Click **"Import from CSV"**
4. Select your CSV file
5. Duplicates are automatically skipped

---

## ⚙️ Settings

### Hospital Information
- Hospital Name
- Address
- Phone
- Email

**Used in**: Prescription letterhead, reports

### Doc On Integration
- **API URL**: Doc On server address
- **API Key**: Your authentication key
- **Auto Sync**: Enable/disable automatic sync
- **Sync Interval**: How often to sync (1-30 minutes)

### Backup & Restore

#### Creating Backup
1. Click **"Download Backup"**
2. File saves to Downloads
3. Format: `vardhan-emr-backup-[date].json`
4. **Store securely** - contains all patient data

#### Restoring Backup
1. Click **"Restore from Backup"**
2. Select backup JSON file
3. Confirm restoration
4. ⚠️ **Warning**: Replaces all current data

### Recommended Backup Schedule
- **Daily**: If using actively
- **Weekly**: For regular use
- **Before updates**: Always backup first

---

## 🌐 Offline Mode

### How Offline Mode Works

#### When Online (🟢)
- All actions sync to Doc On immediately
- New data downloads from cloud
- Status bar shows "Online"

#### When Offline (🟡)
- **Everything still works!**
- Data saved locally
- Changes queued for sync
- Status bar shows "Offline Mode Active"
- Yellow indicator shows pending items

### What Works Offline
✅ Search patients
✅ View patient details
✅ Write prescriptions
✅ Record vitals
✅ Add new patients
✅ Schedule appointments
✅ View reports
✅ Create backups

### What Requires Internet
❌ Initial setup
❌ Data migration from Doc On
❌ Syncing changes
❌ Downloading patient updates from cloud

### Going Back Online

When internet returns:
1. Status changes to "Online"
2. Auto-sync starts (within 5 minutes)
3. Or click **"Sync Now"** button
4. Progress shows:
   - "Uploading 5 prescriptions"
   - "Downloading 2 updates"
5. Completion: "All data synced"

### Sync Status Indicators

```
╔════════════════════════════════════════╗
║ 🟢 Online | 📁 27,000 patients         ║
║ Last synced: 2 min ago | Pending: 0   ║
║                        [Sync Now] ↻   ║
╚════════════════════════════════════════╝
```

- **Green**: Online and synced
- **Yellow**: Offline, data queued
- **Number**: Pending items to sync

---

## 💡 Tips & Best Practices

### Daily Workflow

**Morning (5 minutes)**
1. Open app
2. Check offline mode indicator
3. Review today's appointments
4. Sync if pending items exist

**During Consultations**
1. Search patient
2. Record vitals first
3. Write prescription
4. Save and continue
5. No need to wait for sync

**End of Day (5 minutes)**
1. Ensure internet connection
2. Click "Sync Now"
3. Verify all data synced
4. Check daily statistics

### Writing Prescriptions Faster

1. **Use Drug Search**: Faster than typing
2. **Quick Diagnosis**: Use quick buttons
3. **Templates**: Save common prescriptions
4. **Copy Previous**: Base on last prescription

### Data Safety

✅ **DO**
- Backup weekly
- Store backups in cloud (Google Drive)
- Keep at least 3 recent backups
- Sync daily when online
- Update app when prompted

❌ **DON'T**
- Clear browser data carelessly
- Uninstall without backup
- Share API keys
- Skip backups
- Ignore sync errors

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Patient not found | Check spelling, try UHID or phone |
| Sync not working | Check API key in Settings |
| App slow | Close other apps, restart tablet |
| Can't save | Check storage space |
| Prescription not printing | Check printer connection |

### Keyboard Shortcuts

- **Ctrl/Cmd + F**: Focus search
- **Ctrl/Cmd + P**: Print prescription
- **Ctrl/Cmd + S**: Save prescription
- **Escape**: Close modals

### Touch Gestures (Tablet)

- **Tap**: Select/Open
- **Long press**: Context menu (coming soon)
- **Swipe left**: Back (in some sections)
- **Pinch**: Zoom (on images/reports)

---

## 📞 Support & Help

### Getting Help

1. **Check this manual** - Most answers here
2. **Settings → System Info** - See technical details
3. **Create backup** - Before reporting issues
4. **Contact support**:
   - Email: dr.vivek@vardhanhospital.co.in
   - Phone: +91 542 2367890

### Common Questions

**Q: Is my data secure?**
A: Yes, data is encrypted locally and synced via HTTPS.

**Q: Can I use on multiple devices?**
A: Yes, sync keeps all devices updated.

**Q: What if I lose internet during consultation?**
A: No problem! Everything works offline.

**Q: How do I update the app?**
A: Updates are automatic. You'll see a prompt.

**Q: Can I customize prescriptions?**
A: Yes, all fields are customizable.

### Video Tutorials

_(QR codes to be added)_
- 📹 Quick Start (5 min)
- 📹 Writing Prescriptions (10 min)
- 📹 Patient Management (8 min)
- 📹 Offline Mode (5 min)

---

## 📚 Glossary

- **UHID**: Unique Hospital Identification Number
- **PWA**: Progressive Web App (installable web app)
- **Sync**: Synchronization between local and cloud
- **IndexedDB**: Local database in browser
- **Doc On**: Cloud EMR service for hospitals
- **Vitals**: Basic health measurements (BP, pulse, etc.)
- **OD/BD/TDS**: Medication frequency (Once/Twice/Thrice daily)

---

## 📝 Appendix

### Common Drug Abbreviations

- **Tab**: Tablet
- **Cap**: Capsule
- **Inj**: Injection
- **Syr**: Syrup
- **Oint**: Ointment
- **OD**: Once daily
- **BD**: Twice daily (Bis Die)
- **TDS**: Thrice daily (Ter Die Sumendum)
- **QID**: Four times daily
- **SOS**: If needed (Si Opus Sit)
- **HS**: At bedtime (Hora Somni)
- **AC**: Before meals (Ante Cibum)
- **PC**: After meals (Post Cibum)

### Vital Signs Reference

| Vital | Normal Range | Units |
|-------|--------------|-------|
| BP Systolic | 90-120 | mmHg |
| BP Diastolic | 60-80 | mmHg |
| Heart Rate | 60-100 | bpm |
| Temperature | 97-99 | °F |
| SpO2 | 95-100 | % |
| Blood Sugar (Fasting) | 70-100 | mg/dL |
| Blood Sugar (Random) | 70-140 | mg/dL |

---

**End of Manual**

**Version**: 1.0.0
**Last Updated**: November 2025

For latest updates, visit: [Vardhan Hospital EMR Documentation]

---

**© 2025 Vardhan Hospital. All rights reserved.**
