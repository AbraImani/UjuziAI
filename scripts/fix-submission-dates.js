/**
 * Script to fix missing submission dates in buildathon projects
 * Usage: node scripts/fix-submission-dates.js
 * 
 * This script:
 * 1. Finds all buildathon projects with missing or invalid submittedAt
 * 2. Falls back to createdAt if available
 * 3. Reports projects that still don't have valid dates
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

function isValidTimestamp(value) {
  if (!value) return false;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }
  if (value?.toDate && typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      return !Number.isNaN(date.getTime());
    } catch {
      return false;
    }
  }
  return false;
}

async function main() {
  try {
    console.log('🚀 Starting submission date fix...\n');

    // Query all buildathon projects
    console.log('📋 Querying all buildathon projects...');
    const projectsSnapshot = await db.collection('buildathonProjects').get();
    console.log(`✅ Found ${projectsSnapshot.size} total projects\n`);

    const projectsNeedingFix = [];
    const projectsWithValidDates = [];
    const projectsWithMissingCreatedAt = [];

    // Analyze each project
    projectsSnapshot.forEach(doc => {
      const project = doc.data();
      const hasValidSubmittedAt = isValidTimestamp(project.submittedAt);
      const hasValidCreatedAt = isValidTimestamp(project.createdAt);

      if (!hasValidSubmittedAt) {
        if (hasValidCreatedAt) {
          projectsNeedingFix.push({
            id: doc.id,
            title: project.title || '(no title)',
            buildathonId: project.buildathonId,
            submittedBy: project.submittedBy,
            createdAt: project.createdAt,
          });
        } else {
          projectsWithMissingCreatedAt.push({
            id: doc.id,
            title: project.title || '(no title)',
            buildathonId: project.buildathonId,
          });
        }
      } else {
        projectsWithValidDates.push(doc.id);
      }
    });

    console.log(`📊 Analysis results:`);
    console.log(`   ✅ Projects with valid submittedAt: ${projectsWithValidDates.length}`);
    console.log(`   🔧 Projects needing fix (createdAt available): ${projectsNeedingFix.length}`);
    console.log(`   ❌ Projects missing both dates: ${projectsWithMissingCreatedAt.length}\n`);

    if (projectsNeedingFix.length > 0) {
      console.log('🔧 Projects to fix:');
      projectsNeedingFix.forEach(p => {
        console.log(`   • "${p.title}" (ID: ${p.id.slice(0, 8)}...)`);
      });
    }

    if (projectsWithMissingCreatedAt.length > 0) {
      console.log('\n❌ Projects with missing dates (manual review needed):');
      projectsWithMissingCreatedAt.forEach(p => {
        console.log(`   • "${p.title}" (ID: ${p.id})`);
      });
    }

    if (projectsNeedingFix.length === 0) {
      console.log('✅ No projects need fixing!');
      process.exit(0);
    }

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n⚠️  This will set submittedAt to createdAt for projects missing submission dates.');
    rl.question('Continue? (yes/no) ', async (answer) => {
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('❌ Aborted');
        rl.close();
        process.exit(0);
      }

      rl.close();

      // Fix projects
      console.log('\n🔄 Fixing submission dates...\n');
      let successCount = 0;
      let errorCount = 0;

      for (const project of projectsNeedingFix) {
        try {
          await db.collection('buildathonProjects').doc(project.id).update({
            submittedAt: project.createdAt,
          });
          console.log(`✅ Fixed "${project.title}"`);
          successCount++;
        } catch (err) {
          console.error(`❌ Error fixing "${project.title}":`, err.message);
          errorCount++;
        }
      }

      // Summary
      console.log(`\n✨ Fix complete!`);
      console.log(`   ✅ Successful: ${successCount}`);
      if (errorCount > 0) {
        console.log(`   ❌ Failed: ${errorCount}`);
      }

      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
