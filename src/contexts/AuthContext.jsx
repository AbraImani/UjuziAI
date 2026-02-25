import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function fetchUserProfile(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
        role: 'student',
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
          role: 'student',
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
