import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { EXAM_CONFIG } from '../config/modules';

// ============================================
// Module Progress Hook
// ============================================
export function useModuleProgress(moduleId) {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user || !moduleId) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'progress', moduleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProgress({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProgress(null);
      }
    } catch (error) {
      console.error('Error fetching module progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user, moduleId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, refetch: fetchProgress };
}

// ============================================
// All User Progress Hook
// ============================================
export function useAllProgress() {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      if (!user) return;
      try {
        const progressRef = collection(db, 'users', user.uid, 'progress');
        const snap = await getDocs(progressRef);
        const map = {};
        snap.forEach((doc) => {
          map[doc.id] = { id: doc.id, ...doc.data() };
        });
        setProgressMap(map);
      } catch (error) {
        console.error('Error fetching all progress:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [user]);

  return { progressMap, loading };
}

// ============================================
// Submission Hook
// ============================================
export function useSubmission() {
  const { user } = useAuth();

  async function submitProof(moduleId, data) {
    if (!user) throw new Error('Not authenticated');

    const { images, videoUrl, description } = data;
    const imageUrls = [];

    // Upload images to Firebase Storage
    if (images && images.length > 0) {
      for (const image of images) {
        const storageRef = ref(
          storage,
          `submissions/${user.uid}/${moduleId}/${Date.now()}_${image.name}`
        );
        const snapshot = await uploadBytes(storageRef, image);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }
    }

    const submission = {
      userId: user.uid,
      moduleId,
      images: imageUrls,
      videoUrl: videoUrl || null,
      description,
      status: 'pending',
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
    };

    // Save submission
    const submissionRef = doc(
      collection(db, 'users', user.uid, 'submissions')
    );
    await setDoc(submissionRef, submission);

    // Update progress — auto-validate and unlock exam immediately
    const progressRef = doc(db, 'users', user.uid, 'progress', moduleId);
    await setDoc(
      progressRef,
      {
        moduleId,
        submissionId: submissionRef.id,
        submitted: true,
        submittedAt: serverTimestamp(),
        validated: true,
        examUnlocked: true,
        examScore: null,
        examAttempts: 0,
        examLocked: false,
        badgeId: null,
      },
      { merge: true }
    );

    return submissionRef.id;
  }

  return { submitProof };
}

// ============================================
// Exam Hook
// ============================================
export function useExam() {
  const { user } = useAuth();

  async function getExamStatus(moduleId) {
    if (!user) return null;
    const progressRef = doc(db, 'users', user.uid, 'progress', moduleId);
    const progressSnap = await getDoc(progressRef);
    if (!progressSnap.exists()) return { eligible: false, reason: 'no-submission' };

    const data = progressSnap.data();
    if (!data.submitted || !data.examUnlocked) return { eligible: false, reason: 'no-submission' };
    if (data.examLocked) return { eligible: false, reason: 'locked' };
    if (data.examAttempts >= EXAM_CONFIG.MAX_ATTEMPTS) return { eligible: false, reason: 'max-attempts' };
    if (data.examScore >= 6) return { eligible: false, reason: 'already-passed' };

    return { eligible: true, attempts: data.examAttempts || 0, data };
  }

  async function startExam(moduleId) {
    if (!user) throw new Error('Not authenticated');

    // Create exam session
    const examRef = doc(collection(db, 'exams'));
    await setDoc(examRef, {
      userId: user.uid,
      moduleId,
      startedAt: serverTimestamp(),
      status: 'in-progress',
      answers: [],
      mcqScore: null,
      openScore: null,
      totalScore: null,
      aiCheatingFlags: 0,
      completedAt: null,
    });

    // Increment attempt counter
    const progressRef = doc(db, 'users', user.uid, 'progress', moduleId);
    await updateDoc(progressRef, {
      examAttempts: increment(1),
    });

    return examRef.id;
  }

  async function submitAnswer(examId, questionIndex, answer, questionType) {
    if (!user) throw new Error('Not authenticated');

    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);
    if (!examSnap.exists()) throw new Error('Exam not found');

    const examData = examSnap.data();
    const answers = [...(examData.answers || [])];
    answers[questionIndex] = {
      answer,
      questionType,
      submittedAt: new Date().toISOString(),
    };

    await updateDoc(examRef, { answers });
    return true;
  }

  async function completeExam(examId, moduleId) {
    if (!user) throw new Error('Not authenticated');

    const examRef = doc(db, 'exams', examId);
    await updateDoc(examRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
    });

    return examId;
  }

  return { getExamStatus, startExam, submitAnswer, completeExam };
}

// ============================================
// Leaderboard Hook
// ============================================
export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('totalScore', 'desc'), limit(10));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setLeaderboard(data);

        // Find user rank
        if (user) {
          const allUsersQ = query(usersRef, orderBy('totalScore', 'desc'));
          const allSnap = await getDocs(allUsersQ);
          let rank = 1;
          allSnap.forEach((doc) => {
            if (doc.id === user.uid) {
              setUserRank(rank);
            }
            rank++;
          });
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [user]);

  return { leaderboard, userRank, loading };
}

// ============================================
// Admin Hook
// ============================================
export function useAdmin() {
  const { user, isAdmin } = useAuth();

  async function getAllSubmissions() {
    if (!isAdmin) throw new Error('Unauthorized');
    const submissionsRef = collection(db, 'submissions');
    const snap = await getDocs(submissionsRef);
    const data = [];
    snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
    return data;
  }

  async function validateSubmission(userId, moduleId, approved) {
    if (!isAdmin) throw new Error('Unauthorized');

    const progressRef = doc(db, 'users', userId, 'progress', moduleId);
    await updateDoc(progressRef, {
      validated: approved,
      examUnlocked: approved,
      reviewedAt: serverTimestamp(),
      reviewedBy: user.uid,
    });
  }

  async function toggleModuleLock(moduleId, isOpen) {
    if (!isAdmin) throw new Error('Unauthorized');
    const moduleRef = doc(db, 'moduleSettings', moduleId);
    await setDoc(moduleRef, { isOpen, updatedAt: serverTimestamp() }, { merge: true });
  }

  async function overrideExamLock(userId, moduleId) {
    if (!isAdmin) throw new Error('Unauthorized');
    const progressRef = doc(db, 'users', userId, 'progress', moduleId);
    await updateDoc(progressRef, {
      examLocked: false,
      examAttempts: 0,
    });
  }

  return { getAllSubmissions, validateSubmission, toggleModuleLock, overrideExamLock };
}
