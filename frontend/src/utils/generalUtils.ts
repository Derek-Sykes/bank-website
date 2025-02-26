// src/utils/generalUtils.ts

/**
 * Capitalizes the first letter of a string.
 * If no string is provided, returns "Guest".
 */
export const capitalize = (name?: string): string =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : "Guest";

// You can add more utility functions here:
export const formatDate = (date: Date): string => {
  // Example formatting: "YYYY-MM-DD"
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// And so on...
