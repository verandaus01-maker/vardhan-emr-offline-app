# 🔒 NexaCare Pro - Security Hardening Guide
## Production Security Best Practices

**Product:** NexaCare Pro v1.0
**Client:** Vardhan Hospital, Varanasi
**Classification:** CRITICAL - Patient Data Protection
**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.

---

## ⚠️ CRITICAL SECURITY NOTICE

This system handles **sensitive patient data (PHI - Protected Health Information)**.
Security is mandatory, not optional.

**Legal Requirements:**
- HIPAA compliance (if applicable)
- Data Protection Act compliance
- Patient confidentiality laws
- Medical data security standards

---

## 📋 Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Network Security](#network-security)
3. [HTTPS/SSL Setup](#httpsssl-setup)
4. [Access Control](#access-control)
5. [Data Security](#data-security)
6. [Backup Security](#backup-security)
7. [Device Security](#device-security)
8. [Monitoring & Auditing](#monitoring--auditing)
9. [Incident Response](#incident-response)
10. [Compliance Checklist](#compliance-checklist)

---

## ✅ Pre-Deployment Security Checklist

### Before Go-Live (MANDATORY):

- [ ] **Change default admin password** - `admin/vardhan@2025` MUST be changed
- [ ] **Enable HTTPS** - No plain HTTP in production
- [ ] **Configure firewall** - Block external access
- [ ] **Set static IP** - For server
- [ ] **MAC filtering** - On router
- [ ] **Disable USB ports** - On critical devices (if possible)
- [ ] **Install antivirus** - On all devices
- [ ] **Enable Windows/device firewall** - On all machines
- [ ] **Create backup** - Before deployment
- [ ] **Test restore** - Verify backup works
- [ ] **Document passwords** - Store securely (physical safe)
- [ ] **Train staff** - On security policies
- [ ] **Sign agreements** - Confidentiality agreements with staff

---

## 🌐 Network Security

### 1. Network Isolation

**Hospital WiFi Network Setup:**

```
Recommended Network Architecture:

[Internet] → [Router/Firewall]
                |
                ├─ Hospital WiFi (VLAN 10) - For EMR
                ├─ Guest WiFi (VLAN 20) - For visitors
                └─ Admin Network (VLAN 30) - For server
```

**Configuration:**

1. **Create Separate VLAN for EMR:**
   ```
   VLAN ID: 10
   Name: Hospital-EMR
   Subnet: 192.168.10.0/24
   DHCP Range: 192.168.10.100-200
   ```

2. **Server Static IP:**
   ```
   IP: 192.168.10.50
   Subnet: 255.255.255.0
   Gateway: 192.168.10.1
   DNS: 8.8.8.8, 8.8.4.4
   ```

3. **Firewall Rules:**
   ```
   ALLOW: Hospital-EMR → Server:3000 (HTTPS only)
   DENY:  Guest WiFi → Server:3000
   DENY:  Internet → Server:3000
   ALLOW: Server → Internet:443 (for updates only)
   ```

---

### 2. Router Security

**Router Configuration:**

1. **Change default router password:**
   - Default: admin/admin
   - Change to: Strong password (20+ chars)

2. **Disable WPS:**
   - WPS is vulnerable to attacks
   - Turn off in router settings

3. **Enable MAC Address Filtering:**
   ```
   Add only authorized devices:
   - Server MAC: XX:XX:XX:XX:XX:XX
   - Doctor Tablet 1: XX:XX:XX:XX:XX:XX
   - Doctor Tablet 2: XX:XX:XX:XX:XX:XX
   - Nurse Station PC: XX:XX:XX:XX:XX:XX
   - Reception PC: XX:XX:XX:XX:XX:XX
   ```

4. **Hide SSID (optional):**
   - Don't broadcast WiFi name
   - Users must know network name to connect

5. **Strong WiFi Password:**
   - WPA3 if supported, else WPA2
   - Password: 20+ characters, random
   - Example: `VardhanEMR@2025!SecureHospital#Network`

---

### 3. Firewall Rules (Windows Server)

**If using Windows Server:**

```powershell
# Open PowerShell as Administrator

# Allow port 3000 for local network only
New-NetFirewallRule -DisplayName "NexaCare Pro HTTPS" `
  -Direction Inbound `
  -LocalPort 3000 `
  -Protocol TCP `
  -Action Allow `
  -RemoteAddress 192.168.10.0/24

# Block external access
New-NetFirewallRule -DisplayName "Block NexaCare External" `
  -Direction Inbound `
  -LocalPort 3000 `
  -Protocol TCP `
  -Action Block `
  -RemoteAddress 0.0.0.0/0
```

**If using Linux Server:**

```bash
# Using ufw (Ubuntu)
sudo ufw enable
sudo ufw allow from 192.168.10.0/24 to any port 3000
sudo ufw deny 3000
sudo ufw status
```

---

## 🔐 HTTPS/SSL Setup

### Option 1: Self-Signed Certificate (Quick Setup - Local Network Only)

**For development/testing or closed network:**

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Answer prompts:
# Country: IN
# State: Uttar Pradesh
# City: Varanasi
# Organization: Vardhan Hospital
# Common Name: 192.168.10.50 (your server IP)
```

**Configure HTTPS Server:**

```bash
# Install serve with HTTPS support
npm install -g serve

# Start with HTTPS
serve -s dist -l 3000 --ssl-cert cert.pem --ssl-key key.pem
```

**Access:** `https://192.168.10.50:3000`

**Note:** Browsers will show "Not Secure" warning. Click "Advanced" → "Proceed" (safe for local network).

---

### Option 2: Let's Encrypt (Free SSL - Requires Domain)

**If you have a domain name (e.g., emr.vardhanhospital.com):**

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d emr.vardhanhospital.com

# Certificates will be in: /etc/letsencrypt/live/emr.vardhanhospital.com/

# Auto-renew (add to crontab)
0 0 1 * * certbot renew --quiet
```

---

### Option 3: ngrok Tunnel (Quick HTTPS for Testing)

**For quick HTTPS setup without domain:**

```bash
# Install ngrok
npm install -g ngrok

# Start your app on port 3000
serve -s dist -l 3000

# In another terminal, create HTTPS tunnel
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
# Share this URL with devices
```

**⚠️ Warning:** ngrok is for testing only. URL changes on restart. Not for production long-term.

---

### Option 4: Reverse Proxy with Nginx (Recommended for Production)

**Install Nginx:**

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# Install Node.js and serve
sudo npm install -g serve
```

**Configure Nginx:**

Create `/etc/nginx/sites-available/nexacare`:

```nginx
server {
    listen 443 ssl http2;
    server_name 192.168.10.50;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name 192.168.10.50;
    return 301 https://$server_name$request_uri;
}
```

**Enable and restart:**

```bash
sudo ln -s /etc/nginx/sites-available/nexacare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔑 Access Control

### 1. Password Policy

**ENFORCE for all users:**

- **Minimum length:** 8 characters
- **Complexity:**
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@, #, $, etc.)
- **Change frequency:** Every 90 days
- **No reuse:** Last 5 passwords cannot be reused
- **No sharing:** Each user has unique credentials

**Examples of GOOD passwords:**
- `Vardhan@Hospital2025`
- `DrSingh#EMR2025!`
- `NexaCare$Secure123`

**Examples of BAD passwords:**
- `password` (too weak)
- `12345678` (no letters)
- `vardhan` (too simple)

---

### 2. User Management

**Create users with principle of least privilege:**

| Role | Permissions | Create For |
|------|-------------|------------|
| **Admin** | Full access | 1 person only (hospital IT head) |
| **Doctor** | Patient records, prescriptions | Each doctor (2-3 users) |
| **Nurse** | Vitals, read-only access | Nursing staff (1-2 users) |
| **Receptionist** | Registration, appointments | Front desk (1 user) |
| **Lab Tech** | Lab reports only | Lab staff (1 user) |

**Total: 2-5 users (as per license)**

**User Creation Checklist:**
- [ ] Use real name (for audit trail)
- [ ] Valid email (for notifications)
- [ ] Strong password (auto-generated)
- [ ] Correct role (minimum required permissions)
- [ ] Document credentials securely

---

### 3. Session Management

**Current Implementation:**
- Auto-logout after 8 hours of inactivity
- Session stored in browser localStorage
- Cannot login from multiple devices simultaneously (one session per user)

**Best Practices:**
- Always logout when leaving device
- Lock device when stepping away
- Don't save passwords in browser

---

## 💾 Data Security

### 1. Data at Rest

**Browser Storage Security:**

Data is stored in **IndexedDB** (browser database).

**Protection Measures:**

1. **Operating System Level:**
   ```
   Windows: Enable BitLocker drive encryption
   macOS: Enable FileVault
   Linux: Use LUKS encryption
   ```

2. **Browser Data:**
   - IndexedDB is tied to browser profile
   - Clear browser data = data lost (use backups!)
   - Use Incognito/Private mode for testing only

3. **Backup Files:**
   - Encrypt backup JSON files
   - Store in encrypted USB drive or encrypted cloud storage
   - Never email backup files unencrypted

**Encrypting Backup Files (Windows):**

```powershell
# Using 7-Zip with AES-256 encryption
7z a -p -mhe=on backup_encrypted.7z NexaCare_Backup_*.json

# Enter strong password when prompted
```

**Encrypting Backup Files (Linux/Mac):**

```bash
# Using GPG
gpg --symmetric --cipher-algo AES256 NexaCare_Backup_*.json

# Creates encrypted .gpg file
```

---

### 2. Data in Transit

**Ensure HTTPS is enabled** (see HTTPS setup above).

**Verify:**
1. URL should start with `https://`
2. Browser shows padlock icon
3. Certificate is valid

**If not using HTTPS:**
- ⚠️ **Data is transmitted in plain text**
- ⚠️ **Anyone on network can intercept patient data**
- ⚠️ **CRITICAL SECURITY RISK**

---

### 3. Data Backup Security

**Backup Strategy (3-2-1 Rule):**

- **3 copies** of data
- **2 different media** (e.g., local + USB + cloud)
- **1 off-site** copy

**Implementation:**

1. **Automatic Backup (Hourly):**
   - Stored in browser localStorage
   - 5 most recent copies kept
   - Encrypted in browser

2. **Manual Backup (Daily):**
   - Download JSON file
   - Encrypt with password
   - Store on encrypted USB drive
   - Keep in physical safe

3. **Off-site Backup (Weekly):**
   - Encrypt backup file
   - Upload to secure cloud (Google Drive with encryption)
   - Or store encrypted USB at bank locker

**Backup Encryption Example:**

```bash
# Create encrypted backup
openssl enc -aes-256-cbc -salt -in NexaCare_Backup.json -out NexaCare_Backup.json.enc

# Enter password when prompted
# Decrypt when needed:
openssl enc -aes-256-cbc -d -in NexaCare_Backup.json.enc -out NexaCare_Backup.json
```

---

## 🖥️ Device Security

### 1. Server Security

**Physical Security:**
- [ ] Server in locked room (restricted access)
- [ ] UPS (uninterruptible power supply) for power backup
- [ ] Temperature controlled (prevent overheating)
- [ ] Fire extinguisher nearby
- [ ] Access log (who enters server room)

**Software Security:**
- [ ] Windows/Linux updates auto-installed
- [ ] Antivirus installed and updated
- [ ] Firewall enabled
- [ ] Only required software installed
- [ ] No personal use of server
- [ ] Remote desktop disabled (unless necessary)
- [ ] Strong BIOS/boot password

---

### 2. Tablet/Desktop Security

**For Doctors' Tablets:**
- [ ] Device PIN/password enabled (6+ digits)
- [ ] Auto-lock after 2 minutes of inactivity
- [ ] Find My Device enabled (for tracking if lost)
- [ ] Encryption enabled (Android: Settings → Security, iOS: enabled by default)
- [ ] No personal apps installed
- [ ] No photos/videos stored
- [ ] Only NexaCare Pro and medical apps
- [ ] Screen privacy filter (prevents shoulder surfing)

**For Desktop PCs:**
- [ ] Strong Windows password
- [ ] Screen lock (Win+L) when leaving desk
- [ ] Antivirus running
- [ ] No unauthorized software
- [ ] USB ports disabled (if possible)
- [ ] No external storage allowed without approval

---

### 3. Mobile Device Management (MDM) - Optional but Recommended

**For centralized control:**

Use MDM software to:
- Enforce password policies
- Remote wipe if device lost
- Restrict app installation
- Monitor device security
- Push updates automatically

**Recommended MDM Solutions:**
- **Microsoft Intune** (for Windows + Android)
- **JAMF** (for iOS/macOS)
- **MobileIron**
- **VMware Workspace ONE**

---

## 📊 Monitoring & Auditing

### 1. Access Logs

**Monitor who accesses what:**

Browser Console shows logs:
```javascript
// Open browser console (F12)
// Look for login/access logs
```

**Log Review Schedule:**
- Daily: Check for failed login attempts
- Weekly: Review user access patterns
- Monthly: Full audit of all activities

---

### 2. Audit Trail

**NexaCare Pro logs:**
- User logins
- Patient record access
- Prescription creation
- Data modifications
- Backup/restore actions

**Review logs weekly for:**
- Unusual access patterns
- After-hours access
- Failed login attempts
- Unauthorized data exports

---

### 3. Security Incident Response

**If you suspect a breach:**

1. **Immediate Actions:**
   - [ ] Disconnect from internet
   - [ ] Disable affected user accounts
   - [ ] Change all passwords
   - [ ] Restore from backup if data altered
   - [ ] Document everything

2. **Investigation:**
   - [ ] Review access logs
   - [ ] Identify affected data
   - [ ] Determine breach scope
   - [ ] Identify vulnerability

3. **Remediation:**
   - [ ] Fix vulnerability
   - [ ] Update security policies
   - [ ] Retrain staff
   - [ ] Notify affected parties (if required by law)

4. **Contact:**
   - [ ] NexaVoyagers Technologies support
   - [ ] Legal counsel
   - [ ] Regulatory authorities (if required)

---

## ✅ Compliance Checklist

### HIPAA Compliance (if applicable):

- [ ] **Administrative Safeguards:**
  - [ ] Security policies documented
  - [ ] Staff trained on security
  - [ ] Access controls implemented
  - [ ] Audit controls in place

- [ ] **Physical Safeguards:**
  - [ ] Devices secured
  - [ ] Server room locked
  - [ ] Workstations secured

- [ ] **Technical Safeguards:**
  - [ ] Access control (user authentication)
  - [ ] Audit controls (logging)
  - [ ] Integrity controls (backups)
  - [ ] Transmission security (HTTPS)

---

### Data Protection Act Compliance:

- [ ] **Data Minimization:**
  - Only collect necessary patient data

- [ ] **Purpose Limitation:**
  - Use data only for patient care

- [ ] **Data Accuracy:**
  - Keep records up-to-date

- [ ] **Storage Limitation:**
  - Retain data as per hospital policy

- [ ] **Security:**
  - Implement all security measures in this guide

- [ ] **Patient Rights:**
  - Ability to view own records
  - Ability to correct errors
  - Ability to request data deletion

---

## 🚨 Security Incident Examples & Responses

### Scenario 1: Lost Tablet

**What happened:** Doctor's tablet stolen from car.

**Response:**
1. Report to IT immediately
2. IT disables user account
3. If MDM enabled: Remote wipe device
4. Review what data was on device
5. Change doctor's password
6. Restore access on new device
7. File police report
8. Document incident

---

### Scenario 2: Unauthorized Access Attempt

**What happened:** Multiple failed login attempts for admin account.

**Response:**
1. Lock admin account temporarily
2. Review logs to identify source
3. Check if password compromised
4. Change admin password
5. Enable login attempt limit (if not already)
6. Investigate who attempted access
7. Retrain staff on password security

---

### Scenario 3: Ransomware Attack

**What happened:** Server infected with ransomware, files encrypted.

**Response:**
1. **DO NOT PAY RANSOM**
2. Disconnect server from network immediately
3. Power off server
4. Contact cybersecurity expert
5. Restore from backup (clean backup from before infection)
6. Rebuild server with fresh OS install
7. Restore application and data
8. Identify infection source
9. Update antivirus
10. Patch vulnerabilities

---

## 📞 Security Support Contacts

**NexaVoyagers Technologies:**
- Email: contact@nexavoyagers.com
- Emergency: [To be provided]
- Support Hours: Mon-Sat, 9 AM - 6 PM

**Cybersecurity Resources:**
- CERT-In: https://www.cert-in.org.in/
- Cybercrime Reporting: https://cybercrime.gov.in/

---

## 📚 Security Training for Staff

### Monthly Security Awareness:

**Topics to cover:**
1. Password security
2. Phishing awareness
3. Device security
4. Data handling
5. Incident reporting

**Training Duration:** 15 minutes/month

**Quiz:** Test staff knowledge quarterly

---

## 🎯 Security Maturity Roadmap

### Phase 1: Go-Live (Day 1)
- ✅ HTTPS enabled
- ✅ Firewall configured
- ✅ Default passwords changed
- ✅ Backups working

### Phase 2: Month 1
- ✅ MDM implemented
- ✅ Audit logs reviewed
- ✅ Security training completed
- ✅ Incident response plan tested

### Phase 3: Month 3
- ✅ Security audit conducted
- ✅ Penetration testing
- ✅ Compliance certification
- ✅ Advanced threat protection

---

## ⚠️ Final Security Warnings

1. **Never:**
   - Share passwords
   - Leave devices unlocked
   - Connect to public WiFi
   - Email patient data unencrypted
   - Take patient data home
   - Screenshot patient records
   - Use personal devices for EMR

2. **Always:**
   - Use HTTPS
   - Lock screen when away
   - Logout when done
   - Report security incidents
   - Follow password policy
   - Create daily backups
   - Update software

3. **Remember:**
   - Security is everyone's responsibility
   - Patient trust depends on data protection
   - One mistake can compromise all data
   - Prevention is cheaper than recovery

---

**END OF SECURITY GUIDE**

**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.
**For:** Vardhan Hospital, Varanasi
**Classification:** CONFIDENTIAL
**Version:** 1.0
**Last Updated:** Pre-Deployment

**Stay Secure! 🔒**
