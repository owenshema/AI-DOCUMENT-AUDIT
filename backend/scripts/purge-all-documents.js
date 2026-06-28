'use strict';

/**
 * Delete all documents and related data. Keeps users, policies, and workflows.
 * Usage: node scripts/purge-all-documents.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const {
  Document,
  DocumentAnalysis,
  ComplianceCheck,
  DocumentVersion,
  Task,
  Notification,
  AuditLog,
} = require('../db/models');

const uploadDirs = [
  process.env.UPLOAD_DIR,
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(__dirname, '..', '..', 'uploads'),
].filter(Boolean).map(p => path.resolve(p));

function clearUploadDir(dir) {
  if (!fs.existsSync(dir)) return { dir, removed: 0 };
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
      removed += 1;
    } else {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return { dir, removed };
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    const docCount = await Document.count({ paranoid: false });

    const analysisDeleted = await DocumentAnalysis.destroy({ where: {}, truncate: true, cascade: true, force: true });
    const complianceDeleted = await ComplianceCheck.destroy({ where: {}, truncate: true, cascade: true, force: true });
    const versionsDeleted = await DocumentVersion.destroy({ where: {}, truncate: true, cascade: true, force: true });
    const tasksDeleted = await Task.destroy({ where: {}, truncate: true, cascade: true, force: true });
    const notifDeleted = await Notification.destroy({
      where: { relatedEntityType: 'document' },
      force: true,
    });
    const logsDeleted = await AuditLog.destroy({
      where: { resourceType: 'document' },
      force: true,
    });
    const docsDeleted = await Document.destroy({ where: {}, force: true, truncate: true, cascade: true });

    const clearedDirs = [...new Set(uploadDirs)].map(clearUploadDir);

    console.log('Purge complete:');
    console.log(`  Documents (before):     ${docCount}`);
    console.log(`  Documents deleted:      ${docsDeleted}`);
    console.log(`  Analyses deleted:       ${analysisDeleted}`);
    console.log(`  Compliance checks:      ${complianceDeleted}`);
    console.log(`  Document versions:      ${versionsDeleted}`);
    console.log(`  Tasks:                  ${tasksDeleted}`);
    console.log(`  Document notifications: ${notifDeleted}`);
    console.log(`  Document audit logs:    ${logsDeleted}`);
    clearedDirs.forEach(({ dir, removed }) => {
      console.log(`  Upload files removed:   ${removed} (${dir})`);
    });
    console.log('\nUsers and accounts were kept. You can upload new documents to start fresh.');
  } catch (err) {
    console.error('Purge failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
