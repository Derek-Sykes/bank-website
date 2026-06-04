export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include at least one letter and one number.";

export function validatePassword(password) {
  if (typeof password !== "string") {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }

  const hasMinimumLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasMinimumLength || !hasLetter || !hasNumber) {
    return PASSWORD_REQUIREMENTS_MESSAGE;
  }

  return null;
}
