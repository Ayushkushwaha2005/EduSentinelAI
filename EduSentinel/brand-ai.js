// ============================================================
// brand-ai.js — TF-IDF + Logistic Regression brand inference
// No external libraries. Browser-compatible.
// ============================================================

let _vocab   = null;
let _idf     = null;
let _model   = null;
let _ready   = false;
let _loading = null;

// ── Public: load model files ──────────────────────────────────
async function loadBrandModel(baseUrl) {
  if (_ready) return;
  if (_loading) return _loading;

  //  FIXED: Always use chrome.runtime.getURL in extension context
  const base = baseUrl
    || (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("")
        : "./");

  _loading = Promise.all([
    fetch(base + "brand-vocab.json").then(r => r.json()),
    fetch(base + "brand-model.json").then(r => r.json()),
  ]).then(([vocabData, modelData]) => {

    _vocab = vocabData.vocab;
    _idf   = new Float64Array(vocabData.idf);

    _model = {
      classes  : modelData.classes,
      coef     : modelData.coef.map(row => new Float64Array(row)),
      intercept: new Float64Array(modelData.intercept),
    };

    _ready = true;
    console.log("[brand-ai] Model loaded successfully.");

  }).catch(err => {
    console.error("[brand-ai] Failed to load model:", err);
    _loading = null;
  });

  return _loading;
}

// ── Public: predict brand from URL ───────────────────────────
async function predictBrand(url) {
  if (!_ready) await loadBrandModel();
  if (!_ready) return null;

  const clean  = _cleanUrl(url);
  const tfVec  = _buildTfIdf(clean);
  const scores = _linearScores(tfVec);
  const probs  = _softmax(scores);

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  return {
    brand     : _model.classes[bestIdx],
    confidence: parseFloat(probs[bestIdx].toFixed(4)),
  };
}

// ── Clean URL ────────────────────────────────────────────────
function _cleanUrl(url) {
  return String(url)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
}

// ── Character n-grams ────────────────────────────────────────
function _charNgrams(text, minN, maxN) {
  const padded = " " + text + " ";
  const counts = {};

  for (let n = minN; n <= maxN; n++) {
    const limit = padded.length - n;
    for (let i = 0; i <= limit; i++) {
      const gram = padded.slice(i, i + n);
      counts[gram] = (counts[gram] || 0) + 1;
    }
  }

  return counts;
}

// ── TF-IDF vector ────────────────────────────────────────────
function _buildTfIdf(cleanUrl) {
  const counts = _charNgrams(cleanUrl, 3, 5);
  const vec    = new Float64Array(_idf.length);

  for (const gram in counts) {
    const idx = _vocab[gram];
    if (idx === undefined) continue;

    const tf = 1 + Math.log(counts[gram]);
    vec[idx] = tf * _idf[idx];
  }

  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }

  return vec;
}

// ── Linear scores ────────────────────────────────────────────
function _linearScores(vec) {
  return _model.classes.map((_, c) => {
    const row = _model.coef[c];
    let s = _model.intercept[c];

    for (let i = 0; i < vec.length; i++) {
      s += row[i] * vec[i];
    }

    return s;
  });
}

// ── Softmax ──────────────────────────────────────────────────
function _softmax(scores) {
  const max  = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max));
  const sum  = exps.reduce((a, b) => a + b, 0);

  return exps.map(e => e / sum);
}

// ============================================================
//  Global export — must run before redirect-guard.js executes
// ============================================================
window.predictBrand   = predictBrand;
window.loadBrandModel = loadBrandModel;

//  FIX: Eager-load the model immediately so it is ready by the
//    time redirect-guard.js calls predictBrand().
loadBrandModel();