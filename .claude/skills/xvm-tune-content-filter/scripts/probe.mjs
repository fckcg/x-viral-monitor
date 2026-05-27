#!/usr/bin/env node
// Exhaustively classify every reply + every author identity inside a
// sample dump and flag (a) spam-looking text that the current rules
// let through and (b) bios that look like adult-funnel templates but
// didn't HIDE. Designed for ad-hoc clipboard JSON fragments — uses
// regex extraction so partial JSON works.
//
// Usage:
//   node .claude/skills/xvm-tune-content-filter/scripts/probe.mjs <sample-path>
//
// Run from the repo root so it can read rules.json + filter.js.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const samplePath = process.argv[2];
if (!samplePath) {
  console.error('Usage: probe.mjs <sample-path>');
  process.exit(2);
}

const raw = readFileSync(samplePath, 'utf8');
const rules = JSON.parse(readFileSync(resolve('src/premium/content-filter/rules.json'), 'utf8'));
const filterJs = readFileSync(resolve('src/premium/content-filter/filter.js'), 'utf8');

const win = {
  location: { pathname: '/abc/status/1' },
  addEventListener() {},
  postMessage() {},
  __xvmContentFilterBuiltinRules: rules,
  __xvmNet: { onResponse() {} },
  __xvmPro: { isFeatureEnabled: () => true, onTierChange() {} },
};
const ctx = {
  window: win,
  document: {
    documentElement: { appendChild() {} },
    getElementById: () => null,
    createElement: () => ({ id: '', style: {}, dataset: {}, appendChild() {}, addEventListener() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  MutationObserver: class { observe() {} disconnect() {} },
  setTimeout,
  URL,
  console,
};
vm.runInNewContext(filterJs, ctx);
const api = win.__xvmContentFilter;
api.updateSettings({ enabled: true, level: 'standard', whitelistFollowing: false });

// Extract every JSON-string `"full_text": "..."` despite embedded \n etc.
function extractStrings(field) {
  const re = new RegExp(`"${field}":\\s*"((?:\\\\.|[^"\\\\])*)"`, 'g');
  const out = [];
  for (const m of raw.matchAll(re)) {
    out.push(m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return out;
}

const replies = extractStrings('full_text');

// Author identity: group descriptions by their surrounding tweet block
// is fiddly with regex; instead grab every distinct (screen_name,
// description, location) tuple by walking the raw text in order.
function extractAuthors() {
  const out = [];
  const seen = new Set();
  // Match "screen_name": "...", maintain pointer, then look ahead for
  // the nearest description / location in that block.
  const reUser = /"screen_name":\s*"([^"]*)"/g;
  const reDesc = /"description":\s*"((?:\\.|[^"\\])*)"/g;
  const reLoc  = /"location":\s*"((?:\\.|[^"\\])*)"/g;
  const reName = /"name":\s*"((?:\\.|[^"\\])*)"/g;
  const users = [...raw.matchAll(reUser)].map((m) => ({ handle: m[1], idx: m.index }));
  const descs = [...raw.matchAll(reDesc)].map((m) => ({ desc: m[1].replace(/\\n/g, '\n'), idx: m.index }));
  const locs  = [...raw.matchAll(reLoc)].map((m) => ({ loc: m[1], idx: m.index }));
  const names = [...raw.matchAll(reName)].map((m) => ({ name: m[1], idx: m.index }));
  for (const u of users) {
    const nearestAfter = (arr) => arr.filter((x) => x.idx > u.idx).sort((a, b) => a.idx - b.idx)[0];
    const nearestBefore = (arr) => arr.filter((x) => x.idx < u.idx).sort((a, b) => b.idx - a.idx)[0];
    const desc = (nearestAfter(descs) || nearestBefore(descs))?.desc || '';
    const loc  = (nearestAfter(locs)  || nearestBefore(locs))?.loc || '';
    const name = (nearestBefore(names) || nearestAfter(names))?.name || '';
    const key = `${u.handle}|${desc.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ handle: u.handle, name, bio: desc, location: loc });
  }
  return out;
}

const authors = extractAuthors();

// Heuristic: text patterns that strongly suggest spam. If matches and
// classify() didn't hide, we surface it for rule-writer attention.
const SPAM_TEXT = /✈️|打✈|sao货|主页能打|没人比.{0,4}sao|比她.{0,4}(sao|骚)|(太|真|很|超).{0,2}涩了|涩到顶不住|sao爆|骚爆|顶不住.{0,4}(她|想|要)|30\+.{0,8}(sao|骚|涩|[反返]差)|体制内.{0,12}(sao|骚|涩|[反返]差)|sao的很|骚的很|玩.{0,2}的就是[反返]差|🗜|🧙|😫|👷|福利(资源|视频|姬|群)/i;

const SPAM_BIO = /曰炮|曰[pP]平台|约炮平台|真人认证|小号已禁言|附近.{0,4}加[vV微]|🔞.{0,30}(性|约|联系|主页|加我)|性癖|盗图死全家|全网仅此一号|无门无电报|bbw.{0,8}(bi|tomboy|virgin)|全网[独首][创发家].{0,16}(线下|社交|约|匹配)|一至五线|免费约[pP]|附近.{0,4}速配|资源.{0,4}牵线|靠谱.{0,2}中介|社交.{0,4}匹配.{0,4}平台|电报.{0,12}(频道|群|资源|福利)|t\.me/i;

console.log(`Sample: ${samplePath}`);
console.log(`Replies: ${replies.length}  |  Unique authors: ${authors.length}\n`);

let textMiss = 0;
console.log('=== Reply content scan ===');
for (const c of replies) {
  const r = api._debug.classify({
    id: 'r', content: c, urls: [],
    author: { handle: 'a', name: 'N', bio: '', location: '' },
  });
  const looksSpam = SPAM_TEXT.test(c);
  if (r.hide) {
    console.log('🔴', (r.matches.map((m) => m.id).join(',') || '-').padEnd(34), c.slice(0, 70).replace(/\n/g, ' ↵ '));
  } else if (looksSpam) {
    textMiss++;
    console.log('⚠️  MISS                              ', c.slice(0, 70).replace(/\n/g, ' ↵ '));
  } else {
    console.log('🟢 PASS                              ', c.slice(0, 70).replace(/\n/g, ' ↵ '));
  }
}
console.log(`\nText misses: ${textMiss}\n`);

let bioMiss = 0;
console.log('=== Author identity scan ===');
for (const a of authors) {
  const r = api._debug.classify({
    id: 'a', content: '', urls: [],
    author: a,
  });
  const looksSpamBio = SPAM_BIO.test(a.bio) || SPAM_BIO.test(a.name) || SPAM_BIO.test(a.location);
  if (r.hide) {
    console.log('🔴', (r.matches.map((m) => m.id).join(',') || '-').padEnd(34), `@${a.handle} | ${a.bio.slice(0, 50).replace(/\n/g, ' ↵ ')}`);
  } else if (looksSpamBio) {
    bioMiss++;
    console.log('⚠️  MISS                              ', `@${a.handle}`);
    console.log('    name:', a.name);
    console.log('    bio :', a.bio.slice(0, 140).replace(/\n/g, ' ↵ '));
    console.log('    loc :', a.location);
  }
}
console.log(`\nBio misses: ${bioMiss}`);
console.log(`\nTotal flagged: ${textMiss + bioMiss}`);
