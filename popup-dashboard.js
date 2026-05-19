// === Dashboard view router + Free-card dashboard switches + toast ===
//
// Owns the `<body data-view="...">` state machine that swaps between
// dashboard / rate-filter / activate / advanced. Also wires:
//   - the dashboard Free-features inline switches (Leaderboard / Copy MD)
//     to the underlying chrome.storage.sync feature keys that the legacy
//     advanced-section checkboxes (#feat-leaderboard / #feat-copy-md)
//     also hook. Two-way sync so flipping either stays consistent.
//   - 'Coming soon' Configure stubs → toast.
//   - 3-dot menu in the hero card → switch to advanced view.
//
// popup-pro.js renders the Hero card and emits 'view-activate' /
// 'view-advanced' navigation requests via custom events.

(() => {
  const VIEWS = ['dashboard', 'rate-filter', 'activate', 'advanced'];

  function t(key) {
    try {
      const v = chrome?.i18n?.getMessage?.(key);
      if (v) return v;
    } catch (_) {}
    return key;
  }

  function setView(name) {
    if (!VIEWS.includes(name)) name = 'dashboard';
    document.body.dataset.view = name;
    // Scroll back to top when navigating between views.
    window.scrollTo(0, 0);
  }

  function showToast(msg, ms = 2200) {
    const el = document.getElementById('xvm-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  // === Free-card switches sync ===
  function bindMirrorSwitch(dashId, legacyId, storageKey) {
    const dash   = document.getElementById(dashId);
    const legacy = document.getElementById(legacyId);
    if (!dash || !legacy) return;
    // Initial value comes from chrome.storage.sync (popup.js seeds it too);
    // we mirror legacy → dash on load and dash → storage on change.
    function pull() {
      try {
        chrome.storage.sync.get({ [storageKey]: false }, (items) => {
          const v = !!items[storageKey];
          dash.checked = v;
          if (legacy.checked !== v) legacy.checked = v;
        });
      } catch (_) {}
    }
    pull();
    dash.addEventListener('change', () => {
      legacy.checked = dash.checked;
      try { chrome.storage.sync.set({ [storageKey]: dash.checked }); } catch (_) {}
    });
    legacy.addEventListener('change', () => {
      dash.checked = legacy.checked;
    });
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && storageKey in changes) {
          const v = !!changes[storageKey].newValue;
          dash.checked = v;
          if (legacy.checked !== v) legacy.checked = v;
        }
      });
    } catch (_) {}
  }

  // === Configure links ===
  function wireConfigureLinks() {
    document.querySelectorAll('[data-configure]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.configure;
        if (target === 'rate-filter') {
          setView('rate-filter');
        } else {
          // M2 stubs: color-card / webhook / bark
          showToast(`${t('chipComingSoon')} — ${t('toastM2Hint')}`);
        }
      });
    });
  }

  function wireBackButtons() {
    document.querySelectorAll('[data-view-back]').forEach((btn) => {
      btn.addEventListener('click', () => setView('dashboard'));
    });
  }

  // Listen for navigation requests dispatched by popup-pro.js.
  function wireNavEvents() {
    window.addEventListener('xvm-pro-nav', (ev) => {
      const target = ev?.detail?.view;
      if (target) setView(target);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setView('dashboard');
    wireBackButtons();
    wireConfigureLinks();
    wireNavEvents();
    bindMirrorSwitch('dash-feat-leaderboard', 'feat-leaderboard', 'featureVelocityLeaderboard');
    bindMirrorSwitch('dash-feat-copy-md',    'feat-copy-md',     'featureCopyAsMarkdown');
  });

  // Expose for tests / debugging
  window.__xvmDashboard = { setView, showToast, VIEWS };
})();
