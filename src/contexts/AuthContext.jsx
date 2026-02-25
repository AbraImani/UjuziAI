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

      await setDoc(doc(db, 'users', result.user.uid), userDoc);
      setUserProfile({ id: result.user.uid, ...userDoc });
      toast.success('Account created successfully!');
      return result.user;
    } catch (error) {
      const message = getAuthErrorMessage(error.code);
      toast.error(message);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      return result.user;
    } catch (error) {
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
        // First-time Google sign-in: create user doc
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
        await setDoc(userDocRef, userDoc);
        setUserProfile({ id: firebaseUser.uid, ...userDoc });
        toast.success('Account created with Google!');
      } else {
        setUserProfile({ id: existingDoc.id, ...existingDoc.data() });
        toast.success('Welcome back!');
      }

      return firebaseUser;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        return null; // User closed popup, no error
      }
      const message = getAuthErrorMessage(error.code);
      toast.error(message);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
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
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password',
    'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method',
    'auth/cancelled-popup-request': 'Sign-in cancelled',
  };
  return messages[code] || 'An authentication error occurred';
}
