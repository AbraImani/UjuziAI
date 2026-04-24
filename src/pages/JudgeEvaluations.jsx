import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, collectionGroup, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { ClipboardCheck, Loader2, Trophy, CheckCircle2, Clock3 } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

function formatCount(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('fr-FR').format(safeValue);
}

export default function JudgeEvaluations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [progressByBuildathon, setProgressByBuildathon] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    const email = String(user.email || '').trim();
    const emailLower = email.toLowerCase();

    const invitationsQuery = query(
      collectionGroup(db, 'invitations'),
      where('inviteeUid', '==', user.uid)
    );
    const invitationsByInvitedUidQuery = query(
      collectionGroup(db, 'invitations'),
      where('invitedUid', '==', user.uid)
    );
    const legacyInvitationsQuery = query(
      collectionGroup(db, 'judgeInvitations'),
      where('inviteeUid', '==', user.uid)
    );
    const legacyInvitationsByInvitedUidQuery = query(
      collectionGroup(db, 'judgeInvitations'),
      where('invitedUid', '==', user.uid)
    );
    const invitationsByEmailQuery = email
      ? query(collectionGroup(db, 'invitations'), where('inviteeEmail', '==', email))
      : null;
    const invitationsByInvitedEmailQuery = email
      ? query(collectionGroup(db, 'invitations'), where('invitedEmail', '==', email))
      : null;
    const invitationsByEmailLowerQuery = emailLower
      ? query(collectionGroup(db, 'invitations'), where('inviteeEmailLower', '==', emailLower))
      : null;
    const invitationsByInvitedEmailLowerQuery = emailLower
      ? query(collectionGroup(db, 'invitations'), where('invitedEmailLower', '==', emailLower))
      : null;
    const legacyInvitationsByEmailQuery = email
      ? query(collectionGroup(db, 'judgeInvitations'), where('inviteeEmail', '==', email))
      : null;
    const legacyInvitationsByInvitedEmailQuery = email
      ? query(collectionGroup(db, 'judgeInvitations'), where('invitedEmail', '==', email))
      : null;
    const legacyInvitationsByEmailLowerQuery = emailLower
      ? query(collectionGroup(db, 'judgeInvitations'), where('inviteeEmailLower', '==', emailLower))
      : null;
    const legacyInvitationsByInvitedEmailLowerQuery = emailLower
      ? query(collectionGroup(db, 'judgeInvitations'), where('invitedEmailLower', '==', emailLower))
      : null;

    const mergeInvitations = (
      primaryList,
      secondaryList,
      legacyList,
      legacySecondaryList,
      emailPrimaryList,
      emailSecondaryList,
      emailPrimaryLowerList,
      emailSecondaryLowerList,
      legacyEmailPrimaryList,
      legacyEmailSecondaryList,
      legacyEmailPrimaryLowerList,
      legacyEmailSecondaryLowerList
    ) => {
      const merged = new Map();

      [
        ...legacyEmailSecondaryLowerList,
        ...legacyEmailPrimaryLowerList,
        ...legacyEmailSecondaryList,
        ...legacyEmailPrimaryList,
        ...emailSecondaryLowerList,
        ...emailPrimaryLowerList,
        ...emailSecondaryList,
        ...emailPrimaryList,
        ...legacySecondaryList,
        ...legacyList,
        ...secondaryList,
        ...primaryList,
      ].forEach((item) => {
        const identity = item.inviteeUid || item.invitedUid || item.inviteeEmailLower || item.invitedEmailLower || item.inviteeEmail || item.invitedEmail || user.uid;
        const key = `${item.buildathonId || 'unknown'}_${identity}`;
        const previous = merged.get(key);
        const prevTs = previous?.updatedAt?.toDate ? previous.updatedAt.toDate().getTime() : 0;
        const currTs = item?.updatedAt?.toDate ? item.updatedAt.toDate().getTime() : 0;

        if (!previous || currTs >= prevTs) {
          merged.set(key, item);
        }
      });

      return Array.from(merged.values()).sort((a, b) => {
        const aDate = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bDate = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bDate - aDate;
      });
    };

    let primaryInvitations = [];
    let secondaryInvitations = [];
    let legacyInvitations = [];
    let legacySecondaryInvitations = [];
    let emailInvitations = [];
    let invitedEmailInvitations = [];
    let emailLowerInvitations = [];
    let invitedEmailLowerInvitations = [];
    let legacyEmailInvitations = [];
    let legacyInvitedEmailInvitations = [];
    let legacyEmailLowerInvitations = [];
    let legacyInvitedEmailLowerInvitations = [];

    const emitInvitations = () => {
      const nextInvitations = mergeInvitations(
        primaryInvitations,
        secondaryInvitations,
        legacyInvitations,
        legacySecondaryInvitations,
        emailInvitations,
        invitedEmailInvitations,
        emailLowerInvitations,
        invitedEmailLowerInvitations,
        legacyEmailInvitations,
        legacyInvitedEmailInvitations,
        legacyEmailLowerInvitations,
        legacyInvitedEmailLowerInvitations
      );
      if (import.meta.env.DEV) {
        console.info('[JudgeEvaluations] invitations snapshot', {
          uid: user.uid,
          email,
          counts: {
            invitations: primaryInvitations.length,
            invitationsByInvitedUid: secondaryInvitations.length,
            judgeInvitations: legacyInvitations.length,
            judgeInvitationsByInvitedUid: legacySecondaryInvitations.length,
            invitationsByEmail: emailInvitations.length,
            invitationsByInvitedEmail: invitedEmailInvitations.length,
            invitationsByEmailLower: emailLowerInvitations.length,
            invitationsByInvitedEmailLower: invitedEmailLowerInvitations.length,
            judgeInvitationsByEmail: legacyEmailInvitations.length,
            judgeInvitationsByInvitedEmail: legacyInvitedEmailInvitations.length,
            judgeInvitationsByEmailLower: legacyEmailLowerInvitations.length,
            judgeInvitationsByInvitedEmailLower: legacyInvitedEmailLowerInvitations.length,
            merged: nextInvitations.length,
          },
          invitations: nextInvitations.map((item) => ({
            id: item.id,
            buildathonId: item.buildathonId,
            inviteeUid: item.inviteeUid || null,
            invitedUid: item.invitedUid || null,
            inviteeEmail: item.inviteeEmail || item.invitedEmail || null,
            status: item.status || null,
            buildathonTitle: item.buildathonTitle || null,
            sourcePath: item.__sourcePath || null,
          })),
        });
      }
      setInvitations(nextInvitations);
      setLoading(false);
    };

    const unsubscribePrimary = onSnapshot(invitationsQuery, (snap) => {
      const nextInvitations = [];
      snap.forEach((d) => nextInvitations.push({ id: d.id, __sourcePath: d.ref.path, __sourceCollection: d.ref.parent.id, ...d.data() }));
      primaryInvitations = nextInvitations;
      emitInvitations();
    }, () => {
      primaryInvitations = [];
      emitInvitations();
    });

    const unsubscribePrimarySecondary = onSnapshot(invitationsByInvitedUidQuery, (snap) => {
      const nextInvitations = [];
      snap.forEach((d) => nextInvitations.push({ id: d.id, __sourcePath: d.ref.path, __sourceCollection: d.ref.parent.id, ...d.data() }));
      secondaryInvitations = nextInvitations;
      emitInvitations();
    }, () => {
      secondaryInvitations = [];
      emitInvitations();
    });

    const unsubscribeLegacy = onSnapshot(legacyInvitationsQuery, (snap) => {
      const nextInvitations = [];
      snap.forEach((d) => nextInvitations.push({ id: d.id, __sourcePath: d.ref.path, __sourceCollection: d.ref.parent.id, ...d.data() }));
      legacyInvitations = nextInvitations;
      emitInvitations();
    }, () => {
      legacyInvitations = [];
      emitInvitations();
    });

    const unsubscribeLegacySecondary = onSnapshot(legacyInvitationsByInvitedUidQuery, (snap) => {
      const nextInvitations = [];
      snap.forEach((d) => nextInvitations.push({ id: d.id, __sourcePath: d.ref.path, __sourceCollection: d.ref.parent.id, ...d.data() }));
      legacySecondaryInvitations = nextInvitations;
      emitInvitations();
    }, () => {
      legacySecondaryInvitations = [];
      emitInvitations();
    });

    const optionalUnsubscribers = [];
    const subscribeOptional = (q, setter) => {
      if (!q) return;
      const unsub = onSnapshot(q, (snap) => {
        const nextInvitations = [];
        snap.forEach((d) => nextInvitations.push({ id: d.id, __sourcePath: d.ref.path, __sourceCollection: d.ref.parent.id, ...d.data() }));
        setter(nextInvitations);
        emitInvitations();
      }, () => {
        setter([]);
        emitInvitations();
      });
      optionalUnsubscribers.push(unsub);
    };

    subscribeOptional(invitationsByEmailQuery, (list) => { emailInvitations = list; });
    subscribeOptional(invitationsByInvitedEmailQuery, (list) => { invitedEmailInvitations = list; });
    subscribeOptional(invitationsByEmailLowerQuery, (list) => { emailLowerInvitations = list; });
    subscribeOptional(invitationsByInvitedEmailLowerQuery, (list) => { invitedEmailLowerInvitations = list; });
    subscribeOptional(legacyInvitationsByEmailQuery, (list) => { legacyEmailInvitations = list; });
    subscribeOptional(legacyInvitationsByInvitedEmailQuery, (list) => { legacyInvitedEmailInvitations = list; });
    subscribeOptional(legacyInvitationsByEmailLowerQuery, (list) => { legacyEmailLowerInvitations = list; });
    subscribeOptional(legacyInvitationsByInvitedEmailLowerQuery, (list) => { legacyInvitedEmailLowerInvitations = list; });

    return () => {
      unsubscribePrimary();
      unsubscribePrimarySecondary();
      unsubscribeLegacy();
      unsubscribeLegacySecondary();
      optionalUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProgress() {
      const acceptedInvitations = invitations.filter((item) => item.status === 'accepted');
      if (acceptedInvitations.length === 0) {
        setProgressByBuildathon({});
        return;
      }

      const nextProgress = {};

      for (const invitation of acceptedInvitations) {
        const buildathonId = invitation.buildathonId;
        if (!buildathonId) continue;

        const projectsSnap = await getDocs(query(collection(db, 'buildathonProjects'), where('buildathonId', '==', buildathonId)));
        const totalProjects = projectsSnap.size;

        const scoresSnap = await getDocs(query(
          collectionGroup(db, 'judgeScores'),
          where('buildathonId', '==', buildathonId),
          where('judgeId', '==', user.uid)
        ));

        nextProgress[buildathonId] = {
          totalProjects,
          scoredProjects: scoresSnap.size,
        };
      }

      if (!cancelled) {
        setProgressByBuildathon(nextProgress);
      }
    }

    if (user?.uid) {
      fetchProgress();
    }

    return () => {
      cancelled = true;
    };
  }, [invitations, user?.uid]);

  const pendingInvitations = useMemo(
    () => invitations.filter((item) => item.status === 'pending'),
    [invitations]
  );

  const acceptedInvitations = useMemo(
    () => invitations.filter((item) => item.status === 'accepted'),
    [invitations]
  );

  async function handleInvitationDecision(invitation, status) {
    if (!user?.uid || !invitation?.buildathonId) return;

    const { doc, serverTimestamp, setDoc } = await import('firebase/firestore');

    const invitationData = {
      status,
      updatedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
    };

    if (import.meta.env.DEV) {
      console.info('[JudgeEvaluations] invitation decision', {
        uid: user.uid,
        buildathonId: invitation.buildathonId,
        status,
        invitationId: invitation.id || null,
        inviteeUid: invitation.inviteeUid || null,
        invitedUid: invitation.invitedUid || null,
      });
    }

    const invitationCollection = invitation.__sourceCollection === 'judgeInvitations' ? 'judgeInvitations' : 'invitations';
    const invitationDocId = invitation.id || user.uid;

    await Promise.all([
      setDoc(doc(db, 'buildathons', invitation.buildathonId, invitationCollection, invitationDocId), invitationData, { merge: true }),
      setDoc(doc(db, 'buildathons', invitation.buildathonId, 'invitations', invitationDocId), invitationData, { merge: true }),
      setDoc(doc(db, 'buildathons', invitation.buildathonId, 'judgeInvitations', invitationDocId), invitationData, { merge: true }),
    ]);

    if (status === 'accepted') {
      const judgeRef = doc(db, 'buildathons', invitation.buildathonId, 'judges', user.uid);
      await setDoc(judgeRef, {
        userId: user.uid,
        buildathonId: invitation.buildathonId,
        buildathonTitle: invitation.buildathonTitle || 'Buildathon',
        active: true,
        acceptedAt: serverTimestamp(),
        invitedBy: invitation.invitedBy || null,
      }, { merge: true });
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10">
        <div className="glass-card p-8 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
          <p className="text-heading font-medium">Chargement de vos évaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-heading inline-flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary-400" />
          Mes évaluations
        </h1>
        <p className="text-sm text-muted mt-2">Suivez vos invitations et votre progression de notation par Buildathon.</p>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-amber-400" />
            Invitations en attente
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div key={`${invitation.buildathonId}_${invitation.inviteeUid}`} className="rounded-xl border border-themed p-4 bg-black/5 dark:bg-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-heading font-medium">{invitation.buildathonTitle || 'Buildathon'}</p>
                  <p className="text-xs text-muted">Invitation juge</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInvitationDecision(invitation, 'declined')}
                    className="px-3 py-1.5 rounded-lg border border-themed text-xs text-body hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInvitationDecision(invitation, 'accepted')}
                    className="px-3 py-1.5 rounded-lg border border-primary-500/30 bg-primary-600/20 text-primary-200 text-xs"
                  >
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-heading inline-flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          Buildathons assignés
        </h2>

        {acceptedInvitations.length === 0 ? (
          <p className="text-sm text-muted">Aucun Buildathon assigné pour le moment.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {acceptedInvitations.map((invitation) => {
              const progress = progressByBuildathon[invitation.buildathonId] || { totalProjects: 0, scoredProjects: 0 };
              return (
                <Link
                  key={`${invitation.buildathonId}_${invitation.inviteeUid}`}
                  to={`/judge/buildathon/${invitation.buildathonId}`}
                  className="rounded-xl border border-themed p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <p className="font-semibold text-heading">{invitation.buildathonTitle || 'Buildathon'}</p>
                  <p className="text-xs text-muted mt-1">
                    Progression: {formatCount(progress.scoredProjects)}/{formatCount(progress.totalProjects)} projets évalués
                  </p>
                  <p className="text-xs text-emerald-400 mt-2 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accès juge actif
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
