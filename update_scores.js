import admin from 'firebase-admin';
import { serverTimestamp } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ujuziai-2ddea',
  });
}

const db = admin.firestore();

const scores = {
  "Guide DRC": 79,
  "MwalimuMwema": 75,
  "HémoConnect": 70,
  "Memoria": 70,
  "Safar'Transpo": 68,
  "Moto Safer": 67,
  "EcoSignal": 65,
  "Gestion de déchet": 63,
  "ElimuPay": 62,
  "Uzazi salama": 62
};

async function updateProjects() {
  console.log('--- Démarrage de la mise à jour des scores ---');
  
  // 1. Trouver le buildathon
  const buildathonsSnap = await db.collection('buildathons')
    .where('title', '==', 'Build with AI - Final Buildathon')
    .get();

  if (buildathonsSnap.empty) {
    console.error('Erreur: Buildathon "Build with AI - Final Buildathon" introuvable.');
    return;
  }

  const buildathonId = buildathonsSnap.docs[0].id;
  console.log(`Buildathon trouvé: ${buildathonId}`);

  // 2. Récupérer tous les projets de ce buildathon
  const projectsSnap = await db.collection('buildathonProjects')
    .where('buildathonId', '==', buildathonId)
    .get();

  console.log(`${projectsSnap.size} projets trouvés.`);

  const batch = db.batch();
  let updatedCount = 0;

  projectsSnap.forEach((doc) => {
    const data = doc.data();
    const projectName = data.teamName || data.title || '';
    
    // Trouver le score correspondant (recherche insensible à la casse et partielle)
    const matchedKey = Object.keys(scores).find(key => 
      projectName.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(projectName.toLowerCase())
    );

    const updateData = {};

    if (matchedKey) {
      console.log(`Mise à jour pour: ${projectName} -> Score: ${scores[matchedKey]}`);
      updateData.judgeScore = scores[matchedKey];
      updateData.status = 'published'; // S'assurer qu'il est publié
      updateData.projectStatus = 'approved';
      updateData.isPublished = true;
    }

    // Fix pour la date de soumission si elle est manquante
    if (!data.submittedAt) {
      console.log(`Fix date pour: ${projectName}`);
      // On met une date par défaut (par exemple la date de création ou maintenant)
      updateData.submittedAt = data.createdAt || admin.firestore.Timestamp.now();
    }

    if (Object.keys(updateData).length > 0) {
      batch.update(doc.ref, updateData);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`Succès: ${updatedCount} projets mis à jour.`);
  } else {
    console.log('Aucune mise à jour nécessaire.');
  }
}

updateProjects().catch(console.error);
