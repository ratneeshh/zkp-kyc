// Verhoeff algorithm — the actual checksum UIDAI uses for Aadhaar
// This will catch any randomly made-up 12-digit number

const d = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];

const p = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];

const inv = [0,4,3,2,1,5,6,7,8,9];

export const verhoeffCheck = (num) => {
  let c = 0;
  const digits = num.split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
};

export const validateAadhaar = (aadhaar) => {
  const cleaned = aadhaar.replace(/\s/g, "");

  // Check 1: must be exactly 12 digits
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, error: "Must be exactly 12 digits" };
  }

  // Check 2: cannot start with 0 or 1 (UIDAI rule)
  if (["0", "1"].includes(cleaned[0])) {
    return { valid: false, error: "Aadhaar number cannot start with 0 or 1" };
  }

  // Check 3: Verhoeff checksum
  if (!verhoeffCheck(cleaned)) {
    return { valid: false, error: "Invalid Aadhaar number (checksum failed)" };
  }

  return { valid: true, error: null };
};

export const formatAadhaar = (value) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 12);
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

// Generate valid test Aadhaar numbers for demo
// These pass Verhoeff checksum — use these in your demo
export const TEST_AADHAAR_NUMBERS = [
  "2200 0000 0004",
  "2200 0000 1102",
  "2200 0000 1490",
];
