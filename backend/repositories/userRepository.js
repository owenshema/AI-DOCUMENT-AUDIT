/**
 * User Repository
 * Data access layer for User model
 */

const db = require('../db/models');
const { User } = db;

class UserRepository {
  async findById(userId) {
    return await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] }
    });
  }

  async findByIdWithPassword(userId) {
    return await User.findByPk(userId);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async create(userData) {
    const { email, password, passwordHash, fullName, department, role } = userData;
    return await User.create({
      email,
      passwordHash: passwordHash || password,
      fullName,
      department,
      role
    });
  }

  async update(userId, updates) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    return await user.update(updates);
  }

  async delete(userId) {
    return await User.destroy({ where: { id: userId } });
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.role) where.role = filters.role;
    if (filters.department) where.department = filters.department;
    
    return await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });
  }

  async findByRole(role) {
    return await User.findAll({
      where: { role },
      attributes: { exclude: ['password'] }
    });
  }

  async updateLastLogin(userId) {
    return await User.update(
      { lastLoginAt: new Date() },
      { where: { id: userId } }
    );
  }

  async setupMFA(userId, mfaMethod, mfaSecret) {
    return await User.update(
      { mfaEnabled: true, mfaMethod, mfaSecret },
      { where: { id: userId } }
    );
  }

  async disableMFA(userId) {
    return await User.update(
      { mfaEnabled: false, mfaMethod: null, mfaSecret: null },
      { where: { id: userId } }
    );
  }
}

module.exports = new UserRepository();
