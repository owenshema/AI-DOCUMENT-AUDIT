#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '..', 'node_modules', '.cache');

if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('[CSS FIX] Cleared webpack cache:', cacheDir);
} else {
  console.log('[CSS FIX] No webpack cache to clear.');
}
