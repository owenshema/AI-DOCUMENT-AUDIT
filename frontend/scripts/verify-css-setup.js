#!/usr/bin/env node
'use strict';

/**
 * Fails fast if Tailwind/CSS wiring is broken before dev server or production build.
 * Run: npm run verify:css
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const errors = [];

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fail(message) {
  errors.push(message);
}

// 1. index.css must contain Tailwind directives
const indexCss = read('src/index.css');
for (const directive of ['@tailwind base', '@tailwind components', '@tailwind utilities']) {
  if (!indexCss.includes(directive)) {
    fail(`src/index.css is missing "${directive}". Tailwind will not compile.`);
  }
}

// 2. Entry file must import index.css
const entry = exists('src/index.jsx') ? read('src/index.jsx') : read('src/index.js');
if (!entry.includes("import './index.css'") && !entry.includes('import "./index.css"')) {
  fail("src/index.jsx must import './index.css'.");
}

// 3. Tailwind config must exist as tailwind.config.js (CRA 5 convention)
if (!exists('tailwind.config.js')) {
  fail('tailwind.config.js is missing. Do not rename to .cjs — CRA 5 expects tailwind.config.js.');
}

if (exists('tailwind.config.cjs')) {
  fail('Remove tailwind.config.cjs — use tailwind.config.js only to avoid duplicate/conflicting configs.');
}

// 4. PostCSS config must register tailwindcss + autoprefixer
const postcss = read('postcss.config.js');
if (!postcss.includes('tailwindcss')) {
  fail('postcss.config.js must include the tailwindcss plugin.');
}
if (!postcss.includes('autoprefixer')) {
  fail('postcss.config.js must include the autoprefixer plugin.');
}

// 5. No Tailwind CDN in public HTML (breaks or duplicates compiled styles)
const html = read('public/index.html');
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
if (/cdn\.tailwindcss\.com/i.test(htmlWithoutComments) || /<script[^>]+tailwindcss/i.test(htmlWithoutComments)) {
  fail('public/index.html must not load Tailwind from a CDN. Styles are built from src/index.css.');
}

// 6. Dev dependencies present
const pkg = JSON.parse(read('package.json'));
for (const dep of ['tailwindcss', 'postcss', 'autoprefixer', '@craco/craco']) {
  if (!pkg.devDependencies?.[dep] && !pkg.dependencies?.[dep]) {
    fail(`Missing dependency "${dep}". Run: npm install`);
  }
}

if (errors.length) {
  console.error('\n[CSS SETUP ERROR] Frontend styling is misconfigured:\n');
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  console.error('\nFix the issues above, or run: npm run fix:css\n');
  process.exit(1);
}

console.log('[CSS OK] Tailwind/PostCSS setup verified.');
