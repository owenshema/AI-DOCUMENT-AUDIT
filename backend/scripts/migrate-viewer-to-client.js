'use strict';

const { sequelize } = require('../config/database');

(async () => {
  try {
    const [result] = await sequelize.query(
      "UPDATE users SET role = 'client' WHERE role = 'viewer' RETURNING id"
    );
    const count = Array.isArray(result) ? result.length : 0;
    console.log(`Migrated ${count} user(s) from viewer to client.`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
