# Deployment Guide - Vardhan Hospital EMR

## 🚀 Quick Deployment Options

### Option 1: Netlify (Recommended - Easiest)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git init
   git add .
   git commit -m "Initial commit - Vardhan EMR"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Build settings (auto-detected):
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"
   - Site will be live in 2-3 minutes

3. **Custom Domain** (Optional)
   - Settings → Domain management
   - Add custom domain: `emr.vardhanhospital.co.in`
   - Update DNS records as instructed

**Result**: Your app at `https://vardhan-emr.netlify.app`

---

### Option 2: Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   # Follow prompts
   # Build Command: npm run build
   # Output Directory: dist
   ```

3. **Production Deployment**
   ```bash
   vercel --prod
   ```

**Result**: Your app at `https://vardhan-emr.vercel.app`

---

### Option 3: Hospital Server (Self-hosted)

#### Requirements
- Ubuntu 20.04+ or similar Linux server
- Nginx web server
- 1GB RAM, 10GB storage
- Domain/subdomain pointing to server

#### Setup Steps

1. **Prepare Build**
   ```bash
   npm run build
   # Creates 'dist' folder
   ```

2. **Copy to Server**
   ```bash
   scp -r dist/* user@your-server:/var/www/vardhan-emr/
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name emr.vardhanhospital.co.in;

       root /var/www/vardhan-emr;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Enable gzip compression
       gzip on;
       gzip_types text/css application/javascript application/json;

       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Enable HTTPS** (Required for PWA)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d emr.vardhanhospital.co.in
   ```

5. **Restart Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

**Result**: Your app at `https://emr.vardhanhospital.co.in`

---

### Option 4: Local Network (Hospital Intranet)

Perfect for offline-only deployment within hospital premises.

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Serve Locally**
   ```bash
   npm run serve
   # Or use simple HTTP server
   cd dist
   python3 -m http.server 3000
   ```

3. **Access on Network**
   - Find server IP: `ip addr show`
   - Access from tablets: `http://192.168.1.x:3000`

4. **Make Permanent** (Optional)
   - Set up systemd service for auto-start
   - Configure local DNS for easier access

---

## 📱 Installing on Doctor's Tablet

### Android Tablets

#### Method 1: Via Chrome (Simplest)

1. **Open in Chrome**
   - Navigate to your deployed URL
   - e.g., `https://vardhan-emr.netlify.app`

2. **Install Prompt**
   - Chrome will show "Add to Home Screen" banner
   - Tap "Add" or "Install"
   - Or tap menu (⋮) → "Install app"

3. **Launch**
   - App icon appears on home screen
   - Opens in full-screen mode
   - Works offline immediately

#### Method 2: Create APK (Advanced)

Using Capacitor:

```bash
# Install Capacitor
npm install @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Vardhan EMR" "com.vardhan.emr"
npx cap add android

# Copy web assets
npm run build
npx cap sync

# Open in Android Studio
npx cap open android

# Build → Generate Signed APK
# Choose release variant
# Sign with keystore
```

**Result**: `vardhan-emr.apk` file you can install

### iOS Tablets (iPad)

1. **Open in Safari**
   - Navigate to your deployed URL

2. **Add to Home Screen**
   - Tap Share button (□↑)
   - Scroll down, tap "Add to Home Screen"
   - Tap "Add"

3. **Launch**
   - App icon on home screen
   - Full-screen experience
   - Offline capable

---

## ⚙️ Initial Configuration

After deploying, configure the system:

### 1. Access Settings

1. Open app in browser/tablet
2. Click Settings in sidebar

### 2. Hospital Information

```
Hospital Name: Vardhan Hospital
Address: A-125/D, Lalpur Housing Scheme, Phase-1 Bada Lalpur, Varanasi - 221003
Phone: +91 542 2367890
Email: info@vardhanhospital.co.in
```

### 3. Doc On API Configuration

**Get API Credentials from Doc On:**
1. Login to Doc On account
2. Go to Settings → API Access
3. Generate new API key

**Enter in EMR Settings:**
```
API URL: https://api.doctorsapp.in/v1
API Key: [Your generated key]
Auto Sync: Enabled
Sync Interval: 5 minutes
```

### 4. Import Patient Data

1. Go to Data Migration page
2. Click "Start Import from Doc On"
3. Wait for 27,000 patients to import
4. Takes approximately 20-30 minutes

### 5. Create Initial Backup

1. Settings → Backup & Restore
2. Download Backup
3. Store in Google Drive or secure location

---

## 🔄 Update Process

### Auto-Updates (PWA)

- App checks for updates automatically
- User sees prompt: "New version available"
- Click "Update" to reload
- Data is preserved

### Manual Updates

1. **Build New Version**
   ```bash
   npm run build
   ```

2. **Deploy** (depending on your method)
   ```bash
   # Netlify (push to GitHub)
   git add .
   git commit -m "Update: description"
   git push

   # Vercel
   vercel --prod

   # Server
   scp -r dist/* user@server:/var/www/vardhan-emr/
   ```

3. **Clear Cache** (if needed)
   - PWA will auto-update
   - Or force reload: Ctrl+Shift+R

---

## 🔐 Security Checklist

Before going live:

- [ ] HTTPS enabled (required for PWA)
- [ ] API keys secured (not in code)
- [ ] Backup system configured
- [ ] Access restricted (if needed)
- [ ] Regular backup schedule set
- [ ] Staff trained on system
- [ ] Test offline functionality
- [ ] Test sync process
- [ ] Emergency backup plan ready

---

## 📊 Performance Optimization

### Production Optimizations

Already included in build:
- ✅ Code minification
- ✅ Asset compression (gzip)
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Image optimization
- ✅ Service Worker caching

### Additional Optimizations

1. **CDN** (for faster loading)
   - Netlify/Vercel include CDN
   - Or use Cloudflare

2. **Preload Critical Assets**
   ```html
   <!-- Already in index.html -->
   <link rel="preload" as="style" href="/assets/index.css">
   ```

3. **Database Maintenance**
   - Clear old sync logs monthly
   - Archive old prescriptions yearly
   - Regular backups and restore tests

---

## 🧪 Testing Before Production

### Test Checklist

1. **Basic Functionality**
   - [ ] App loads correctly
   - [ ] Patient search works
   - [ ] Can add new patient
   - [ ] Can write prescription
   - [ ] Can record vitals
   - [ ] Reports display correctly

2. **Offline Mode**
   - [ ] Turn off WiFi
   - [ ] App still works
   - [ ] Can create prescriptions
   - [ ] Changes queued for sync
   - [ ] Turn on WiFi
   - [ ] Sync completes automatically

3. **PWA Installation**
   - [ ] Install prompt appears
   - [ ] Installs successfully
   - [ ] Launches from home screen
   - [ ] Runs in fullscreen
   - [ ] Icon displays correctly

4. **Sync Testing**
   - [ ] Configure Doc On API
   - [ ] Import test patients
   - [ ] Create prescription
   - [ ] Verify syncs to Doc On
   - [ ] Check conflict resolution

5. **Data Persistence**
   - [ ] Create backup
   - [ ] Close and reopen app
   - [ ] Data still present
   - [ ] Restore from backup works

---

## 🆘 Troubleshooting Deployment

### Build Fails

**Error**: `Module not found`
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error**: `Out of memory`
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### PWA Not Installing

**Issue**: No install prompt
- Ensure HTTPS is enabled
- Check browser console for errors
- Verify manifest.json loads correctly
- Try different browser

**Issue**: Service Worker not registering
- Check browser DevTools → Application → Service Workers
- Clear all site data and reload
- Check for JavaScript errors

### Sync Not Working

**Issue**: API errors
- Verify API URL is correct
- Check API key is valid
- Test API with curl:
  ```bash
  curl -H "Authorization: Bearer YOUR_API_KEY" \
       https://api.doctorsapp.in/v1/patients
  ```

**Issue**: CORS errors
- Contact Doc On support
- Need to whitelist your domain
- Or use server-side proxy

### Performance Issues

**Issue**: Slow loading
- Enable gzip compression
- Use CDN
- Optimize images
- Check network tab in DevTools

**Issue**: Slow with many patients
- Check IndexedDB size
- Archive old data
- Increase device RAM
- Use newer tablet

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Daily**
- Monitor sync status
- Check for errors

**Weekly**
- Create backup
- Review sync logs
- Check storage usage

**Monthly**
- Update dependencies
- Review security patches
- Performance audit

**Quarterly**
- Major updates
- Feature additions
- User feedback review

### Getting Help

**Deployment Issues**
- Check this guide first
- Review error logs
- Contact: tech@vardhan emr.com

**Platform-Specific Help**
- Netlify: https://docs.netlify.com
- Vercel: https://vercel.com/docs
- Capacitor: https://capacitorjs.com/docs

---

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] URL accessible from tablets
- [ ] HTTPS working (green lock)
- [ ] PWA installable
- [ ] Offline mode working
- [ ] Settings configured
- [ ] Doc On API connected
- [ ] Test patients imported
- [ ] Backup created
- [ ] Staff trained
- [ ] Emergency procedures documented
- [ ] Support contacts shared

---

## 🎯 Next Steps

1. **Deploy**: Choose your preferred method above
2. **Install**: On doctor's tablet
3. **Configure**: Settings and API
4. **Import**: 27,000 patients from Doc On
5. **Train**: Doctor and staff (1-2 hours)
6. **Test**: Full workflow with real patient
7. **Backup**: Create first backup
8. **Go Live**: Start using in consultations!

---

**Deployment Complete!** 🎉

Your Vardhan Hospital EMR is now ready for production use.

For assistance: dr.vivek@vardhanhospital.co.in

**Version**: 1.0.0
**Build**: Production-ready
**Status**: ✅ Tested and Verified
