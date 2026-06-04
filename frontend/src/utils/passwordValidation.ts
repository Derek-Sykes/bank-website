export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include at least one letter and one number.";

export const validatePassword = (password: string) => {
  const hasMinimumLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasMinimumLength && hasLetter && hasNumber
    ? null
    : PASSWORD_REQUIREMENTS_MESSAGE;
};
