/**
 * Database Initialization — 5-Module Audit System
 * Tables: users, documents, document_analyses, policies,
 *         compliance_checks, audit_reports, tasks, audit_logs
 */

const { sequelize, User, Document, Policy, ComplianceCheck,
        AuditReport, Task, AuditLog, DocumentAnalysis } = require('./models');

const initializeDatabase = async () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Initializing Database...            ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connected\n');

    console.log('Syncing 8 tables...');
    await sequelize.sync({ alter: true });
    console.log('✓ Tables synced\n');

    await seedInitialData();
    console.log('✓ Database ready\n');
    return true;
  } catch (error) {
    console.error('✗ Database init failed:', error.message);
    return false;
  }
};

const seedInitialData = async () => {
  // Remove old mock/demo users so real system data is not polluted on startup.
  await User.destroy({ where: { email: 'auditor@audit.local' } });

  const adminCredentials = {
    fullName: 'Owen Shema',
    email: 'owenshema76@gmail.com',
    passwordHash: 'Owen@123!',
    department: 'Administration',
    role: 'administrator',
    approvalStatus: 'approved',
    emailVerified: true,
    isActive: true
  };

  const [adminUser, createdAdmin] = await User.findOrCreate({
    where: { email: adminCredentials.email },
    defaults: adminCredentials
  });

  if (!createdAdmin) {
    await adminUser.update({
      fullName: adminCredentials.fullName,
      passwordHash: adminCredentials.passwordHash,
      department: adminCredentials.department,
      role: adminCredentials.role,
      approvalStatus: adminCredentials.approvalStatus,
      emailVerified: adminCredentials.emailVerified,
      isActive: adminCredentials.isActive,
      loginAttempts: 0,
      lockUntil: null
    });
  }

  console.log(`  ${createdAdmin ? 'Created' : 'Updated'} administrator login: owenshema76@gmail.com`);

  // Default compliance policies (supply chain focused)
  const policyExists = await Policy.findOne({ where: { name: 'Supply Chain Invoice Policy' } });
  if (!policyExists) {
    const admin = await User.findOne({ where: { role: 'administrator' } });
    await Policy.bulkCreate([
      {
        name:                 'Supply Chain Invoice Policy',
        description:          'All invoices must include BOL reference, payment terms, and dual authorization for amounts over $10,000',
        policyType:           'organizational',
        version:              '1.0',
        status:               'active',
        regulatoryFrameworks: ['ISO9001', 'SOX'],
        rules: [
          { id: 'p1', name: 'BOL reference required', severity: 'high' },
          { id: 'p2', name: 'Payment terms required', severity: 'medium' },
          { id: 'p4', name: 'Dual auth for >$10k',    severity: 'high' },
        ],
        effectiveDate: new Date(),
        owner: admin?.id || null
      },
      {
        name:                 'Logistics Document Compliance',
        description:          'Shipment documents must include carrier SCAC, weight, pickup/delivery dates, and department assignment',
        policyType:           'regulatory',
        version:              '1.0',
        status:               'active',
        regulatoryFrameworks: ['C-TPAT', 'ISO9001'],
        rules: [
          { id: 'p6', name: 'Carrier SCAC required',   severity: 'medium' },
          { id: 'p3', name: 'Department required',      severity: 'medium' },
          { id: 'p8', name: 'ISO date format required', severity: 'low' },
        ],
        effectiveDate: new Date(),
        owner: admin?.id || null
      },
      {
        name:                 'Data Protection & PII Policy',
        description:          'Documents must not contain unredacted PII. Currency must be stated. Vendor must be on approved list.',
        policyType:           'organizational',
        version:              '1.0',
        status:               'active',
        regulatoryFrameworks: ['GDPR'],
        rules: [
          { id: 'p9',  name: 'Approved vendor list',  severity: 'medium' },
          { id: 'p10', name: 'Currency stated',        severity: 'low' },
        ],
        effectiveDate: new Date(),
        owner: admin?.id || null
      },
    ]);
    console.log('  ✓ 3 supply chain compliance policies created');
  }
};

const dropDatabase = async () => {
  await sequelize.drop();
};

module.exports = { initializeDatabase, seedInitialData, dropDatabase };
