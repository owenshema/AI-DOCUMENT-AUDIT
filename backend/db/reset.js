/**
 * Database Reset — 5-Module Audit System
 *
 * Drops ALL tables (including legacy ones no longer used),
 * then recreates only the 8 tables needed by the 5 modules.
 */

const { sequelize } = require('./models');

async function resetDatabase() {
  console.log('🔄 Resetting database...\n');

  // Disable FK checks so we can drop in any order
  await sequelize.query("SET session_replication_role = 'replica'");

  // Drop all tables — including legacy ones
  const allTables = [
    'dashboards',
    'document_analyses',
    'document_versions',
    'security_controls',
    'searches',
    'notifications',
    'audit_reports',
    'retention_policies',
    'workflows',
    'tasks',
    'audit_logs',
    'compliance_checks',
    'policies',
    'documents',
    'users',
  ];

  for (const table of allTables) {
    await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    console.log(`  ✓ Dropped: ${table}`);
  }

  // Drop any leftover enum types
  const enumTypes = [
    'enum_users_role', 'enum_users_password_strength',
    'enum_documents_status', 'enum_documents_file_format',
    'enum_documents_category', 'enum_documents_classification_level',
    'enum_tasks_status', 'enum_tasks_priority', 'enum_tasks_approval_decision',
    'enum_compliance_checks_status', 'enum_compliance_checks_check_type',
    'enum_audit_reports_status', 'enum_audit_reports_report_type',
    'enum_audit_logs_status',
  ];
  for (const t of enumTypes) {
    await sequelize.query(`DROP TYPE IF EXISTS "public"."${t}" CASCADE`).catch(() => {});
  }

  await sequelize.query("SET session_replication_role = 'origin'");

  // Recreate only the 8 needed tables
  console.log('\n📊 Creating tables for 5-module system...\n');
  await sequelize.sync({ force: false, alter: false });

  console.log('\n✅ Database reset complete!');
  console.log('Tables: users, documents, document_analyses, policies,');
  console.log('        compliance_checks, audit_reports, tasks, audit_logs\n');
  return true;
}

module.exports = { resetDatabase };
