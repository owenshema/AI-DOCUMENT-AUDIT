require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const emailService = require('./services/emailService');

async function main() {
  console.log('\n Testing SMTP connection...');
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PASSWORD set:', process.env.SMTP_PASSWORD !== 'your-16-char-app-password' ? 'YES' : 'NO');

  const result = await emailService.testConnection();
  console.log('\n Connection test:', JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log('\n Sending test OTP email to owenshema76@gmail.com...');
    try {
      const sent = await emailService.sendLoginOTP('owenshema76@gmail.com', 'Owen Shema', '123456');
      console.log(' Email sent!', sent);
    } catch (e) {
      console.error(' Send failed:', e.message);
    }
  }
}

main().catch(console.error);
