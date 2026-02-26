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
    if (!user) throw new Error('Vous devez être connecté');

    const { images, videoUrl, description } = data;
    const imageUrls = [];

    // Upload images to Firebase Storage
    if (images && images.length > 0) {
      for (const image of images) {
        try {
          const storageRef = ref(
            storage,
            `submissions/${user.uid}/${moduleId}/${Date.now()}_${image.name}`
          );
          const snapshot = await uploadBytes(storageRef, image);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError.code, uploadError.message);
          throw new Error(`Échec de l'upload de l'image "${image.name}". Réessayez.`);
        }
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

  async function completeExam(examId, moduleId, questions) {
    if (!user) throw new Error('Not authenticated');

    const examRef = doc(db, 'exams', examId);
    const examSnap = await getDoc(examRef);
    if (!examSnap.exists()) throw new Error('Exam not found');

    const examData = examSnap.data();
    const answers = examData.answers || [];

    // Score MCQ questions automatically
    let mcqCorrect = 0;
    let mcqTotal = 0;
    let openCount = 0;

    if (questions && questions.length > 0) {
      questions.forEach((q, index) => {
        if (q.type === 'mcq') {
          mcqTotal++;
          const userAnswer = answers[index]?.answer;
          if (userAnswer === q.correct) {
            mcqCorrect++;
          }
        } else if (q.type === 'open') {
          openCount++;
        }
      });
    }

    // MCQ worth 7 points, open worth 3 points
    // MCQ score = (correct / total) * 7, rounded
    const mcqScore = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 7) : 0;
    
    // For open-ended: give 2/3 points by default (generous baseline)
    // In production, this would be scored by AI agents
    const openScore = openCount > 0 ? 2 : 0;
    
    const totalScore = Math.min(mcqScore + openScore, 10);
    const passed = totalScore >= EXAM_CONFIG.PASSING_SCORE;

    // Update exam document
    await updateDoc(examRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      mcqScore,
      openScore,
      totalScore,
      mcqCorrect,
      mcqTotal,
    });

    // Update user progress with score
    const progressRef = doc(db, 'users', user.uid, 'progress', moduleId);
    const progressSnap = await getDoc(progressRef);
    const existingScore = progressSnap.exists() ? (progressSnap.data().examScore || 0) : 0;
    
    // Keep the best score
    const bestScore = Math.max(existingScore, totalScore);
    
    const badgeId = passed ? `badge-${moduleId}-${user.uid.slice(0, 6)}-${Date.now().toString(36)}` : null;

    await updateDoc(progressRef, {
      examScore: bestScore,
      lastExamScore: totalScore,
      ...(passed && !existingScore >= EXAM_CONFIG.PASSING_SCORE ? { badgeId } : {}),
    });

    // Update user totalScore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Recalculate total score from all progress
      const allProgressSnap = await getDocs(collection(db, 'users', user.uid, 'progress'));
      let newTotalScore = 0;
      allProgressSnap.forEach((p) => {
        newTotalScore += (p.data().examScore || 0);
      });
      await updateDoc(userRef, { totalScore: newTotalScore });
    }

    return { totalScore, mcqScore, openScore, passed, badgeId };
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

  // ---- Role management (4 community roles) ----
  async function updateUserRole(userId, newRole) {
    if (!isAdmin) throw new Error('Unauthorized');
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      communityRole: newRole,
      updatedAt: serverTimestamp(),
    });
  }

  // ---- Module CRUD ----
  async function saveModuleSettings(moduleId, settings) {
    if (!isAdmin) throw new Error('Unauthorized');
    const moduleRef = doc(db, 'moduleSettings', moduleId);
    await setDoc(moduleRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  }

  // ---- Editable exam settings ----
  async function saveExamSettings(settings) {
    if (!isAdmin) throw new Error('Unauthorized');
    const settingsRef = doc(db, 'appSettings', 'exam');
    await setDoc(settingsRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  }

  async function getExamSettings() {
    const settingsRef = doc(db, 'appSettings', 'exam');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) return snap.data();
    return null;
  }

  return {
    getAllSubmissions,
    validateSubmission,
    toggleModuleLock,
    overrideExamLock,
    updateUserRole,
    saveModuleSettings,
    saveExamSettings,
    getExamSettings,
  };
}
