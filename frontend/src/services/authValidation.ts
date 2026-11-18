export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmationCode?: string;
}

export function validateEmail(email: string) {
  const normalized = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? undefined : 'Enter a valid email address.';
}

export function validateLoginForm(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignupForm(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = 'Enter your name.';
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.';
  }
  return errors;
}
