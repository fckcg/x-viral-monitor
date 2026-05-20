import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const debugScript = readFileSync(resolve(repo, 'userscript/x-viral-monitor.debug.user.js'), 'utf8');
const releaseScript = readFileSync(resolve(repo, 'userscript/x-viral-monitor.user.js'), 'utf8');

describe('iOS userscript debug build', () => {
  it('is a separate DEBUG userscript and does not replace the release script', () => {
    expect(debugScript).toContain('@name         X Viral Monitor Minimal Badge DEBUG');
    expect(debugScript).toContain('@version      0.1.13-debug.1');
    expect(debugScript).toContain('Debug build for iOS Userscripts');
    expect(releaseScript).toContain('@name         X Viral Monitor Minimal Badge');
    expect(releaseScript).not.toContain('@name         X Viral Monitor Minimal Badge DEBUG');
  });

  it('ships an on-page mobile diagnostics overlay with Eruda loader', () => {
    expect(debugScript).toContain('https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js');
    expect(debugScript).toContain('function installDebugOverlay()');
    expect(debugScript).toContain('function collectDebugMetrics()');
    expect(debugScript).toContain('id = \'xvm-debug-panel\'');
    expect(debugScript).toContain('[data-xvm-debug-eruda]');
    expect(debugScript).toContain('[data-xvm-debug-copy]');
  });

  it('exposes the metrics needed to diagnose iOS badge failures', () => {
    for (const token of [
      'hookInstalled',
      'capturedGraphql',
      'extractedTweets',
      'leaderboardItems',
      'badgeMountAttempts',
      'badgeMounts',
      'badges',
      'articles',
      'lastBadgeReason',
      'lastIgnoredReason',
    ]) {
      expect(debugScript).toContain(token);
    }
  });

  it('logs the critical hook, GraphQL, DOM, and badge paths', () => {
    for (const phrase of [
      'debug userscript boot',
      'fetch hook installed',
      'XHR hook installed',
      'GraphQL response captured by hook',
      'GraphQL message accepted',
      'DOM observers installed',
      'badge mounted',
    ]) {
      expect(debugScript).toContain(phrase);
    }
  });
});
