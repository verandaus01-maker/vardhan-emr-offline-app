# MediVoyager Pro - Complete Deployment Guide
## by NexaVoyagers Technologies

---

## 🎯 Overview

**MediVoyager Pro** is an intelligent offline-first EMR system designed for Vardhan Hospital, Varanasi. This guide covers deployment on all platforms: tablets, phones, desktop computers, and hospital servers.

### Product Information
- **Product Name:** MediVoyager Pro™
- **Developer:** NexaVoyagers Technologies Pvt. Ltd.
- **License Holder:** Vardhan Hospital, Varanasi, Uttar Pradesh, India
- **Version:** 1.0.0
- **License Type:** Single-Site Commercial License
- **Support:** support@nexavoyagers.com

---

## 📱 Platform Support

| Platform | Installation Method | Offline Capability | Recommended For |
|----------|-------------------|-------------------|-----------------|
| **Android Tablets** | PWA (Chrome) | ✅ Full | Doctors' rounds, consultations |
| **iPads** | PWA (Safari) | ✅ Full | Doctors' rounds, consultations |
| **Android Phones** | PWA (Chrome) | ✅ Full | Emergency access, mobile staff |
| **iPhones** | PWA (Safari) | ✅ Full | Emergency access, mobile staff |
| **Windows Desktop** | Chrome/Edge PWA | ✅ Full | Reception, admin, lab |
| **macOS Desktop** | Chrome/Safari PWA | ✅ Full | Reception, admin, lab |
| **Hospital Server** | Static Server/Docker | ✅ Full | Central deployment |

---

## 🚀 Quick Start Deployment

### Method 1: Cloud Hosting (Easiest - Recommended)

#### Deploy to Vercel (Free, Fastest)

1. **Prerequisites:**
   - GitHub account
   - Vercel account (free at vercel.com)

2. **Steps:**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Deploy MediVoyager Pro"
   git push origin main

   # Go to vercel.com
   # Click "Import Project"
   # Select your GitHub repository
   # Click "Deploy"
   ```

3. **Configuration:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Get Your URL:**
   - Your app will be live at: `https://your-project.vercel.app`
   - Add custom domain: `emr.vardhanhospital.co.in` (optional)

**URL for Installation:** `https://your-project.vercel.app`

---

#### Deploy to Netlify (Alternative)

1. **Steps:**
   ```bash
   npm install -g netlify-cli
   npm run build
   netlify deploy --prod
   ```

2. **Configuration:**
   - Publish directory: `dist`
   - Build command: `npm run build`

---

### Method 2: Hospital Local Server (Best for Offline)

Perfect for hospitals without reliable internet or strict data privacy requirements.

#### Option A: Using Static HTTP Server (Simplest)

1. **On Windows Server:**
   ```cmd
   # Install Node.js from nodejs.org (LTS version)

   # Navigate to project folder
   cd C:\MediVoyagerPro

   # Install dependencies and build
   npm install
   npm run build

   # Install serve globally
   npm install -g serve

   # Start server
   serve -s dist -l 80
   ```

2. **Access from devices:**
   - Find server IP: `ipconfig` (e.g., 192.168.1.100)
   - Access from any device: `http://192.168.1.100`
   - Bookmark on all devices

3. **Make it run on startup:**
   - Create `start-emr.bat`:
     ```batch
     @echo off
     cd C:\MediVoyagerPro
     serve -s dist -l 80
     ```
   - Press `Win+R`, type `shell:startup`, press Enter
   - Create shortcut to `start-emr.bat` in startup folder

#### Option B: Using Apache/NGINX (Professional)

**For Apache (Windows/Linux):**

1. Install XAMPP or Apache
2. Copy `dist` folder to: `C:\xampp\htdocs\emr\`
3. Create `.htaccess` in dist folder:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /emr/
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /emr/index.html [L]
   </IfModule>
   ```
4. Access at: `http://localhost/emr/`

**For NGINX:**

```nginx
server {
    listen 80;
    server_name emr.vardhanhospital.local;
    root /var/www/emr/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Option C: Docker Deployment (Advanced)

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create nginx.conf:**
   ```nginx
   server {
       listen 80;
       location / {
           root /usr/share/nginx/html;
           index index.html;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Build and run:**
   ```bash
   docker build -t medivoyager-pro .
   docker run -d -p 80:80 --name emr medivoyager-pro
   ```

---

## 📲 Installing on Devices

### Android Tablets/Phones (Recommended: Samsung, Lenovo)

1. **Open Chrome browser**
2. **Navigate to your EMR URL** (e.g., `http://192.168.1.100` or `https://emr.vardhanhospital.co.in`)
3. **Tap the 3-dot menu** → "Install app" or "Add to Home Screen"
4. **Grant permissions** when prompted
5. **App icon appears** on home screen

**Settings for Best Performance:**
- Go to Chrome → Settings → Site Settings → Find your EMR site
- Enable: Location, Camera (for future features), Storage
- Disable: Data Saver

**Offline Mode:**
- Once installed, works 100% offline
- All data stored locally in IndexedDB
- Syncs automatically when online

---

### iPads/iPhones

1. **Open Safari browser** (must use Safari, not Chrome)
2. **Navigate to your EMR URL**
3. **Tap Share button** (box with arrow)
4. **Tap "Add to Home Screen"**
5. **Name it:** "MediVoyager Pro"
6. **Tap "Add"**

**Note:** Safari has strict PWA limitations. For full offline experience, use Chrome on Android instead.

---

### Windows Desktop Computers

#### Method 1: Chrome PWA Installation (Recommended)

1. **Open Google Chrome**
2. **Navigate to EMR URL**
3. **Click install icon** in address bar (computer icon with down arrow)
4. **Click "Install"**
5. **App opens in standalone window**
6. **Pinned to taskbar automatically**

To manually pin:
- Right-click app icon in taskbar → Pin to taskbar

#### Method 2: Edge PWA Installation

1. **Open Microsoft Edge**
2. **Navigate to EMR URL**
3. **Click 3-dot menu** → Apps → Install this site as an app
4. **Name it:** "MediVoyager Pro"
5. **Click "Install"**

#### Method 3: Desktop Shortcut (Any Browser)

1. **Open browser**
2. **Navigate to EMR URL**
3. **Drag URL to desktop** to create shortcut
4. **Rename to:** "MediVoyager Pro"

---

### macOS Desktop/Laptops

#### Safari (Best for macOS):

1. **Open Safari**
2. **Navigate to EMR URL**
3. **File menu** → "Add to Dock"
4. **Icon appears in Dock**

#### Chrome (Alternative):

Same steps as Windows Chrome PWA installation above.

---

## 🔐 Security & Access Control

### Default Login Credentials

**First-time login:**
- **Username:** `admin`
- **Password:** `vardhan@2025`

⚠️ **CRITICAL:** Change this password immediately after first login!

### User Roles & Permissions

| Role | Permissions |
|------|------------|
| **Administrator** | Full access, user management, settings, all features |
| **Doctor** | Patient records, prescriptions, vitals, lab reports, appointments |
| **Nurse** | View patients, record vitals, view prescriptions |
| **Receptionist** | Add patients, manage appointments, billing |
| **Lab Technician** | Lab reports, view patients |
| **Staff** | Limited view-only access |

### Creating New Users

1. **Login as admin**
2. **Go to User Management** (Shield icon in sidebar)
3. **Click "Add User"**
4. **Fill in details:**
   - Full Name
   - Username (unique)
   - Password (minimum 6 characters)
   - Email
   - Phone
   - Role (select from dropdown)
5. **Click "Create User"**

### Recommended User Setup for Vardhan Hospital

```
1. Dr. Vivek Raj Singh (admin, doctor)
2. Reception Desk 1 (receptionist)
3. Reception Desk 2 (receptionist)
4. Nurse Station (nurse)
5. Lab Department (lab_technician)
6. Billing Counter (receptionist)
```

---

## 💾 Data Management

### Automatic Syncing (Doc On / Gravity HMS)

**Doc On Integration:**
1. Go to **Settings** → **Doc On Integration**
2. Enter API URL and API Key
3. Enable auto-sync
4. Set sync interval (5 minutes recommended)

**Gravity HMS Integration:**
1. Go to **Settings** → **Gravity HMS Integration**
2. Enter Gravity API URL and API Key
3. Enable auto-sync
4. Set sync interval (2 minutes recommended)

### Manual Data Import (If API Unavailable)

If APIs don't work, you can import data manually:

#### CSV Import

1. **Go to Data Migration page**
2. **Click "Import from CSV"**
3. **Select patient CSV file**
4. **Map columns** (Name, UHID, Phone, etc.)
5. **Click "Import"**

**CSV Format Example:**
```csv
uhid,name,age,gender,phone,email,address
VH001,Ram Kumar,45,Male,9876543210,ram@email.com,Varanasi
VH002,Sita Devi,38,Female,9876543211,sita@email.com,Varanasi
```

#### Database Backup/Restore

**Create Backup:**
1. **Settings** → **Backup & Restore**
2. **Click "Download Backup"**
3. **Save JSON file** to safe location

**Restore from Backup:**
1. **Settings** → **Backup & Restore**
2. **Click "Restore from Backup"**
3. **Select backup JSON file**
4. **Confirm** (⚠️ This will replace all data!)

**Automated Daily Backups (Recommended):**
- Set up scheduled task to download backup daily
- Store backups in: `D:\EMR_Backups\backup-YYYY-MM-DD.json`
- Keep last 30 days

---

## 📊 System Requirements

### Minimum Requirements

**For Tablets/Phones:**
- Android 8.0+ / iOS 13+
- 2GB RAM
- 500MB free storage
- Chrome 90+ / Safari 13+

**For Desktop:**
- Windows 10/11, macOS 10.15+, or Linux
- 4GB RAM
- 1GB free storage
- Chrome 90+ / Edge 90+ / Safari 13+

**For Server:**
- Windows Server 2016+ / Ubuntu 20.04+ / CentOS 8+
- 8GB RAM
- 10GB storage (for backups)
- Node.js 18+ or Apache/NGINX

### Recommended Specifications

**Tablets (Doctors):**
- 10-inch screen minimum
- 4GB RAM
- Samsung Galaxy Tab S8 / iPad Air recommended

**Desktop (Reception/Admin):**
- 15-inch monitor minimum
- 8GB RAM
- Dual monitors recommended for multitasking

---

## 🌐 Network Configuration

### Local Network Setup

**For Hospital LAN:**

1. **Assign static IP to server:**
   - Windows: Control Panel → Network → Change Adapter Settings → IPv4 Properties
   - Set IP: `192.168.1.100` (example)
   - Subnet: `255.255.255.0`
   - Gateway: `192.168.1.1`

2. **Configure firewall:**
   - Allow incoming connections on port 80 (HTTP)
   - Allow incoming connections on port 443 (HTTPS) if using SSL

3. **Test connectivity:**
   ```cmd
   # From any device on network
   ping 192.168.1.100
   ```

### Using Custom Domain (Optional)

**Local DNS (for hospital.local):**

1. **Edit hosts file on each device:**

   **Windows:** `C:\Windows\System32\drivers\etc\hosts`
   **Mac/Linux:** `/etc/hosts`

   Add line:
   ```
   192.168.1.100   emr.vardhan.local
   ```

2. **Access via:** `http://emr.vardhan.local`

---

## 🔒 License & Security

### License Information

**MediVoyager Pro™**
- **License Type:** Single-Site Commercial License
- **Licensed To:** Vardhan Hospital, Varanasi, UP, India
- **License Key:** VH-2025-VARDHAN-NEXAVOYAGERS
- **Valid Until:** Perpetual (one-time purchase)
- **Installations Allowed:** Unlimited within Vardhan Hospital premises
- **Transferable:** No
- **Support Period:** 1 year from purchase (renewable)

### Terms of Use

✅ **Permitted:**
- Install on unlimited devices within Vardhan Hospital
- Customize hospital info, logo, templates
- Create unlimited user accounts for hospital staff
- Backup and restore data
- Integrate with Doc On and Gravity HMS

❌ **Prohibited:**
- Distribute to other hospitals/clinics
- Resell or sublicense
- Remove branding/copyright notices
- Reverse engineer source code
- Host publicly for non-hospital users

### Data Security

**Local Storage Security:**
- All data encrypted in browser IndexedDB
- No data sent to external servers (except Doc On/Gravity sync)
- HIPAA-compliant data handling
- Auto-logout after 30 minutes inactivity (configurable)

**HTTPS Setup (Recommended for Production):**

1. **Get SSL certificate:**
   - Free: Let's Encrypt
   - Paid: GoDaddy, Namecheap

2. **Configure server with HTTPS:**
   ```bash
   # NGINX example
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       ...
   }
   ```

---

## 🛠️ Troubleshooting

### Common Issues

**1. "Cannot access EMR from other devices"**
- **Solution:** Check firewall, ensure server IP is correct, ping server

**2. "App not installing on tablet"**
- **Solution:** Clear browser cache, try Chrome instead of Safari (Android)

**3. "Data not syncing with Doc On"**
- **Solution:** Check API credentials in Settings, verify internet connection

**4. "Login not working"**
- **Solution:** Clear browser data, try default credentials (admin / vardhan@2025)

**5. "Offline mode not working"**
- **Solution:** Ensure service worker is registered, check browser console for errors

### Reset Database (Emergency)

⚠️ **WARNING:** This will delete ALL data!

1. Open browser console (F12)
2. Run:
   ```javascript
   indexedDB.deleteDatabase('VardhanEMRDatabase');
   location.reload();
   ```

---

## 📞 Support & Updates

### Technical Support

**NexaVoyagers Technologies Pvt. Ltd.**
- **Email:** support@nexavoyagers.com
- **Phone:** +91 (to be provided)
- **Support Hours:** Mon-Fri, 9 AM - 6 PM IST
- **Response Time:** 24 hours

**Support Portal:** https://support.nexavoyagers.com

### Getting Updates

Updates are automatically deployed when you refresh the app (if using cloud hosting).

For self-hosted deployments:

1. **Check for updates:**
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

2. **Clear app cache** on all devices

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Admin can login with default credentials
- [ ] Changed default admin password
- [ ] Created user accounts for all staff
- [ ] Tested patient search and add
- [ ] Tested prescription writer
- [ ] Tested vitals recording
- [ ] Tested lab report analysis
- [ ] Tested appointment booking
- [ ] Configured Doc On API (if available)
- [ ] Configured Gravity HMS API (if available)
- [ ] Tested offline mode (disconnect internet)
- [ ] Installed PWA on at least one tablet
- [ ] Tested backup creation
- [ ] Tested backup restore
- [ ] Configured daily backup schedule
- [ ] All devices can access via local network
- [ ] Bookmarked/installed on all devices

---

## 🎓 Training

**Recommended Training Sessions:**

1. **Admin Users (2 hours):**
   - User management
   - Settings configuration
   - Data migration
   - Backup/restore
   - Troubleshooting

2. **Doctors (1 hour):**
   - Patient search
   - Prescription writing
   - Lab report analysis
   - Quick consultations

3. **Receptionists (1 hour):**
   - Patient registration
   - Appointment booking
   - Basic navigation

4. **Nurses/Lab Technicians (30 minutes):**
   - Vitals recording
   - Lab report entry
   - Patient lookup

---

## 📄 License Agreement

**Copyright © 2025 NexaVoyagers Technologies Pvt. Ltd.**

**All Rights Reserved.**

MediVoyager Pro™ is a proprietary software product developed exclusively for Vardhan Hospital, Varanasi. Unauthorized copying, distribution, or modification is strictly prohibited and may result in legal action.

**Patent Pending:** Indian Patent Application No. _________ (to be filed)

---

**For detailed technical documentation, visit:** https://docs.nexavoyagers.com/medivoyager-pro

**End of Deployment Guide**
