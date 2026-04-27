/**
 * Script to allocate bonus points to projects in "Build with AI - Final Buildathon"
 * Usage: node scripts/allocate-buildathon-bonus.js
 * 
 * This script:
 * 1. Finds the "Build with AI - Final Buildathon" buildathon
 * 2. Queries all projects in that buildathon
 * 3. Matches project titles with the specified bonus points
 * 4. Allocates bonus points to project owners/team members
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('Error loading service account:', err.message);
  console.log('\nTo use this script, set FIREBASE_SERVICE_ACCOUNT_PATH or place firebase-service-account.json in the root directory');
  process.exit(1);
}

const db = admin.firestore();

// Project names and their bonus points
const PROJECT_BONUSES = {
  'Guide DRC': 79,
  'MwalimuMwema': 75,
  'HémoConnect': 70,
  'Memoria': 70,
  "Safar'Transpo": 68,
  'Moto Safer': 67,
  'EcoSignal': 65,
  'Gestion de déchet': 63,
  'ElimuPay': 62,
  'Uzazi salama': 62,
};

const BUILDATHON_NAME = 'Build with AI - Final Buildathon';

async function main() {
  try {
    console.log('🚀 Starting bonus allocation...\n');

    // 1. Find the buildathon by name
    console.log(`📍 Finding buildathon: "${BUILDATHON_NAME}"`);
    const buildathonSnapshot = await db
      .collection('buildathons')
      .where('title', '==', BUILDATHON_NAME)
      .limit(1)
      .get();

    if (buildathonSnapshot.empty) {
      console.error(`❌ Buildathon "${BUILDATHON_NAME}" not found`);
      process.exit(1);
    }

    const buildathonDoc = buildathonSnapshot.docs[0];
    const buildathonId = buildathonDoc.id;
    console.log(`✅ Found buildathon with ID: ${buildathonId}\n`);

    // 2. Query all projects in this buildathon
    console.log(`📋 Querying projects in buildathon...`);
    const projectsSnapshot = await db
      .collection('buildathonProjects')
      .where('buildathonId', '==', buildathonId)
      .get();

    console.log(`✅ Found ${projectsSnapshot.size} total projects\n`);

    // 3. Match projects with bonus points
    const allocations = [];
    const matchedProjects = new Set();

    for (const projectDoc of projectsSnapshot.docs) {
      const project = projectDoc.data();
      const projectTitle = project.title || '';

      // Check if this project matches any of our bonus target projects
      for (const [targetName, bonusPoints] of Object.entries(PROJECT_BONUSES)) {
        if (projectTitle.toLowerCase().includes(targetName.toLowerCase()) || 
            targetName.toLowerCase().includes(projectTitle.toLowerCase())) {
          
          if (!matchedProjects.has(projectTitle)) {
            matchedProjects.add(projectTitle);
            
            console.log(`✅ Matched project: "${projectTitle}" → ${bonusPoints} points`);
            console.log(`   Project ID: ${projectDoc.id}`);
            console.log(`   Submitted by: ${project.submittedBy || 'unknown'}`);

            // Get project owner
            const submittedBy = project.submittedBy;
            if (submittedBy) {
              allocations.push({
                projectId: projectDoc.id,
                projectTitle: projectTitle,
                userId: submittedBy,
                bonusPoints: bonusPoints,
              });
            }
          }
          break;
        }
      }
    }

    console.log(`\n📊 Summary of allocations:`);
    console.log(`   Total matches: ${allocations.length}`);
    allocations.forEach(alloc => {
      console.log(`   • "${alloc.projectTitle}": ${alloc.bonusPoints} points → User ${alloc.userId.slice(0, 8)}...`);
    });

    // 4. Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n⚠️  This will allocate the bonus points to project owners.');
    rl.question('Continue? (yes/no) ', async (answer) => {
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ Aborted');
        rl.close();
        process.exit(0);
      }

      rl.close();

      // 5. Allocate bonus points
      console.log('\n🔄 Allocating bonus points...\n');
      let successCount = 0;
      let errorCount = 0;

      for (const alloc of allocations) {
        try {
          const userRef = db.collection('users').doc(alloc.userId);
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.warn(`⚠️  User ${alloc.userId} not found in users collection`);
            errorCount++;
            continue;
          }

          const currentBonus = userDoc.data().bonusPoints || 0;
          const newBonus = currentBonus + alloc.bonusPoints;

          // Update user's bonus points
          await userRef.update({
            bonusPoints: newBonus,
            bonusReason: `Points for "${alloc.projectTitle}" in ${BUILDATHON_NAME}`,
            bonusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`✅ Allocated ${alloc.bonusPoints} points to user ${alloc.userId.slice(0, 8)}...`);
          console.log(`   Project: "${alloc.projectTitle}"`);
          console.log(`   New total: ${newBonus} points\n`);
          
          successCount++;
        } catch (err) {
          console.error(`❌ Error allocating points for "${alloc.projectTitle}":`, err.message);
          errorCount++;
        }
      }

      // 6. Summary
      console.log(`\n✨ Allocation complete!`);
      console.log(`   ✅ Successful: ${successCount}`);
      if (errorCount > 0) {
        console.log(`   ❌ Failed: ${errorCount}`);
      }

      // Unmatched projects
      const unmatched = Object.keys(PROJECT_BONUSES).filter(name => !matchedProjects.has(name));
      if (unmatched.length > 0) {
        console.log(`\n⚠️  Projects not found (typo in name?):`);
        unmatched.forEach(name => {
          console.log(`   • "${name}"`);
        });
      }

      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
