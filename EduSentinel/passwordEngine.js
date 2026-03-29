// ============================================================
// EduSentinel AI — passwordEngine.js
// Password Strength Analyzer (Local, Private, No Storage)
// ============================================================

const COMMON_WEAK_PATTERNS = [
  "123456",
  "password",
  "qwerty",
  "abc123",
];

const REPEATED_SEQUENCE = /(.)\1{3,}/;

function hasUppercase(str)  { return /[A-Z]/.test(str); }
function hasLowercase(str)  { return /[a-z]/.test(str); }
function hasNumbers(str)    { return /[0-9]/.test(str); }
function hasSymbols(str)    { return /[^a-zA-Z0-9]/.test(str); }

function isPredictable(password) {
  const onlyLowercaseAndDigits = /^[a-z]+[0-9]+$|^[0-9]+[a-z]+$/.test(password);
  const dictionaryWordWithDigits = /^[a-zA-Z]{4,}[0-9]{1,4}$/.test(password);
  return onlyLowercaseAndDigits || dictionaryWordWithDigits;
}

function getDiversityScore(password) {
  let score = 0;
  if (hasUppercase(password))  score++;
  if (hasLowercase(password))  score++;
  if (hasNumbers(password))    score++;
  if (hasSymbols(password))    score++;
  return score;
}

export function analyzePassword(password) {
  const WEAK   = { strength: "Weak",   message: "Weak — Avoid using names, birth dates, or simple patterns" };
  const MEDIUM = { strength: "Medium", message: "Good — try making it longer and less predictable" };
  const STRONG = { strength: "Strong", message: "Strong password" };

  if (!password || typeof password !== "string") return WEAK;

  const lower = password.toLowerCase();

  // ── Force Weak: common patterns ──────────────────────────
  if (COMMON_WEAK_PATTERNS.some(p => lower.includes(p))) return WEAK;

  // ── Force Weak: repeated sequences (e.g. "1111", "aaaa") ─
  if (REPEATED_SEQUENCE.test(password)) return WEAK;

  const len       = password.length;
  const diversity = getDiversityScore(password);
  const predictable = isPredictable(password);

  // ── Length < 8 → always Weak ─────────────────────────────
  if (len < 8) return WEAK;

  // ── Length 8–11 ──────────────────────────────────────────
  if (len < 12) {
    if (diversity >= 3 && !predictable) return MEDIUM;
    return WEAK;
  }

  // ── Length 12+ ───────────────────────────────────────────
  if (predictable)    return MEDIUM;
  if (diversity === 4 && !predictable) return STRONG;
  if (diversity === 2) return MEDIUM;

  return WEAK;
}
