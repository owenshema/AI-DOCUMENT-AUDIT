/**
 * User Model
 * Handles user registration, authentication, and role-based access
 */

const UserSchema = {
  id: { type: String, unique: true, required: true },
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String },
  employeeId: { type: String, unique: true },
  role: { 
    type: String, 
    enum: ['auditor', 'document_manager', 'administrator', 'viewer'],
    default: 'viewer',
    required: true 
  },
  department: { type: String, required: true },
  passwordHash: { type: String, required: true },
  passwordStrength: { type: String, enum: ['weak', 'medium', 'strong'] },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetTokenExpiry: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date }
};

module.exports = UserSchema;
