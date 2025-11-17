# Vardhan Hospital EMR - Offline System

A complete, production-ready Electronic Medical Records (EMR) system designed for Vardhan Hospital, Varanasi. This system works 100% offline and syncs with Doc On/Doctors App when online.

## 🌟 Features

### Core Features
- **100% Offline Capability** - Works without internet connection
- **Patient Management** - Search, add, view, and edit patient records
- **Prescription Writer** - Complete prescription writing with drug database
- **Vitals Recording** - Record and track patient vitals
- **Appointment Scheduling** - Manage daily appointments
- **Reports & Analytics** - View practice statistics and reports
- **Data Migration** - Import 27,000+ patients from Doc On
- **Auto Sync** - Automatic bidirectional sync with Doc On when online

### Technical Features
- **Progressive Web App (PWA)** - Installable on tablets and desktops
- **IndexedDB Storage** - Fast, reliable offline storage
- **Service Worker** - Offline-first architecture
- **Responsive Design** - Optimized for tablets
- **Conflict Resolution** - Smart sync with conflict handling
- **Backup & Restore** - Built-in data backup system

## 📋 System Requirements

- **Tablet**: Android 8.0+ or iOS 12+ (recommended: 10" screen)
- **Browser**: Chrome 90+, Safari 14+, or Edge 90+
- **Storage**: Minimum 500MB free space
- **Internet**: Required only for initial setup and syncing

## 🚀 Installation on Doctor's Tablet

### Method 1: Install as PWA (Recommended)

1. **Build the Application**
   ```bash
   npm install
   npm run build
   ```

2. **Host on Local Network or Cloud**
   - Option A: Use Netlify, Vercel, or similar hosting
   - Option B: Host on hospital server
   - Option C: Use `npm run serve` for local testing

3. **Install on Tablet**
   - Open the hosted URL in Chrome/Safari
   - Click the "Install" button in browser
   - Or tap menu → "Add to Home Screen"
   - App will install and work offline

### Method 2: Android APK (Advanced)

Use tools like Capacitor or TWA (Trusted Web Activity) to package as APK:

```bash
npm install @capacitor/cli @capacitor/core @capacitor/android
npx cap init
npx cap add android
npx cap copy
npx cap open android
```

Then build the APK in Android Studio.

## ⚙️ Initial Setup

### 1. Configure Hospital Information

1. Open the app and go to **Settings**
2. Fill in hospital details:
   - Hospital Name: Vardhan Hospital
   - Address: A-125/D, Lalpur Housing Scheme, Varanasi - 221003
   - Phone: +91 542 2367890
   - Email: info@vardhanhospital.co.in

### 2. Configure Doc On Integration

1. In **Settings**, scroll to "Doc On Integration"
2. Enter your Doc On API credentials:
   - API URL: `https://api.doctorsapp.in/v1` (or your actual Doc On API URL)
   - API Key: Your Doc On API key
3. Enable automatic sync
4. Set sync interval (recommended: 5 minutes)

### 3. Import Patient Data

1. Go to **Data Migration** page
2. Click "Start Import from Doc On"
3. Wait for import to complete (may take 10-30 minutes for 27,000 patients)
4. Verify patients in **Patient Database**

### 4. Create Backup

1. Go to **Settings**
2. Click "Download Backup"
3. Save the backup file to cloud storage or external drive

## 📱 Daily Usage

### Morning Routine
1. Open app (works offline)
2. Check today's appointments
3. Review pending sync items

### Patient Consultation
1. Search patient by name/UHID/phone
2. View patient history and previous prescriptions
3. Record vitals if needed
4. Write new prescription
5. Save (automatically queued for sync)

### End of Day
1. Ensure internet connection
2. Click "Sync Now" to upload all data
3. Review daily statistics
4. Create backup (weekly recommended)

## 🔄 Sync Mechanism

### How Sync Works

1. **Offline Mode**
   - All actions saved locally in IndexedDB
   - Changes queued for sync
   - App fully functional

2. **When Online**
   - Automatic sync every 5 minutes (configurable)
   - Manual sync via "Sync Now" button
   - Uploads: New prescriptions, vitals, patient updates
   - Downloads: New appointments, lab reports, patient updates

3. **Conflict Resolution**
   - Uses "most recent update wins" strategy
   - Cloud version preferred if updated more recently
   - Local changes never lost - will be uploaded

### Sync Status Indicators

- 🟢 **Online** - Connected and syncing
- 🟡 **Offline** - Working offline, data queued
- 🔄 **Syncing** - Sync in progress
- ✅ **Synced** - All data up to date

## 🎓 Training Guide

### For Doctor

#### Finding Patients (2 minutes)
1. Click "Patients" in sidebar
2. Type patient name, UHID, or phone
3. Click on patient to view details

#### Writing Prescriptions (5 minutes)
1. Open patient details
2. Click "Write New Prescription"
3. Fill in diagnosis and complaints
4. Add medications:
   - Click "Search Drug Database" for suggestions
   - Or click "Add Manually"
5. Add investigations and advice
6. Set follow-up date
7. Click "Save Prescription"

#### Recording Vitals (2 minutes)
1. Open patient details
2. Click "Record Vitals"
3. Enter BP, pulse, temperature, etc.
4. Click "Save Vitals"

#### Viewing History (1 minute)
1. Open patient details
2. Scroll down to "Previous Consultations"
3. Click on any prescription to view details

### For Staff

#### Adding New Patients
1. Go to Patients page
2. Click "Add New Patient"
3. Fill required fields (Name, Age, Phone)
4. Click "Add Patient"

#### Managing Appointments
1. Click "Appointments" in sidebar
2. View today's schedule
3. Click "New Appointment" to add

#### Data Backup
1. Weekly: Download backup from Settings
2. Store in Google Drive or OneDrive
3. Keep at least 3 recent backups

## 🔧 Troubleshooting

### App Not Loading
- Clear browser cache
- Check internet for initial load
- Reinstall PWA

### Sync Not Working
- Check API credentials in Settings
- Verify internet connection
- Check Doc On API status

### Data Not Saving
- Check available storage space
- Try clearing old backups
- Restart app

### Slow Performance
- Close other apps/tabs
- Clear browser data
- Check available RAM

## 📊 Data Storage

### Local Storage (IndexedDB)
- Patients: Up to 50,000 records
- Prescriptions: Up to 100,000 records
- Vitals: Up to 50,000 records
- Drug Database: 1,000+ medications

### Storage Requirements
- Empty: ~10MB
- 1,000 patients: ~50MB
- 27,000 patients: ~500MB
- 1 year data: ~1GB

## 🔐 Security

- Data stored locally in encrypted IndexedDB
- API keys encrypted in settings
- HTTPS required for PWA installation
- Regular backups recommended
- No data sent to third parties

## 🆘 Support

For technical support or issues:

1. **Check Logs**: Settings → System Information
2. **Create Backup**: Before reporting issues
3. **Contact**: dr.vivek@vardhanhospital.co.in

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Complete offline EMR system
- Doc On integration
- Patient management
- Prescription writer
- Vitals recorder
- Appointment scheduling
- Reports dashboard
- Data migration tools

## 🔄 Updates

To update the app:
1. New version will auto-download
2. Prompt will appear: "New version available"
3. Click "Update" to reload
4. Data is preserved during update

## 📜 License

Copyright © 2025 Vardhan Hospital. All rights reserved.

This software is licensed for use exclusively by Vardhan Hospital and its authorized personnel.

---

**Built with ❤️ for Vardhan Hospital, Varanasi**

**Version**: 1.0.0
**Last Updated**: November 2025
**Developer**: Specialized EMR Solutions
