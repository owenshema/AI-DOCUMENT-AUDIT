'use strict';

const fs = require('fs');
const path = require('path');

const PDF = path.join(__dirname, '..', 'data', 'training', 'reference', '03-hbl-unique-hybrid.pdf');
const API = 'http://localhost:4000/api';

async function request(method, urlPath, { body, token, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const res = await fetch(API + urlPath, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(180000),
  });

  const raw = await res.text();
  let parsed = raw;
  try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
  return { status: res.status, body: parsed };
}

async function loginAsAuditor() {
  const { User } = require('../db/models');
  const TEST_EMAIL = 'audit-flow@test.local';
  const TEST_PASSWORD = 'Test@123!';

  let auditor = await User.findOne({ where: { email: TEST_EMAIL } });
  if (!auditor) {
    auditor = await User.create({
      fullName: 'Audit Flow Tester',
      email: TEST_EMAIL,
      passwordHash: TEST_PASSWORD,
      department: 'Compliance',
      role: 'auditor',
      approvalStatus: 'approved',
      emailVerified: true,
      isActive: true,
    });
  } else if (auditor.role !== 'auditor' || auditor.approvalStatus !== 'approved') {
    await auditor.update({ role: 'auditor', approvalStatus: 'approved', isActive: true, passwordHash: TEST_PASSWORD });
  }

  const login = await request('POST', '/auth/login', {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (login.status !== 200) {
    throw new Error(`Login failed for ${TEST_EMAIL}: ${JSON.stringify(login.body)}`);
  }

  let otp = login.body.devOTP;
  if (!otp) {
    await auditor.reload();
    otp = auditor.otpCode;
  }
  if (!otp) throw new Error(`No OTP available for ${TEST_EMAIL}`);

  const verified = await request('POST', '/auth/verify-otp', {
    body: { userId: login.body.userId, otp, purpose: 'login' },
  });
  if (verified.status !== 200 || !verified.body.token) {
    throw new Error(`OTP failed: ${JSON.stringify(verified.body)}`);
  }

  return { token: verified.body.token, email: TEST_EMAIL };
}

async function main() {
  console.log('Testing upload + AI audit flow...\n');

  const { token, email } = await loginAsAuditor();
  console.log('✓ Logged in as auditor:', email);

  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(PDF)], { type: 'application/pdf' }), 'test-hbl.pdf');
  formData.append('title', 'Test HBL Audit');
  formData.append('category', 'compliance');
  formData.append('department', 'General');

  const upload = await request('POST', '/documents', { token, formData });
  if (upload.status !== 201 && upload.status !== 200) {
    throw new Error(`Upload failed (${upload.status}): ${JSON.stringify(upload.body)}`);
  }
  const docId = upload.body?.document?.id || upload.body?.id;
  if (!docId) throw new Error('Upload succeeded but no document id returned');
  console.log('✓ Uploaded document:', docId);

  const analyze = await request('POST', `/analysis/${docId}/analyze`, { token, body: {} });
  if (analyze.status !== 200) {
    throw new Error(`Analyze failed (${analyze.status}): ${JSON.stringify(analyze.body)}`);
  }
  console.log('✓ Analysis complete');
  console.log('  compliance_score:', analyze.body?.analysis?.results?.compliance_score ?? analyze.body?.results?.compliance_score);
  console.log('  risk_level:', analyze.body?.analysis?.results?.risk_level ?? analyze.body?.results?.risk_level);
  console.log('\nAll checks passed.');
}

main().catch((err) => {
  console.error('\n✗', err.message);
  process.exit(1);
});
