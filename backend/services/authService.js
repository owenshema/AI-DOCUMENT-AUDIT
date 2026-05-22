/**
 * Authentication Service
 * Business logic for user authentication
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const { RegisterRequestDTO, LoginRequestDTO } = require('../dto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_ACCESS_EXPIRE = '24h';
const JWT_REFRESH_EXPIRE = '7d';

class AuthService {
  async register(registerDTO) {
    // Validate DTO
    const errors = registerDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    // Check if user exists
    const existingUser = await userRepository.findByEmail(registerDTO.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await userRepository.create({
      email: registerDTO.email,
      // User model hook hashes passwordHash on create.
      password: registerDTO.password,
      fullName: registerDTO.fullName,
      department: registerDTO.department,
      role: registerDTO.role || 'viewer'
    });

    // Log registration
    await auditLogRepository.create({
      userId: user.id,
      action: 'user_registered',
      resourceType: 'user',
      resourceId: user.id,
      description: `User registered: ${registerDTO.email}`
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
  }

  async login(loginDTO) {
    // Validate DTO
    const errors = loginDTO.validate();
    if (errors.length > 0) throw new Error(errors.join(', '));

    // Find user
    const user = await userRepository.findByEmail(loginDTO.email);
    if (!user) {
      // Logging should never block auth response when no user exists.
      try {
        await auditLogRepository.create({
          action: 'failed_login',
          description: `Failed login attempt for: ${loginDTO.email}`
        });
      } catch (logError) {
        console.warn('Failed to write anonymous failed_login audit log:', logError.message);
      }
      throw new Error('Invalid credentials');
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil - new Date()) / 60000);
      throw new Error(`Account locked. Try again in ${minutesLeft} minute(s)`);
    }

    // Check password
    const passwordMatch = await bcrypt.compare(loginDTO.password, user.passwordHash);
    if (!passwordMatch) {
      const newAttempts = (user.loginAttempts || 0) + 1;
      const updates = { loginAttempts: newAttempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (newAttempts >= 5) {
        updates.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await userRepository.update(user.id, updates);

      await auditLogRepository.create({
        userId: user.id,
        action: 'failed_login',
        description: `Failed login: incorrect password (attempt ${newAttempts})`
      });
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on success
    await userRepository.update(user.id, { loginAttempts: 0, lockUntil: null });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );

    // Log successful login
    await auditLogRepository.create({
      userId: user.id,
      action: 'successful_login',
      description: `User logged in: ${loginDTO.email}`
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  async setupMFA(userId, method = 'totp') {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Generate MFA secret (simplified - in production use a proper library like speakeasy)
    const mfaSecret = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    await userRepository.setupMFA(userId, method, mfaSecret);

    await auditLogRepository.create({
      userId,
      action: 'mfa_setup',
      description: `MFA setup initiated with method: ${method}`
    });

    return { mfaSecret, method };
  }

  async verifyMFA(userId, code) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // In production, use proper MFA verification
    // This is a simplified version
    const isValid = code.length === 6;

    if (isValid) {
      await auditLogRepository.create({
        userId,
        action: 'mfa_verified',
        description: 'MFA verification successful'
      });
    } else {
      await auditLogRepository.create({
        userId,
        action: 'mfa_failed',
        description: 'MFA verification failed'
      });
    }

    return isValid;
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new Error('User not found');

    // Verify old password
    const passwordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!passwordMatch) throw new Error('Old password is incorrect');

    // User model hook hashes passwordHash on update.
    await userRepository.update(userId, { passwordHash: newPassword });

    await auditLogRepository.create({
      userId,
      action: 'password_changed',
      description: 'User changed password'
    });

    return { success: true };
  }

  async requestPasswordReset(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token (simplified)
    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    await auditLogRepository.create({
      userId: user.id,
      action: 'password_reset_requested',
      description: 'Password reset requested'
    });

    return { resetToken, email: user.email };
  }

  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // User model hook hashes passwordHash on update.
      await userRepository.update(decoded.id, { passwordHash: newPassword });

      await auditLogRepository.create({
        userId: decoded.id,
        action: 'password_reset_completed',
        description: 'Password reset completed'
      });

      return { success: true };
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }

  async verifyEmail(userId) {
    await userRepository.update(userId, { emailVerified: true });

    await auditLogRepository.create({
      userId,
      action: 'email_verified',
      description: 'Email verification completed'
    });

    return { success: true };
  }
}

module.exports = new AuthService();
