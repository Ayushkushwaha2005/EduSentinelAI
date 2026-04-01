// ============================================================
// EduSentinel AI — threat_detection_engine (Chrome Extension)
// ============================================================

// ── Model weights ────────────────────────────────────────────
const MODEL = {
 weights  : [9.78652963772951, -1.330851348518506, 14.868353672534727, -4.4410990080970825, 3.5371309173046783, -0.4736775311380786],
 bias     : 3.7627108616189995,
  threshold: 0.7,
  features : ["url_length", "num_dots", "num_digits", "has_https", "num_special_chars", "entropy"],
};

// ──  ADD: SCALER VALUES (from Colab) ───────────────────────
const SCALER_MEAN = [35.36695434593609, 2.257142857142857, 1.886172310693611, 0.7805339383786764, 0.5169956954133887, 3.960896156463825];

const SCALER_SCALE = [41.2142589388822, 0.922676146549369, 11.893076454886907, 0.41388489875517164, 3.4950174855590648, 0.3153848483627673];

// ── Shannon entropy ─────────────────────────────────────────
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  const n = str.length;
  return -Object.values(freq).reduce((sum, c) => {
    const p = c / n;
    return sum + p * Math.log2(p);
  }, 0);
}

// ── Feature extraction ──────────────────────────────────────
function extractFeatures(url) {

  //  REMOVE QUERY PARAMS (MAIN FIX)
  url = url.split('?')[0];

  const urlLength   = url.length;
  const numDots     = (url.match(/\./g) || []).length;
  const numDigits   = (url.match(/\d/g) || []).length;
  const hasHttps    = url.toLowerCase().startsWith("https") ? 1 : 0;
  const numSpecial  = (url.match(/[@\-_=%&]/g) || []).length;
  const entropy     = shannonEntropy(url);

  return [urlLength, numDots, numDigits, hasHttps, numSpecial, entropy];
}

// ──  ADD: Scaling function ────────────────────────────────
function applyScaling(features) {
  return features.map((val, i) => (val - SCALER_MEAN[i]) / SCALER_SCALE[i]);
}

// ── Sigmoid ────────────────────────────────────────────────
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// ── Main prediction ─────────────────────────────────────────
function predict(url) {
  let features = extractFeatures(url);

  //  MAIN FIX
  features = applyScaling(features);

  const rawScore  = features.reduce(
    (sum, feat, i) => sum + feat * MODEL.weights[i],
    MODEL.bias
  );

  const probability = sigmoid(rawScore);
  const isPhishing  = probability >= MODEL.threshold;

  return {
    label      : isPhishing ? "phishing" : "benign",
    probability: parseFloat(probability.toFixed(4)),
    isPhishing,
  };
}