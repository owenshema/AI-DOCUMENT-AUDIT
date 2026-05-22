/**
 * Authentication DTOs
 * Request and response validation objects
 */

class RegisterRequestDTO {
  constructor(email, password, fullName, department, role = 'viewer') {
    this.email = email;
    this.password = password;
    this.fullName = fullName;
    this.department = department;
    this.role = role;
  }

  validate() {
    const errors = [];
    
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Valid email required');
    }
    if (!this.password || this.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!this.fullName || this.fullName.trim() === '') {
      errors.push('Full name required');
    }
    if (!this.department || this.department.trim() === '') {
      errors.push('Department required');
    }
    if (!['viewer', 'document_manager', 'auditor', 'administrator'].includes(this.role)) {
      errors.push('Invalid role');
    }
    
    return errors;
  }
}

class LoginRequestDTO {
  constructor(email, password) {
    this.email = email;
    this.password = password;
  }

  validate() {
    const errors = [];
    
    if (!this.email || this.email.trim() === '') {
      errors.push('Email required');
    }
    if (!this.password || this.password.trim() === '') {
      errors.push('Password required');
    }
    
    return errors;
  }
}

class LoginResponseDTO {
  constructor(user, accessToken, refreshToken) {
    this.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department
    };
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}

class SetupMFARequestDTO {
  constructor(userId, method = 'totp') {
    this.userId = userId;
    this.method = method; // 'totp' or 'sms'
  }

  validate() {
    const errors = [];
    
    if (!this.userId) {
      errors.push('User ID required');
    }
    if (!['totp', 'sms'].includes(this.method)) {
      errors.push('MFA method must be totp or sms');
    }
    
    return errors;
  }
}

class VerifyMFARequestDTO {
  constructor(userId, code) {
    this.userId = userId;
    this.code = code;
  }

  validate() {
    const errors = [];
    
    if (!this.userId) {
      errors.push('User ID required');
    }
    if (!this.code || !/^\d{6}$/.test(this.code)) {
      errors.push('6-digit code required');
    }
    
    return errors;
  }
}

class PasswordResetRequestDTO {
  constructor(email) {
    this.email = email;
  }

  validate() {
    const errors = [];
    
    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Valid email required');
    }
    
    return errors;
  }
}

class PasswordResetDTO {
  constructor(token, newPassword) {
    this.token = token;
    this.newPassword = newPassword;
  }

  validate() {
    const errors = [];
    
    if (!this.token || this.token.trim() === '') {
      errors.push('Reset token required');
    }
    if (!this.newPassword || this.newPassword.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    return errors;
  }
}

module.exports = {
  RegisterRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  SetupMFARequestDTO,
  VerifyMFARequestDTO,
  PasswordResetRequestDTO,
  PasswordResetDTO
};
