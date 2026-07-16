/**
 * Replace common non-blue accent classes with blue equivalents across pages.
 * Keeps dark:/light contrast by preferring blue-* utilities.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const skip = new Set(['utils/uiTheme.js']);

const pairs = [
  [/bg-emerald-500/g, 'bg-blue-600'],
  [/hover:bg-emerald-600/g, 'hover:bg-blue-700'],
  [/text-emerald-400/g, 'text-blue-400'],
  [/text-emerald-300/g, 'text-blue-300'],
  [/text-emerald-200/g, 'text-blue-200'],
  [/text-emerald-100/g, 'text-blue-100'],
  [/text-emerald-700/g, 'text-blue-700'],
  [/text-emerald-800/g, 'text-blue-800'],
  [/border-emerald-500\/\d+/g, 'border-blue-400/30'],
  [/border-emerald-200/g, 'border-blue-200'],
  [/bg-emerald-500\/\d+/g, 'bg-blue-500/15'],
  [/bg-emerald-50/g, 'bg-blue-50'],
  [/bg-emerald-100/g, 'bg-blue-100'],

  [/bg-amber-500/g, 'bg-blue-600'],
  [/hover:bg-amber-600/g, 'hover:bg-blue-700'],
  [/text-amber-400/g, 'text-blue-400'],
  [/text-amber-300/g, 'text-blue-300'],
  [/text-amber-200/g, 'text-blue-200'],
  [/text-amber-100/g, 'text-blue-100'],
  [/text-amber-700/g, 'text-blue-700'],
  [/text-amber-800/g, 'text-blue-800'],
  [/text-amber-900/g, 'text-blue-900'],
  [/border-amber-500\/\d+/g, 'border-blue-400/30'],
  [/border-amber-200/g, 'border-blue-200'],
  [/bg-amber-500\/\d+/g, 'bg-blue-500/15'],
  [/bg-amber-50/g, 'bg-blue-50'],
  [/bg-amber-100/g, 'bg-blue-100'],

  [/bg-violet-500\/\d+/g, 'bg-blue-500/15'],
  [/bg-violet-50/g, 'bg-blue-50'],
  [/bg-violet-100/g, 'bg-blue-100'],
  [/text-violet-200/g, 'text-blue-200'],
  [/text-violet-300/g, 'text-blue-300'],
  [/text-violet-700/g, 'text-blue-700'],
  [/text-violet-800/g, 'text-blue-800'],
  [/border-violet-500\/\d+/g, 'border-blue-400/30'],
  [/border-violet-200/g, 'border-blue-200'],

  [/bg-indigo-500/g, 'bg-blue-600'],
  [/bg-indigo-600/g, 'bg-blue-600'],
  [/hover:bg-indigo-600/g, 'hover:bg-blue-700'],
  [/hover:bg-indigo-500/g, 'hover:bg-blue-500'],
  [/text-indigo-400/g, 'text-blue-400'],
  [/text-indigo-300/g, 'text-blue-300'],
  [/text-indigo-200/g, 'text-blue-200'],
  [/text-indigo-600/g, 'text-blue-600'],
  [/text-indigo-700/g, 'text-blue-700'],
  [/text-indigo-800/g, 'text-blue-800'],
  [/border-indigo-500\/\d+/g, 'border-blue-400/30'],
  [/border-indigo-200/g, 'border-blue-200'],
  [/border-indigo-100/g, 'border-blue-100'],
  [/bg-indigo-500\/\d+/g, 'bg-blue-500/15'],
  [/bg-indigo-50/g, 'bg-blue-50'],
  [/bg-indigo-100/g, 'bg-blue-100'],

  [/bg-\[#111318\]/g, 'bg-[#122a45]'],
  [/bg-\[#0d0f14\]/g, 'bg-[#0b1a2e]'],
  [/bg-\[#1a1d24\]/g, 'bg-[#122a45]'],
  [/bg-\[#0f0f0f\]/g, 'bg-[#0b1a2e]'],
  [/bg-\[#212121\]/g, 'bg-[#122a45]'],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(jsx|js|css)$/.test(name)) out.push(p);
  }
  return out;
}

let filesChanged = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (skip.has(rel)) continue;
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const [re, to] of pairs) s = s.replace(re, to);
  if (s !== orig) {
    fs.writeFileSync(file, s);
    filesChanged++;
    console.log('updated', rel);
  }
}
console.log('files changed:', filesChanged);
