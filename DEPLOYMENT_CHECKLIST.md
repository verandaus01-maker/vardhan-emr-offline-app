# ✅ NexaCare Pro - Deployment Checklist
## Vardhan Hospital Go-Live - Tomorrow

**Product:** NexaCare Pro v1.0
**Client:** Vardhan Hospital, Varanasi
**Deployment Date:** Tomorrow
**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.

---

## 🚨 CRITICAL: Read This First

This checklist ensures **zero errors** during deployment.
Complete **every item** in order.
Don't skip any step.

---

## ⏰ Timeline: 8:00 AM - 12:00 PM

```
8:00 AM ────► Server Setup (1 hour)
9:00 AM ────► Data Import & Verification (1 hour)
10:00 AM ───► Device Installation (1 hour)
11:00 AM ───► Staff Training & Testing (1 hour)
12:00 PM ───► GO LIVE! 🚀
```

---

## 📦 Pre-Deployment (Day Before - TODAY)

### Materials Checklist:
- [ ] **USB Drive** with application files (`dist` folder)
- [ ] **Backup USB Drive** (duplicate of above)
- [ ] **Printed guides:**
  - [ ] PRODUCTION_DEPLOYMENT_GUIDE.md (printed)
  - [ ] TRAINING_GUIDE.md (printed)
  - [ ] SECURITY_GUIDE.md (printed)
  - [ ] MOBILE_PWA_GUIDE.md (printed)
  - [ ] This checklist (printed)
- [ ] **User credentials list** (handwritten, in sealed envelope)
- [ ] **Server details sheet:**
  - [ ] IP address documented
  - [ ] WiFi password documented
  - [ ] Admin password documented
- [ ] **Emergency contact numbers:**
  - [ ] NexaVoyagers support
  - [ ] IT support
  - [ ] Network admin

### Equipment Checklist:
- [ ] **Server computer** (dedicated, minimum 8GB RAM)
  - [ ] Windows/Linux installed
  - [ ] Latest updates installed
  - [ ] Antivirus installed
  - [ ] Firewall enabled
- [ ] **Network equipment:**
  - [ ] Router with static IP capability
  - [ ] Network cables
  - [ ] UPS (uninterruptible power supply)
- [ ] **Devices for installation:**
  - [ ] Doctor's tablets (2-3)
  - [ ] Reception PC
  - [ ] Nurse station PC/tablet
  - [ ] Lab PC/tablet
- [ ] **Accessories:**
  - [ ] Chargers for all tablets
  - [ ] Mouse and keyboard for server
  - [ ] External monitor (if needed)
  - [ ] Printer (for prescriptions)

### People Checklist:
- [ ] **Key personnel confirmed attendance:**
  - [ ] Hospital IT administrator
  - [ ] Dr. Vivek Raj Singh (or main doctor)
  - [ ] Head Nurse
  - [ ] Reception Manager
  - [ ] Lab Head
- [ ] **NexaVoyagers support** on standby
- [ ] **Backup technician** available

---

## 🔧 Phase 1: Server Setup (8:00 AM - 9:00 AM)

### Step 1.1: Physical Setup (15 minutes)
- [ ] Server placed in secure, locked room
- [ ] Connected to UPS
- [ ] Network cable connected to router
- [ ] Monitor, keyboard, mouse connected
- [ ] Server powered on
- [ ] Temperature checked (room should be cool)

### Step 1.2: Network Configuration (15 minutes)
- [ ] Router configured for static IP
  - [ ] Server IP: `192.168.10.50` (or as planned)
  - [ ] Subnet: `255.255.255.0`
  - [ ] Gateway: `192.168.10.1`
- [ ] Server network settings configured
  - [ ] Open: Control Panel → Network Settings
  - [ ] Set static IP as above
  - [ ] Set DNS: `8.8.8.8`, `8.8.4.4`
  - [ ] Save and apply
- [ ] **Test network:**
  ```bash
  ping google.com
  # Should see replies
  ```
- [ ] Document IP address: ________________

### Step 1.3: Install Node.js (10 minutes)
**If not already installed:**

- [ ] Download Node.js LTS from USB or https://nodejs.org
- [ ] Run installer
- [ ] Select "Automatically install necessary tools"
- [ ] Complete installation
- [ ] Restart computer if prompted
- [ ] **Verify installation:**
  ```bash
  node --version
  # Should show: v20.x.x or similar
  npm --version
  # Should show: 10.x.x or similar
  ```

### Step 1.4: Copy Application Files (5 minutes)
- [ ] Create folder: `C:\NexaCare` (Windows) or `/var/www/nexacare` (Linux)
- [ ] Copy `dist` folder from USB to created folder
- [ ] Verify all files copied successfully
- [ ] Count files in dist folder: Should have ~13 files

### Step 1.5: Install & Start Server (10 minutes)
**Open Command Prompt (Windows) or Terminal (Linux):**

- [ ] Navigate to application folder:
  ```bash
  cd C:\NexaCare\dist
  # or
  cd /var/www/nexacare/dist
  ```

- [ ] Install `serve` package globally:
  ```bash
  npm install -g serve
  ```

- [ ] Start the server:
  ```bash
  serve -s . -l 3000 --no-clipboard
  ```

- [ ] **Verify server is running:**
  - Should see: "Serving on port 3000"
  - Leave this window open!

### Step 1.6: Test Server Access (5 minutes)
- [ ] On server computer, open browser
- [ ] Go to: `http://localhost:3000`
- [ ] Should see NexaCare Pro login page
- [ ] **Test from another device:**
  - [ ] Connect device to hospital WiFi
  - [ ] Open browser
  - [ ] Go to: `http://[SERVER-IP]:3000`
  - [ ] Should see login page
  - [ ] If not, check firewall settings

### Checkpoint 1:
```
✓ Server running
✓ Accessible on network
✓ IP address documented
✓ Server window kept open
```

**If any issues, STOP and troubleshoot before proceeding.**

---

## 📊 Phase 2: Data Import & Verification (9:00 AM - 10:00 AM)

### Step 2.1: First Login (5 minutes)
- [ ] On server computer, access `http://localhost:3000`
- [ ] Login with default credentials:
  - Username: `admin`
  - Password: `vardhan@2025`
- [ ] **IMMEDIATELY change password:**
  - [ ] Click user icon (top right)
  - [ ] Go to User Management
  - [ ] Change admin password
  - [ ] New password: _________________ (document securely!)

### Step 2.2: Configure Hospital Settings (10 minutes)
- [ ] Click "Settings" in sidebar
- [ ] Fill in hospital information:
  - [ ] Hospital Name: `Vardhan Hospital`
  - [ ] Address: `A-125/D, Lalpur Housing Scheme, Phase-1 Bada Lalpur, Varanasi - 221003`
  - [ ] Phone: `+91 542 2367890`
  - [ ] Email: `info@vardhanhospital.co.in`
- [ ] Verify license information:
  - [ ] License shows: "Valid"
  - [ ] Licensed to: "Vardhan Hospital"
  - [ ] Max users: 5
  - [ ] Expiry date: Check
- [ ] Click "Save Settings"

### Step 2.3: Import Existing Patient Data (30 minutes)
**If you have data from Doc On or other system:**

- [ ] Click "Doc On Importer" in sidebar
- [ ] Prepare CSV files:
  - [ ] `patients.csv`
  - [ ] `visits.csv` (if available)
  - [ ] `vitals.csv` (if available)
  - [ ] `lab_results.csv` (if available)
- [ ] Upload each file:
  - [ ] Select file
  - [ ] Click "Import"
  - [ ] Wait for completion
  - [ ] Verify count shown
- [ ] **Verify import:**
  - [ ] Go to Dashboard
  - [ ] Check patient count: _______ patients
  - [ ] Go to Patients
  - [ ] Search for a few patients by name
  - [ ] Click to open their records
  - [ ] Verify data looks correct

**If importing fails:**
- Check CSV format
- Check file encoding (should be UTF-8)
- Try importing smaller batches
- Check console for errors (F12)

### Step 2.4: Create First Backup (5 minutes)
- [ ] Click "Backup & Restore" in sidebar
- [ ] Click "Download Backup File"
- [ ] Save file to USB drive
- [ ] Filename: `NexaCare_Backup_[date].json`
- [ ] **Copy to second USB drive** (redundancy!)
- [ ] Store both USB drives in different locations

### Step 2.5: Create User Accounts (10 minutes)
- [ ] Click "User Management" in sidebar
- [ ] Create users for each staff member:

**User 1: Main Doctor**
- [ ] Username: `dr.vivek` (or as per doctor's name)
- [ ] Name: `Dr. Vivek Raj Singh`
- [ ] Email: `dr.vivek@vardhanhospital.co.in`
- [ ] Phone: `+91 9876543210`
- [ ] Role: **Doctor**
- [ ] Password: _________________ (auto-generated, document!)
- [ ] Click "Add User"

**User 2: Second Doctor (if applicable)**
- [ ] Username: `dr.[name]`
- [ ] Fill details
- [ ] Role: **Doctor**
- [ ] Document credentials

**User 3: Nurse**
- [ ] Username: `nurse.[name]`
- [ ] Fill details
- [ ] Role: **Nurse**
- [ ] Document credentials

**User 4: Receptionist**
- [ ] Username: `reception.[name]`
- [ ] Fill details
- [ ] Role: **Receptionist**
- [ ] Document credentials

**User 5: Lab Technician**
- [ ] Username: `lab.[name]`
- [ ] Fill details
- [ ] Role: **Lab Tech**
- [ ] Document credentials

- [ ] **Total users created:** _______ (should be 2-5)
- [ ] **All credentials documented** in sealed envelope

### Checkpoint 2:
```
✓ Admin password changed
✓ Hospital settings configured
✓ Patient data imported (if applicable)
✓ First backup created
✓ All user accounts created
✓ Credentials documented securely
```

**Verify data by searching for 3-5 patients and opening their records.**

---

## 📱 Phase 3: Device Installation (10:00 AM - 11:00 AM)

### Step 3.1: Doctor's Tablets (30 minutes for 2-3 tablets)
**For EACH tablet:**

- [ ] **Tablet preparation:**
  - [ ] Fully charged (>80% battery)
  - [ ] Screen lock PIN set
  - [ ] Auto-lock enabled (2 minutes)
  - [ ] Find My Device enabled

- [ ] **Connect to WiFi:**
  - [ ] Settings → WiFi
  - [ ] Select hospital WiFi
  - [ ] Enter password
  - [ ] Verify connection

- [ ] **Install PWA:**
  - [ ] **Android:** Use Chrome
    - [ ] Open Chrome
    - [ ] Go to `http://[SERVER-IP]:3000`
    - [ ] Three dots → "Add to Home screen"
    - [ ] Name: "NexaCare Pro"
    - [ ] Tap "Add"
    - [ ] Icon appears on home screen

  - [ ] **iOS:** Use Safari
    - [ ] Open Safari
    - [ ] Go to `http://[SERVER-IP]:3000`
    - [ ] Share button → "Add to Home Screen"
    - [ ] Name: "NexaCare Pro"
    - [ ] Tap "Add"
    - [ ] Icon appears on home screen

- [ ] **Test login:**
  - [ ] Tap app icon
  - [ ] Login with doctor's credentials
  - [ ] Verify dashboard loads
  - [ ] Search for a patient
  - [ ] Open patient record
  - [ ] Verify data loads

- [ ] **Test offline mode:**
  - [ ] Enable Airplane mode
  - [ ] Navigate to Patients
  - [ ] Search for patient
  - [ ] Open patient record
  - [ ] Should work! ✅
  - [ ] Disable Airplane mode

- [ ] **Label device:**
  - [ ] Stick label: "Dr. [Name] - NexaCare Pro"

**Repeat for each doctor's tablet.**

### Step 3.2: Desktop PCs (15 minutes per PC)
**For Reception, Nurse Station, Lab:**

- [ ] **Open browser (Chrome recommended)**
- [ ] **Bookmark NexaCare Pro:**
  - [ ] Go to `http://[SERVER-IP]:3000`
  - [ ] Ctrl+D (bookmark)
  - [ ] Name: "NexaCare Pro"
  - [ ] Save to Bookmarks Bar

- [ ] **Create desktop shortcut:**
  - [ ] Right-click on desktop
  - [ ] New → Shortcut
  - [ ] Location: `chrome.exe --app=http://[SERVER-IP]:3000`
  - [ ] Name: "NexaCare Pro"
  - [ ] Finish

- [ ] **Test login:**
  - [ ] Click shortcut
  - [ ] Login with respective user credentials
  - [ ] Verify access based on role
  - [ ] Test key features for that role

### Step 3.3: Printer Setup (15 minutes)
- [ ] **Connect printer to network**
- [ ] **Add printer to each device:**
  - [ ] Windows: Settings → Printers → Add Printer
  - [ ] Select network printer
  - [ ] Install drivers if needed
  - [ ] Set as default printer

- [ ] **Test printing:**
  - [ ] Open a patient record
  - [ ] Click "Write Prescription"
  - [ ] Fill sample prescription
  - [ ] Click "Print"
  - [ ] Verify prescription prints correctly
  - [ ] Check formatting, logo, hospital details

### Checkpoint 3:
```
✓ All tablets installed and tested
✓ All desktop PCs configured
✓ Printer working
✓ All devices can access NexaCare Pro
✓ Login tested on each device
✓ Offline mode verified on tablets
```

---

## 👥 Phase 4: Training & Testing (11:00 AM - 12:00 PM)

### Step 4.1: Quick Training Session (30 minutes)
**Gather all staff together:**

- [ ] **Introduction (5 minutes):**
  - [ ] Explain what NexaCare Pro is
  - [ ] Show where to access (app icon/shortcut)
  - [ ] Explain offline capability
  - [ ] Distribute printed quick reference cards

- [ ] **Doctors (10 minutes):**
  - [ ] How to search for patients
  - [ ] How to write prescriptions
  - [ ] How to view lab reports
  - [ ] How to record vitals
  - [ ] Practice writing 1 test prescription

- [ ] **Nurses (5 minutes):**
  - [ ] How to search for patients
  - [ ] How to record vitals
  - [ ] Practice recording vitals for test patient

- [ ] **Reception (5 minutes):**
  - [ ] How to register new patient
  - [ ] How to search existing patients
  - [ ] How to book appointments
  - [ ] Practice registering test patient

- [ ] **Lab Tech (5 minutes):**
  - [ ] How to upload lab reports
  - [ ] How to enter values manually
  - [ ] Practice uploading test report

- [ ] **Q&A (5 minutes):**
  - [ ] Answer questions
  - [ ] Clarify doubts
  - [ ] Show where to get help

### Step 4.2: Hands-On Practice (20 minutes)
**Each staff member practices on their device:**

- [ ] **Doctors practice:**
  - [ ] Search for existing patient
  - [ ] Write prescription for test patient
  - [ ] Print prescription
  - [ ] View lab reports
  - [ ] Record vitals

- [ ] **Nurses practice:**
  - [ ] Search for patient
  - [ ] Record complete vitals
  - [ ] View vital history graph

- [ ] **Reception practices:**
  - [ ] Register new test patient
  - [ ] Search for patient
  - [ ] Book test appointment
  - [ ] View today's appointments

- [ ] **Lab tech practices:**
  - [ ] Upload sample lab report PDF
  - [ ] Enter blood test values manually
  - [ ] View report in patient record

### Step 4.3: End-to-End Test (10 minutes)
**Simulate real patient flow:**

1. [ ] **Reception:**
   - [ ] Registers new patient (use test data)
   - [ ] Books appointment for doctor
   - [ ] Notes UHID

2. [ ] **Nurse:**
   - [ ] Searches for patient using UHID
   - [ ] Records vitals:
     - BP: 120/80
     - Pulse: 72
     - Temp: 98.6°F
     - SpO2: 98%
     - Weight: 65 kg
     - Height: 165 cm

3. [ ] **Doctor:**
   - [ ] Searches for patient
   - [ ] Reviews vitals
   - [ ] Writes prescription:
     - Chief Complaint: "Test patient"
     - Diagnosis: "Routine checkup"
     - Medicine: Paracetamol 500mg, twice daily, 3 days
   - [ ] Saves prescription
   - [ ] Prints prescription
   - [ ] Prescription prints correctly ✅

4. [ ] **Lab Tech:**
   - [ ] Uploads sample report for test patient
   - [ ] Verifies report appears in patient record

5. [ ] **Doctor:**
   - [ ] Checks patient record again
   - [ ] Sees lab report uploaded
   - [ ] Reviews AI analysis

**If all steps work perfectly: You're ready to go live! ✅**

### Checkpoint 4:
```
✓ All staff trained
✓ Practice completed successfully
✓ End-to-end test passed
✓ Everyone knows their tasks
✓ Everyone knows where to get help
```

---

## 🚀 Phase 5: GO LIVE! (12:00 PM)

### Step 5.1: Final Pre-Live Checks (5 minutes)
- [ ] Server still running (check server window)
- [ ] All devices connected to WiFi
- [ ] All users can login
- [ ] Printer working
- [ ] Backup created and stored safely
- [ ] Emergency contacts ready
- [ ] Support team on standby

### Step 5.2: Go Live Announcement (2 minutes)
- [ ] **Announce to staff:**
  - "NexaCare Pro is now LIVE!"
  - "Use this for all patients from now on"
  - "Old system (if any) is now backup only"
  - "Report any issues immediately to IT"

### Step 5.3: First Real Patient (10 minutes)
- [ ] **Process first actual patient:**
  - [ ] Reception registers/searches patient
  - [ ] Nurse records vitals
  - [ ] Doctor writes prescription
  - [ ] Prescription printed successfully
  - [ ] **First patient completed! 🎉**

### Step 5.4: Monitoring (Ongoing)
**For next 2-4 hours, closely monitor:**
- [ ] Any error messages
- [ ] Any slowness
- [ ] Any confusion from staff
- [ ] Any device issues
- [ ] Provide immediate support

---

## 📊 Post-Go-Live (First Day)

### Afternoon Checks (2:00 PM):
- [ ] Server still running
- [ ] How many patients processed: _______
- [ ] Any errors encountered: _______
- [ ] Staff feedback collected
- [ ] Issues documented

### End of Day (6:00 PM):
- [ ] **Create backup:**
  - [ ] Backup & Restore → Download Backup
  - [ ] Save to USB drive
  - [ ] Label: "End of Day 1 - [Date]"
  - [ ] Store securely

- [ ] **Review stats:**
  - [ ] Total patients: _______
  - [ ] Total prescriptions: _______
  - [ ] Total vitals recorded: _______
  - [ ] Total appointments: _______

- [ ] **Staff debrief:**
  - [ ] What went well
  - [ ] What needs improvement
  - [ ] Any issues to fix

---

## 🆘 Emergency Procedures

### If Server Crashes:
1. [ ] Don't panic - data is safe in backups
2. [ ] Restart server computer
3. [ ] Rerun serve command: `serve -s C:\NexaCare\dist -l 3000`
4. [ ] Verify access from devices
5. [ ] If still failing, restore from backup
6. [ ] Call NexaVoyagers support

### If Data Lost/Corrupted:
1. [ ] Go to Backup & Restore page
2. [ ] Select most recent automatic backup
3. [ ] Click "Restore"
4. [ ] Or upload manual backup file
5. [ ] Verify data restored
6. [ ] Document what happened

### If Device Not Working:
1. [ ] Clear browser cache (Ctrl+Shift+Delete)
2. [ ] Hard reload (Ctrl+Shift+R)
3. [ ] Restart browser
4. [ ] Restart device
5. [ ] Reinstall PWA if needed
6. [ ] Use alternate device temporarily

### If Network Issue:
1. [ ] Check router is on
2. [ ] Check server is connected
3. [ ] Restart router if needed
4. [ ] Devices can work offline
5. [ ] Will sync when network back

---

## ✅ Success Criteria

**Deployment is successful when:**

1. ✅ Server running and stable
2. ✅ All devices can access application
3. ✅ All staff can login with their credentials
4. ✅ Patient data imported and accessible
5. ✅ First prescription written and printed
6. ✅ First vitals recorded
7. ✅ First appointment booked
8. ✅ Offline mode working on tablets
9. ✅ Backup system working
10. ✅ No critical errors
11. ✅ Staff knows how to use system
12. ✅ Staff knows who to contact for help

**If ALL checked: DEPLOYMENT SUCCESSFUL! 🎉**

---

## 📞 Support Contacts

**During Deployment:**
- **NexaVoyagers Technologies:**
  - Email: contact@nexavoyagers.com
  - Phone: [Emergency number]
  - Available: Day of deployment

**Post-Deployment:**
- **Regular Support:**
  - Email: contact@nexavoyagers.com
  - Hours: Mon-Sat, 9 AM - 6 PM

- **Hospital IT:**
  - Name: _________________
  - Phone: _________________

---

## 📝 Deployment Sign-Off

**Completed by:**
- Name: _________________
- Designation: _________________
- Date: _________________
- Time: _________________

**Verified by:**
- Name: _________________
- Designation: _________________
- Date: _________________
- Time: _________________

**Approved by (Hospital Admin):**
- Name: _________________
- Designation: _________________
- Date: _________________
- Signature: _________________

---

## 📄 Required Documentation

**Keep these documents accessible:**
1. ✅ PRODUCTION_DEPLOYMENT_GUIDE.md
2. ✅ TRAINING_GUIDE.md
3. ✅ SECURITY_GUIDE.md
4. ✅ MOBILE_PWA_GUIDE.md
5. ✅ This checklist
6. ✅ User credentials (sealed envelope)
7. ✅ Server details sheet
8. ✅ Network configuration sheet

**Store in:**
- Physical folder in IT department
- Scanned copies in secure cloud storage
- Backup on USB drive (encrypted)

---

**END OF DEPLOYMENT CHECKLIST**

**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.
**For:** Vardhan Hospital, Varanasi
**Critical Deployment:** Tomorrow
**Version:** 1.0

---

## 🎯 Final Reminder

**Before you start tomorrow:**
1. Get good sleep tonight
2. Arrive 30 minutes early
3. Have coffee ready ☕
4. Double-check all equipment
5. Keep this checklist handy
6. Stay calm and focused
7. **You've got this! 💪**

**Good luck with the deployment! 🚀**
