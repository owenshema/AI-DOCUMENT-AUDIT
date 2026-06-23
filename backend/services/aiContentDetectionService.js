'use strict';
/**
 * AI Content Detection Service (fully offline heuristic mode)
 * ─────────────────────────────────────────────────────────────────────────────
 * Produces ai_generated_percentage (0-100) without external APIs or API keys.
 *
 * Signals used:
 * - Explicit AI self-reference phrases
 * - LLM-style boilerplate phrase density
 * - Repetition / low-surprisal proxy (duplicate lines + repeated 3-grams)
 * - Sentence burstiness proxy (very uniform sentence lengths)
 * - Lexical diversity proxy (very low type-token ratio)
 *
 * For highly structured/tabular content (e.g., spreadsheets, name lists),
 * authenticity is marked "not assessed" because prose-style AI detection is
 * not meaningful there.
+ */

const AI_THRESHOLD = Number(process.env.AI_CONTENT_THRESHOLD) || 25;
const MAX_CHARS = Number(process.env.AI_DETECT_MAX_CHARS) || 50000;
const MIN_WORDS = 25;

var EXPLICIT_AI_PHRASES = [
  'as an ai',
  'as a language model',
  'as a large language model',
  'i am an ai',
  'i am unable to',
  'i cannot provide',
  'my training data',
  'my knowledge cutoff',
  'openai',
  'chatgpt',
  'artificial intelligence assistant',
];

var LLM_BOILERPLATE_PHRASES = [
  'it is important to note',
  'it is worth noting',
  'in conclusion',
  'in summary',
  'furthermore',
  'moreover',
  'additionally',
  'when it comes to',
  'a wide range of',
  'plays a crucial role',
  'a testament to',
  'delve into',
  'navigating the',
  'realm of',
  'on the other hand',
  'in today',
  'firstly',
  'secondly',
  'thirdly',
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round(n) {
  return Math.round(n);
}

function words(text) {
  return (text || '').toLowerCase().match(/[a-z']+/g) || [];
}

function splitSentences(text) {
  return ((text || '').match(/[^.!?]+[.!?]/g) || [])
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}

function proseSentenceCount(text) {
  return splitSentences(text).filter(function (s) {
    return (s.match(/[a-z']+/gi) || []).length >= 5;
  }).length;
}

function hasExplicitAiPhrase(lower) {
  return EXPLICIT_AI_PHRASES.some(function (p) { return lower.indexOf(p) >= 0; });
}

function tabularScore(text) {
  var t = text || '';
  var lines = t.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
  if (!lines.length) return 0;
  var commaHeavy = lines.filter(function (l) { return (l.match(/,/g) || []).length >= 2; }).length / lines.length;
  var delimHeavy = lines.filter(function (l) { return /[,;\t|]/.test(l); }).length / lines.length;
  var punctuationSentenceRatio = splitSentences(t).length / lines.length;
  return clamp((commaHeavy * 0.45 + delimHeavy * 0.45 + (1 - Math.min(1, punctuationSentenceRatio)) * 0.1), 0, 1);
}

function repeatedLineRatio(text) {
  var lines = (text || '')
    .toLowerCase()
    .split(/\r?\n/)
    .map(function (l) { return l.trim().replace(/\s+/g, ' '); })
    .filter(function (l) { return l.length >= 12; });
  if (lines.length < 4) return 0;
  var seen = {};
  var dupes = 0;
  lines.forEach(function (l) {
    if (seen[l]) dupes += 1;
    seen[l] = (seen[l] || 0) + 1;
  });
  return dupes / lines.length;
}

function repeatedTrigramRatio(tokens) {
  if (!tokens || tokens.length < 12) return 0;
  var grams = {};
  var total = 0;
  for (var i = 0; i <= tokens.length - 3; i++) {
    var g = tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2];
    grams[g] = (grams[g] || 0) + 1;
    total += 1;
  }
  var repeats = 0;
  Object.keys(grams).forEach(function (g) {
    if (grams[g] > 1) repeats += (grams[g] - 1);
  });
  return total ? repeats / total : 0;
}

function lexicalDiversityPenalty(tokens) {
  if (!tokens.length) return 0;
  var uniq = {};
  tokens.forEach(function (w) { uniq[w] = 1; });
  var ttr = Object.keys(uniq).length / tokens.length;
  if (tokens.length >= 160 && ttr < 0.28) return 1;
  if (tokens.length >= 120 && ttr < 0.34) return 0.6;
  if (tokens.length >= 80 && ttr < 0.4) return 0.35;
  return 0;
}

function burstinessPenalty(text) {
  var lens = splitSentences(text)
    .map(function (s) { return (s.match(/[a-z']+/gi) || []).length; })
    .filter(function (n) { return n >= 4; });
  if (lens.length < 4) return 0;
  var mean = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
  if (!mean) return 0;
  var variance = lens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / lens.length;
  var cv = Math.sqrt(variance) / mean;
  if (cv < 0.28) return 1;
  if (cv < 0.38) return 0.55;
  if (cv < 0.5) return 0.25;
  return 0;
}

function boilerplateDensity(lower, tokenCount) {
  if (!tokenCount) return 0;
  var hits = 0;
  LLM_BOILERPLATE_PHRASES.forEach(function (p) {
    if (lower.indexOf(p) >= 0) hits += 1;
  });
  return clamp(hits / Math.max(1, tokenCount / 45), 0, 1);
}

/**
 * Returns a robust heuristic score plus diagnostics.
 */
function heuristicAnalyze(text) {
  var raw = (text || '').trim();
  var lower = raw.toLowerCase();
  var tokenList = words(raw);
  var tokenCount = tokenList.length;
  var explicit = hasExplicitAiPhrase(lower);

  if (raw.length < 80 || tokenCount < MIN_WORDS) {
    return {
      assessable: false,
      score: null,
      detail: 'Not enough readable text to assess authenticity.',
      signals: {},
    };
  }

  var proseCount = proseSentenceCount(raw);
  var tableLike = tabularScore(raw);
  if (proseCount < 3 && !explicit && tableLike > 0.6) {
    return {
      assessable: false,
      score: null,
      detail: 'Structured/tabular content detected; prose-style AI authorship cannot be reliably assessed offline.',
      signals: {
        prose_sentences: proseCount,
        tabular_likelihood: round(tableLike * 100),
      },
    };
  }

  var explicitScore = explicit ? 1 : 0;
  var boilerplate = boilerplateDensity(lower, tokenCount);
  var lineRep = repeatedLineRatio(raw);
  var trigramRep = repeatedTrigramRatio(tokenList);
  var repetition = clamp(lineRep * 0.55 + trigramRep * 0.45, 0, 1);
  var burstiness = burstinessPenalty(raw);
  var lexical = lexicalDiversityPenalty(tokenList);

  var weighted =
    explicitScore * 0.42 +
    boilerplate * 0.22 +
    repetition * 0.18 +
    burstiness * 0.1 +
    lexical * 0.08;

  // Small confidence boost on longer prose (more reliable signal).
  if (tokenCount >= 250 && proseCount >= 6) weighted += 0.04;
  if (tokenCount < 70) weighted -= 0.08;

  var score = clamp(round(weighted * 100), 0, 98);

  return {
    assessable: true,
    score: score,
    detail:
      'Offline heuristic estimate: ' + score +
      '% likely AI-generated (signals: explicit=' + round(explicitScore * 100) +
      ', boilerplate=' + round(boilerplate * 100) +
      ', repetition=' + round(repetition * 100) +
      ', burstiness=' + round(burstiness * 100) +
      ', lexical=' + round(lexical * 100) + ').',
    signals: {
      explicit: round(explicitScore * 100),
      boilerplate: round(boilerplate * 100),
      repetition: round(repetition * 100),
      burstiness: round(burstiness * 100),
      lexical: round(lexical * 100),
      prose_sentences: proseCount,
      tabular_likelihood: round(tableLike * 100),
      token_count: tokenCount,
    },
  };
}

/**
 * @param {string} rawText document text
 * @returns {Promise<{ai_generated_percentage:number|null, ai_threshold_exceeded:boolean,
 *   assessed:boolean, source:string, threshold:number, detail:string, signals?:Object}>}
 */
async function detectAiContent(rawText) {
  var clipped = (rawText || '').slice(0, MAX_CHARS);
  var base = { threshold: AI_THRESHOLD };
  var h = heuristicAnalyze(clipped);

  if (!h.assessable) {
    return Object.assign({}, base, {
      assessed: false,
      source: 'heuristic',
      ai_generated_percentage: null,
      ai_threshold_exceeded: false,
      detail: h.detail,
      signals: h.signals,
    });
  }

  return Object.assign({}, base, {
    assessed: true,
    source: 'heuristic',
    ai_generated_percentage: h.score,
    ai_threshold_exceeded: h.score > AI_THRESHOLD,
    detail: h.detail,
    signals: h.signals,
  });
}

function heuristicScore(text) {
  var h = heuristicAnalyze(text);
  return h.assessable ? h.score : 0;
}

function hasApiKey() {
  return false;
}

module.exports = {
  detectAiContent: detectAiContent,
  heuristicScore: heuristicScore,
  heuristicAnalyze: heuristicAnalyze,
  hasApiKey: hasApiKey,
  AI_THRESHOLD: AI_THRESHOLD,
};
