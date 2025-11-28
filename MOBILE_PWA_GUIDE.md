# 📱 NexaCare Pro - Mobile PWA Installation Guide
## Install on Android & iOS Devices

**Product:** NexaCare Pro v1.0
**For:** Tablets and Smartphones (Doctors & Staff)
**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.

---

## 🎯 What is a PWA?

**Progressive Web App (PWA)** = Web app that works like a native mobile app

**Benefits:**
- ✅ Install on home screen like regular app
- ✅ Works **completely offline**
- ✅ No App Store/Play Store needed
- ✅ Automatic updates
- ✅ Fast and responsive
- ✅ Uses less storage than native apps

---

## 📋 Before You Start

### Requirements:

**Android Devices:**
- Android 5.0 or later
- Chrome browser (pre-installed on most devices)
- Connected to hospital WiFi

**iOS Devices (iPad/iPhone):**
- iOS 11.3 or later
- Safari browser (pre-installed)
- Connected to hospital WiFi

**You'll Need:**
- Hospital server IP address (e.g., `192.168.10.50`)
- Your login credentials

---

## 🤖 Android Installation

### Step 1: Connect to WiFi

1. **Open Settings** on your Android device
2. **Tap WiFi**
3. **Select hospital WiFi network:**
   - Network name: `Hospital-EMR` (or as configured)
4. **Enter WiFi password**
5. **Tap Connect**
6. **Verify connection:** Look for WiFi icon in status bar

---

### Step 2: Open Chrome Browser

1. **Find Chrome app** on your home screen or app drawer
2. **Tap to open**

---

### Step 3: Navigate to NexaCare Pro

1. **Tap address bar** at top
2. **Type the URL:**
   ```
   http://192.168.10.50:3000
   ```
   *(Replace `192.168.10.50` with your actual server IP)*

3. **Tap Go** or press Enter

4. **Wait for page to load**
   - You should see the NexaCare Pro login page

---

### Step 4: Install as App

**Method 1: Chrome Install Prompt (Recommended)**

1. **Look for install banner** at bottom of screen:
   - Says "Add NexaCare Pro to Home screen"

2. **Tap "Install"** or "Add"

3. **Confirm installation:**
   - Tap "Install" again in popup

4. **Wait for installation** (few seconds)

5. **App icon appears** on home screen

**Method 2: Manual Installation (if banner doesn't appear)**

1. **Tap the three-dot menu** (⋮) in top-right corner of Chrome

2. **Tap "Add to Home screen"**

3. **Edit app name (optional):**
   - Default: "NexaCare Pro"
   - You can change to: "Vardhan EMR" or "NexaCare"

4. **Tap "Add"**

5. **Confirm:** Tap "Add" again

6. **App icon appears** on home screen

---

### Step 5: Launch & Test

1. **Find "NexaCare Pro" icon** on home screen

2. **Tap to launch**
   - Opens in full-screen mode (no browser bar!)
   - Looks and feels like a native app

3. **Login with your credentials:**
   - Username: `[your username]`
   - Password: `[your password]`

4. **Test offline mode:**
   - Login successfully
   - Turn on **Airplane mode**
   - Try navigating the app
   - Should work perfectly offline! ✅

5. **Turn Airplane mode off** when done testing

---

## 🍎 iOS Installation (iPad/iPhone)

### Step 1: Connect to WiFi

1. **Open Settings** app
2. **Tap WiFi**
3. **Select hospital WiFi:**
   - Network: `Hospital-EMR`
4. **Enter password**
5. **Tap Join**
6. **Verify:** WiFi icon appears in status bar

---

### Step 2: Open Safari Browser

1. **Find Safari app** (blue compass icon)
2. **Tap to open**

**⚠️ Important:** Must use **Safari**, not Chrome!
PWA installation only works in Safari on iOS.

---

### Step 3: Navigate to NexaCare Pro

1. **Tap address bar** at top
2. **Type the URL:**
   ```
   http://192.168.10.50:3000
   ```
   *(Replace with your server IP)*

3. **Tap Go**

4. **Page loads** → You see NexaCare Pro login

---

### Step 4: Add to Home Screen

1. **Tap the Share button** (box with arrow pointing up)
   - Located at **bottom** center of Safari (iPhone)
   - Or at **top** right of Safari (iPad)

2. **Scroll down** in the menu

3. **Tap "Add to Home Screen"**
   - Icon looks like: [+] with a screen

4. **Edit app name (optional):**
   - Default: "NexaCare Pro"
   - Can change if desired

5. **Tap "Add"** in top-right corner

6. **App icon appears** on home screen

---

### Step 5: Launch & Test

1. **Press Home button** to exit Safari

2. **Find "NexaCare Pro" icon** on home screen

3. **Tap to launch**
   - Opens in full-screen (no Safari bars)
   - Acts like a native app

4. **Login with credentials**

5. **Test offline:**
   - Login successfully
   - Open **Control Center** (swipe down from top-right)
   - Tap **Airplane icon** to enable Airplane mode
   - Return to app
   - Navigate around - works offline! ✅
   - Disable Airplane mode when done

---

## 📸 Visual Guide (Screenshots)

### Android Installation Screenshots:

```
Step 1: Chrome Address Bar
┌─────────────────────────────┐
│ http://192.168.10.50:3000  │ ← Type URL here
└─────────────────────────────┘

Step 2: Install Banner
┌─────────────────────────────┐
│ Add NexaCare Pro to Home    │
│ screen                       │
│          [Install]  [Cancel] │
└─────────────────────────────┘

Step 3: Three-Dot Menu
┌─────────────────────────────┐
│ ⋮                           │ ← Tap here
│ Share                        │
│ Add to Home screen          │ ← Or tap this
│ Desktop site                 │
│ Settings                     │
└─────────────────────────────┘
```

### iOS Installation Screenshots:

```
Step 1: Safari Share Button
┌─────────────────────────────┐
│                        🔍 ⊞ │
│                        ↑     │ ← Tap share
└─────────────────────────────┘

Step 2: Share Menu
┌─────────────────────────────┐
│ Add to Reading List          │
│ Add Bookmark                 │
│ Add to Favorites             │
│ Add to Home Screen          │ ← Tap this
│ Find on Page                 │
└─────────────────────────────┘

Step 3: App Name
┌─────────────────────────────┐
│ [Icon] NexaCare Pro ✎       │
│                              │
│        [Add]        [Cancel] │
└─────────────────────────────┘
```

---

## 🎨 Customizing App Icon (Optional)

**Android:**
1. Long-press app icon on home screen
2. Tap "Edit" or "Rename"
3. Change name
4. Tap "OK"

**iOS:**
- App name is set during installation
- To change: Uninstall and reinstall with new name

---

## 🔄 Updating the App

**PWAs update automatically!**

**When updates are available:**
1. **Android:**
   - Close and reopen app
   - Updates install automatically
   - May show "Update available" message
   - Tap "Update" to apply

2. **iOS:**
   - Close app completely (swipe up in app switcher)
   - Reopen app
   - Update applies automatically

**Manual Update (if needed):**
1. Open app in browser (not installed app)
2. Refresh page (pull down or F5)
3. Close browser
4. Reopen installed app

---

## 🗑️ Uninstalling the App

### Android:

**Method 1:**
1. Long-press app icon
2. Tap "Uninstall" or drag to "Remove"
3. Confirm

**Method 2:**
1. Settings → Apps
2. Find "NexaCare Pro"
3. Tap "Uninstall"

### iOS:

1. Long-press app icon
2. Tap "Remove App"
3. Tap "Delete App"
4. Confirm "Delete"

---

## ❓ Troubleshooting

### "Cannot connect to server"

**Solution:**
1. Check WiFi connection
   - Are you connected to hospital WiFi?
   - Try opening other websites
2. Verify server IP in URL
   - Is it correct? Ask IT
3. Check if server is running
   - Ask IT to verify
4. Try from another device
   - Does it work there?

---

### "Add to Home Screen" not showing (Android)

**Solution:**
1. Make sure you're using **Chrome browser** (not Firefox, Edge, etc.)
2. Try the three-dot menu method
3. Update Chrome to latest version:
   - Play Store → Chrome → Update
4. Clear Chrome cache:
   - Settings → Apps → Chrome → Clear Cache

---

### "Add to Home Screen" not showing (iOS)

**Solution:**
1. Make sure you're using **Safari browser** (not Chrome!)
2. Update iOS to latest version:
   - Settings → General → Software Update
3. Try again after update

---

### App not working offline

**Solution:**
1. First, make sure you **logged in at least once** while online
2. Close app completely
3. Reopen app
4. If still issues:
   - Clear app data
   - Reinstall app
   - Login again while online

---

### "This site can't be reached"

**Solution:**
1. Check server IP address is correct
2. Verify you're on hospital WiFi (not mobile data)
3. Try accessing from PC first to verify server is up
4. Contact IT support

---

### Login not working

**Solution:**
1. Check Caps Lock is OFF
2. Verify username (no spaces)
3. Try resetting password (contact admin)
4. Clear browser cache and try again

---

## 📊 App Performance Tips

### For Best Performance:

1. **Close unused apps:**
   - Keep only NexaCare Pro running when in use
   - Improves speed and battery life

2. **Clear cache monthly:**
   - Android: Settings → Apps → NexaCare Pro → Clear Cache
   - iOS: Uninstall and reinstall app

3. **Keep WiFi on:**
   - For auto-sync to work
   - Offline mode still works, but no data sync

4. **Restart device weekly:**
   - Helps maintain performance

5. **Update iOS/Android:**
   - Latest OS = best performance

---

## 🔒 Security Tips

1. **Enable screen lock:**
   - PIN, password, or biometric
   - Auto-lock after 2 minutes

2. **Don't share device:**
   - One device per user

3. **Logout when done:**
   - Especially on shared devices

4. **Report lost devices:**
   - Immediately inform IT
   - They can disable your account

5. **Don't screenshot patient data:**
   - Violates privacy policies

---

## ✅ Installation Checklist

**Android Installation:**
- [ ] Connected to hospital WiFi
- [ ] Opened Chrome browser
- [ ] Navigated to server URL
- [ ] Added to home screen
- [ ] App icon visible
- [ ] Tested login
- [ ] Tested offline mode
- [ ] Verified data syncs

**iOS Installation:**
- [ ] Connected to hospital WiFi
- [ ] Opened Safari browser (not Chrome!)
- [ ] Navigated to server URL
- [ ] Tapped Share button
- [ ] Added to Home Screen
- [ ] App icon visible
- [ ] Tested login
- [ ] Tested offline mode
- [ ] Verified data syncs

---

## 📱 Multiple Device Setup

**If installing on multiple tablets/phones:**

1. **First Device:**
   - Install as above
   - Login
   - Import patient data (if needed)
   - Verify everything works

2. **Additional Devices:**
   - Install app same way
   - Login with **different user accounts** (each user gets own account)
   - Data auto-syncs from server
   - No need to import data again

**Important:** Don't login with same user on multiple devices simultaneously!

---

## 🎯 Post-Installation

### What to do after installation:

1. **Bookmark important pages:**
   - Patients page
   - Prescriptions page
   - (Use browser bookmarks, not app bookmarks)

2. **Customize notifications (if enabled):**
   - Settings → Notifications → NexaCare Pro
   - Enable/disable as needed

3. **Test all features:**
   - Search patient
   - Write prescription
   - Record vitals
   - Upload lab report
   - View reports

4. **Practice offline mode:**
   - Enable Airplane mode
   - Try all features
   - Verify data saves
   - Disable Airplane mode
   - Verify data syncs

---

## 🆘 Getting Help

**If you get stuck:**

1. **Ask IT Support:**
   - Hospital IT can help with installation
   - They know server details

2. **NexaVoyagers Support:**
   - Email: contact@nexavoyagers.com
   - Support Hours: Mon-Sat, 9 AM - 6 PM

3. **Refer to training guide:**
   - See `TRAINING_GUIDE.md` for app usage

4. **Check deployment guide:**
   - See `PRODUCTION_DEPLOYMENT_GUIDE.md` for server setup

---

## 📞 Quick Reference

**Server URL Format:**
```
http://[SERVER-IP]:3000

Examples:
http://192.168.10.50:3000
http://192.168.1.100:3000
http://10.0.0.50:3000
```

**Browser Requirements:**
- **Android:** Chrome browser
- **iOS:** Safari browser

**Installation Button:**
- **Android:** Three-dot menu → "Add to Home screen"
- **iOS:** Share button → "Add to Home Screen"

**Testing Offline:**
- Enable Airplane mode
- Use app normally
- Disable Airplane mode to sync

---

## 🎓 Training Video Scripts

### Android Installation Video (2 minutes)

```
Scene 1: (0:00-0:15)
"Welcome! Today we'll install NexaCare Pro on your Android tablet."
[Show device home screen]

Scene 2: (0:15-0:30)
"First, connect to hospital WiFi."
[Show Settings → WiFi → Select network]

Scene 3: (0:30-0:45)
"Open Chrome browser and type the server URL."
[Show typing URL, page loading]

Scene 4: (0:45-1:15)
"Tap the three dots, then 'Add to Home screen'."
[Show menu, tapping option, naming app]

Scene 5: (1:15-1:45)
"The app icon appears. Tap to launch!"
[Show home screen, tapping icon, login screen]

Scene 6: (1:45-2:00)
"Login with your credentials. You're all set!"
[Show login, dashboard]
```

### iOS Installation Video (2 minutes)

Similar script, adapted for iOS with Safari browser.

---

**END OF MOBILE PWA GUIDE**

**Prepared by:** NexaVoyagers Technologies Pvt. Ltd.
**For:** Vardhan Hospital Mobile Deployment
**Version:** 1.0
**Last Updated:** Pre-Deployment

**Happy Installing! 📱**
