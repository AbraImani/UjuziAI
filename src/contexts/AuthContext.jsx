import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// Admin emails — these users automatically get admin role
const ADMIN_EMAILS = ['abrahamfaith325@gmail.com'];

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result (fallback for popup-blocked)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const firebaseUser = result.user;
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const existingDoc = await getDoc(userDocRef);
          if (!existingDoc.exists()) {
            const userDoc = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || null,
              role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
              authProvider: 'google',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              totalScore: 0,
              completedModules: [],
              badges: [],
              rank: null,
            };
            await setDoc(userDocRef, userDoc);
          }
        } catch (e) {
          console.warn('Redirect result Firestore handling:', e.code);
        }
        toast.success('Connexion réussie !');
      }
    }).catch((err) => {
      if (err.code && err.code !== 'auth/popup-closed-by-user') {
        console.error('Redirect result error:', err);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid, firebaseUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function fetchUserProfile(uid, firebaseUser) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Auto-promote admin emails if not already admin
        if (isAdminEmail(data.email) && data.role !== 'admin') {
          try {
            await setDoc(docRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
            data.role = 'admin';
          } catch (e) {
            console.error('Could not auto-promote admin:', e);
          }
        }
        setUserProfile({ id: docSnap.id, ...data });
      } else if (firebaseUser) {
        // User doc doesn't exist yet (e.g. rules were not deployed when they signed up)
        // Create the user doc now
        const newDoc = {
          uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Utilisateur',
          photoURL: firebaseUser.photoURL || null,
          role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
          authProvider: firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalScore: 0,
          completedModules: [],
          badges: [],
          rank: null,
        };
        try {
          await setDoc(docRef, newDoc);
          setUserProfile({ id: uid, ...newDoc });
        } catch (writeErr) {
          console.warn('Could not create user doc (rules may not be deployed):', writeErr.code);
          // Fallback: use Firebase Auth data so the user can still navigate
          setUserProfile({
            id: uid,
            uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Utilisateur',
            photoURL: firebaseUser.photoURL || null,
            role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
            totalScore: 0,
            completedModules: [],
            badges: [],
          });
        }
      }
    } catch (error) {
      console.warn('Firestore profile fetch failed (rules may not be deployed):', error.code);
      // Fallback: build a minimal profile from Firebase Auth so the app still works
      if (firebaseUser) {
        setUserProfile({
          id: uid,
          uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Utilisateur',
          photoURL: firebaseUser.photoURL || null,
          role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
          totalScore: 0,
          completedModules: [],
          badges: [],
        });
      }
    }
  }

  async function signup(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });

      const userDoc = {
        uid: result.user.uid,
        email,
        displayName,
        photoURL: null,
        role: isAdminEmail(email) ? 'admin' : 'student',
        authProvider: 'email',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalScore: 0,
        completedModules: [],
        badges: [],
        rank: null,
      };

      try {
        await setDoc(doc(db, 'users', result.user.uid), userDoc);
        setUserProfile({ id: result.user.uid, ...userDoc });
      } catch (firestoreError) {
        console.error('Firestore write error:', firestoreError);
        // Auth succeeded, profile write failed — still let user in
        setUserProfile({ id: result.user.uid, ...userDoc });
      }
      toast.success('Compte créé avec succès !');
      return result.user;
    } catch (error) {
      console.error('Signup error:', error.code, error.message);
      const message = getAuthErrorMessage(error.code);
      toast.error(message);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Bon retour !');
      return result.user;
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      const message = getAuthErrorMessage(error.code);
      toast.error(message);
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user doc already exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const existingDoc = await getDoc(userDocRef);

      if (!existingDoc.exists()) {
        const userDoc = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || null,
          role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
          authProvider: 'google',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalScore: 0,
          completedModules: [],
          badges: [],
          rank: null,
        };
        try {
          await setDoc(userDocRef, userDoc);
          setUserProfile({ id: firebaseUser.uid, ...userDoc });
        } catch (firestoreError) {
          console.error('Firestore write error:', firestoreError);
          setUserProfile({ id: firebaseUser.uid, ...userDoc });
        }
        toast.success('Compte créé avec Google !');
      } else {
        setUserProfile({ id: existingDoc.id, ...existingDoc.data() });
        toast.success('Bon retour !');
      }

      return firebaseUser;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return null;
      }
      // If popup is blocked, fall back to redirect
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null; // will redirect, result handled on return
        } catch (redirectError) {
          console.error('Redirect sign-in error:', redirectError);
          toast.error('Échec de la connexion Google');
          return null;
        }
      }
      console.error('Google sign-in error:', error.code, error.message);
      const message = getAuthErrorMessage(error.code);
      toast.error(message);
      return null;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Échec de la déconnexion');
      throw error;
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    signInWithGoogle,
    logout,
    refreshProfile,
    isAdmin: userProfile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Cet email est déjà enregistré',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée. Vérifiez que Google Sign-In est activé dans Firebase Console.',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard',
    'auth/invalid-credential': 'Identifiants invalides. Vérifiez votre email et mot de passe',
    'auth/popup-blocked': 'Pop-up bloqué. Veuillez autoriser les pop-ups pour ce site',
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet email via une autre méthode de connexion',
    'auth/cancelled-popup-request': 'Connexion annulée',
    'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé. Ajoutez-le dans Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/internal-error': 'Erreur interne Firebase. Vérifiez votre configuration.',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion internet.',
    'auth/configuration-not-found': 'Configuration Firebase introuvable. Vérifiez vos variables d\'environnement.',
    'auth/invalid-api-key': 'Clé API Firebase invalide. Vérifiez vos variables d\'environnement.',
  };
  return messages[code] || `Erreur d'authentification (${code || 'inconnue'})`;
}
