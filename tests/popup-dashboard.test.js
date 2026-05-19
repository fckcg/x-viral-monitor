// #45 popup redesign — Tier-Card Dashboard (mock D, locked 2026-05-19).
// Pins structural invariants of the dashboard view, the view-switcher,
// and the Free/Pro feature card markup so the layout cannot silently
// regress to the previous Accordion shape.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const html      = readFileSync(resolve(repo, 'popup.html'),         'utf8');
const dashJs    = readFileSync(resolve(repo, 'popup-dashboard.js'), 'utf8');
const proJs     = readFileSync(resolve(repo, 'src/premium/license/popup-pro.js'), 'utf8');
const bridgeJs  = readFileSync(resolve(repo, 'bridge.js'),          'utf8');
const popupJs   = readFileSync(resolve(repo, 'popup.js'),           'utf8');

describe('#45 popup dashboard structure (mock D)', () => {
  it('body declares data-view + data-tier defaults', () => {
    expect(/<body[^>]*data-view="dashboard"/.test(html),
      'body must default data-view to "dashboard"'
    ).toBe(true);
    expect(/<body[^>]*data-tier="free"/.test(html),
      'body must default data-tier to "free" (fail-closed; popup-pro.js updates)'
    ).toBe(true);
  });

  it('declares the four required views (dashboard / rate-filter / activate / advanced)', () => {
    for (const v of ['view-dashboard', 'view-rate-filter', 'view-activate', 'view-advanced']) {
      expect(new RegExp(`<div class="view ${v}"`).test(html),
        `popup.html must contain <div class="view ${v}">`
      ).toBe(true);
    }
  });

  it('hero card is the rendering target for popup-pro.js', () => {
    // popup-pro.js renders into #xvm-pro-section; in mock D that section
    // is the hero card and lives inside the dashboard view.
    expect(/<section id="xvm-pro-section" class="hero"/.test(html),
      'popup.html must declare <section id="xvm-pro-section" class="hero"> inside the dashboard view'
    ).toBe(true);
  });

  it('dashboard has Free features card + Pro features card', () => {
    expect(/<section class="features-card free"/.test(html),
      'dashboard must contain a .features-card.free section'
    ).toBe(true);
    expect(/<section class="features-card pro"/.test(html),
      'dashboard must contain a .features-card.pro section'
    ).toBe(true);
  });

  it('Pro card lists rate-filter Configure + 3 Coming soon stubs', () => {
    expect(/data-configure="rate-filter"/.test(html),
      'Pro card must have a Configure link for rate-filter'
    ).toBe(true);
    const proSection = html.match(/<section class="features-card pro"[\s\S]*?<\/section>/)?.[0] || '';
    const soonChips = (proSection.match(/class="chip soon"/g) || []).length;
    expect(soonChips).toBeGreaterThanOrEqual(3); // color-card, webhook, bark
  });

  it('uses lucide-style inline SVG sprite (no external icon deps)', () => {
    expect(/<symbol id="icon-star"/.test(html)).toBe(true);
    expect(/<symbol id="icon-sparkles"/.test(html)).toBe(true);
    expect(/<symbol id="icon-more"/.test(html)).toBe(true);
    expect(/<symbol id="icon-arrow-left"/.test(html)).toBe(true);
  });

  it('dark shadcn tokens declared on :root', () => {
    expect(/--bg:\s*#020617/.test(html), 'slate-950 bg').toBe(true);
    expect(/--surface:\s*#0f172a/.test(html), 'slate-900 surface').toBe(true);
    expect(/--accent:\s*#06b6d4/.test(html), 'cyan-500 accent').toBe(true);
    expect(/--orange:\s*#f97316/.test(html), 'orange-500 trial color').toBe(true);
  });

  it('keeps all legacy controls (advanced drawer hosts them, IDs preserved)', () => {
    // popup.js + popup-rate-filter.js + popup-color-card.js depend on
    // these IDs. They live in view-advanced now but must still be there.
    for (const id of ['settings-form', 'trending', 'viral', 'badge-style', 'reset',
                      'feat-leaderboard', 'feat-copy-md', 'feat-starchart',
                      'feat-bookmark-count', 'lb-count', 'lb-col-list',
                      'lb-reset-pos', 'lb-reset-msg',
                      'grok-template-select', 'grok-prompt', 'grok-prompt-save',
                      'grok-article-template-select', 'grok-article-prompt',
                      'rate-filter-section']) {
      expect(new RegExp(`id="${id}"`).test(html), `popup.html must keep id="${id}"`).toBe(true);
    }
  });

  it('dashboard inline switches use new dash-* IDs (so legacy IDs stay sync-only)', () => {
    expect(/id="dash-feat-leaderboard"/.test(html),
      'dashboard leaderboard switch must use id="dash-feat-leaderboard"'
    ).toBe(true);
    expect(/id="dash-feat-copy-md"/.test(html),
      'dashboard copy-md switch must use id="dash-feat-copy-md"'
    ).toBe(true);
  });

  it('loads tier-logic.js → popup-pro.js → popup-rate-filter.js → popup.js → popup-dashboard.js in order', () => {
    const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts).toEqual([
      'src/premium/license/tier-logic.js',
      'src/premium/license/popup-pro.js',
      'src/premium/rate-filter/popup-rate-filter.js',
      'popup.js',
      'popup-dashboard.js',
    ]);
  });
});

describe('#45 popup-dashboard.js view router', () => {
  it('exposes a setView function gated by VIEWS whitelist', () => {
    expect(/function\s+setView\s*\(/.test(dashJs)).toBe(true);
    expect(/VIEWS\s*=\s*\[\s*['"]dashboard['"]\s*,\s*['"]rate-filter['"]\s*,\s*['"]activate['"]\s*,\s*['"]advanced['"]\s*\]/.test(dashJs)).toBe(true);
  });

  it('Configure links route through data-configure="rate-filter" → view-rate-filter', () => {
    expect(/data-configure["']\s*\]\.forEach/.test(dashJs)
      || /\[data-configure\]/.test(dashJs)
    ).toBe(true);
    expect(/setView\(\s*['"]rate-filter['"]\s*\)/.test(dashJs)).toBe(true);
  });

  it('Coming-soon stubs surface a toast (M2 hint)', () => {
    expect(/showToast/.test(dashJs)).toBe(true);
    expect(/toastM2Hint/.test(dashJs)).toBe(true);
  });

  it('back buttons return to dashboard', () => {
    expect(/data-view-back/.test(dashJs)).toBe(true);
    expect(/setView\(\s*['"]dashboard['"]\s*\)/.test(dashJs)).toBe(true);
  });

  it('listens for xvm-pro-nav custom events from popup-pro.js', () => {
    expect(/xvm-pro-nav/.test(dashJs)).toBe(true);
  });

  it('mirrors dashboard switches to legacy advanced toggles + storage keys', () => {
    expect(/bindMirrorSwitch\(['"]dash-feat-leaderboard['"]\s*,\s*['"]feat-leaderboard['"]\s*,\s*['"]featureVelocityLeaderboard['"]\)/.test(dashJs)
    ).toBe(true);
    expect(/bindMirrorSwitch\(['"]dash-feat-copy-md['"]\s*,\s*['"]feat-copy-md['"]\s*,\s*['"]featureCopyAsMarkdown['"]\)/.test(dashJs)
    ).toBe(true);
  });
});

describe('#45 popup-pro.js hero-card rendering', () => {
  it('uses hero CSS classes (not legacy xvm-pro-banner)', () => {
    expect(/className\s*=\s*['"]hero-head['"]/.test(proJs)).toBe(true);
    expect(/className\s*=\s*['"]hero-tier['"]/.test(proJs)).toBe(true);
    expect(/className\s*=\s*['"]hero-cta-row['"]/.test(proJs)
      || /className\s*=\s*['"]hero-cta\b/.test(proJs)
    ).toBe(true);
  });

  it('renders big tier label TRIAL / FREE / PRO (uppercase)', () => {
    expect(/['"]TRIAL['"]/.test(proJs)).toBe(true);
    expect(/['"]FREE['"]/.test(proJs)).toBe(true);
    expect(/['"]PRO['"]/.test(proJs)).toBe(true);
  });

  it('emits xvm-pro-nav events for activate + advanced navigation', () => {
    expect(/xvm-pro-nav/.test(proJs)).toBe(true);
    expect(/detail:\s*\{\s*view:\s*['"]activate['"]\s*\}/.test(proJs)).toBe(true);
    expect(/detail:\s*\{\s*view:\s*['"]advanced['"]\s*\}/.test(proJs)).toBe(true);
  });

  it('Pro path uses .hero-pro-meta block + Manage subscription CTA', () => {
    expect(/hero-pro-meta/.test(proJs)).toBe(true);
    expect(/proManageBtn/.test(proJs)).toBe(true);
  });

  it('writes document.body.dataset.tier so :root tier-color rules apply', () => {
    expect(/document\.body\.dataset\.tier\s*=\s*tier/.test(proJs)).toBe(true);
  });
});

describe('#45 i18n keys for dashboard layout', () => {
  it('en + zh_CN locales declare every new dashboard / hero key', () => {
    const en = JSON.parse(readFileSync(resolve(repo, '_locales/en/messages.json'), 'utf8'));
    const zh = JSON.parse(readFileSync(resolve(repo, '_locales/zh_CN/messages.json'), 'utf8'));
    const required = [
      'heroTrialDaysLeft', 'heroTrialDayOne', 'heroProActive', 'heroFreeTagline',
      'heroCtaUpgradeAnnual', 'heroCtaUpgradeMonthly', 'heroActivateExistingLink',
      'cardFreeFeaturesTitle', 'cardProFeaturesTitle', 'cardProFeaturesSub',
      'featureBadgeLabel', 'featureLeaderboardLabel', 'featureCopyMdLabel',
      'featureRateFilterLabel', 'featureColorCardLabel', 'featureWebhookLabel', 'featureBarkLabel',
      'chipEnabled', 'chipComingSoon', 'btnConfigure', 'btnBack', 'btnCancel',
      'footerPoweredBy', 'toastM2Hint', 'activateTitle',
      'advBadgeThresholdsTitle', 'advLeaderboardTitle', 'advOtherFeaturesTitle',
      'advGrokShortTitle', 'advGrokArticleTitle',
    ];
    for (const k of required) {
      expect(en[k]?.message, `en must declare ${k}`).toBeTruthy();
      expect(zh[k]?.message, `zh_CN must declare ${k}`).toBeTruthy();
    }
  });
});

describe('#45 carry-over invariants from prior pivots', () => {
  it('leaderboard default ON (bridge + popup mirror)', () => {
    expect(/featureVelocityLeaderboard:\s*true/.test(bridgeJs)).toBe(true);
    expect(/featureVelocityLeaderboard:\s*true/.test(popupJs)).toBe(true);
  });
});
