# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- Firebase services enabled: Authentication, Firestore, Storage, Functions

---

## 1. Firebase Project Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Name it (e.g., `UjuziAI`)
4. Enable Google Analytics (optional)

### Enable Services
1. **Authentication**: Enable Email/Password **and** Google Sign-In providers
   - For Google Sign-In: Go to Authentication → Sign-in method → Google → Enable
   - Set a public-facing project name and support email
   - Add your domain to Authorized domains (Settings → Authorized domains)
2. **Firestore Database**: Create in production mode
3. **Storage**: Set up default bucket
4. **Functions**: Upgrade to Blaze plan (required for Functions)

### Get Config
1. Go to Project Settings → General
2. Under "Your apps", add a Web app
3. Copy the Firebase config object

---

## 2. Local Setup

### Clone & Install
```bash
# Install frontend dependencies
npm install

# Install functions dependencies
cd functions && npm install && cd ..
```

### Environment Variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your Firebase config values
```

### Local Development
```bash
# Start frontend dev server
npm run dev

# In another terminal, start Firebase emulators
cd functions && npm run serve
```

To use emulators, set `VITE_USE_EMULATORS=true` in your `.env` file.

---

## 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 4. Deploy Storage Rules

```bash
firebase deploy --only storage
```

---

## 5. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

---

## 6. Deploy Frontend

### Build
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Or deploy everything at once
```bash
npm run build && firebase deploy
```

---

## 7. Post-Deployment Setup

### Create Admin User
1. Sign up through the app normally (email/password or Google Sign-In)
2. In Firebase Console → Firestore → users collection
3. Find your user document
4. Change `role` from `"student"` to `"admin"`

### Production Hardening Checklist
- [ ] Deploy Firestore rules (`firebase deploy --only firestore:rules`)
- [ ] Deploy Storage rules (`firebase deploy --only storage`)
- [ ] Verify Google Sign-In works on production domain
- [ ] Add production domain to Firebase Auth → Authorized domains
- [ ] Confirm MAX_ATTEMPTS=1 is enforced (one exam attempt per module)
- [ ] Test anti-cheat warning flow in exam interface
- [ ] Verify badge verification endpoint works
- [ ] Monitor Cloud Functions logs for agent errors

### Verify Deployment
1. Visit your Firebase Hosting URL
2. Create a test account
3. Navigate through a module
4. Submit a proof
5. Use the admin panel to validate
6. Take the exam

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (project.firebaseapp.com) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket (project.appspot.com) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics Measurement ID |
| `VITE_USE_EMULATORS` | Connect to local emulators (true/false) |

---

## Monitoring

- **Firebase Console**: Monitor auth, Firestore, and Functions
- **Functions Logs**: `firebase functions:log`
- **Firestore Usage**: Monitor reads/writes in Firebase Console
- **Performance**: Use Firebase Performance Monitoring

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Functions deploy fails | Ensure Node.js 18+, Blaze plan active |
| Auth not working | Check email/password provider is enabled |
| Firestore permission denied | Deploy latest firestore.rules |
| Storage upload fails | Check storage.rules and file size limits |
| Emulators not connecting | Verify VITE_USE_EMULATORS=true in .env |

