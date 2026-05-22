/**
 * Database Reset and Sync Test
 * Run this to reset the database and restart the server
 */

const { sequelize } = require('./db/models');
const { resetDatabase } = require('./db/reset');

async function main() {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log('✓ Database connection successful\n');
    
    // Reset database
    await resetDatabase();
    
    console.log('All done! Database is ready.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
