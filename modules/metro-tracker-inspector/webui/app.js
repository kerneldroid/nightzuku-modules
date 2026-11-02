/**
 * Metro Tracker Inspector - Main Application Controller (`app.js`)
 * Author: kerneldroid [Official]
 *
 * Non-blocking, hardware-adaptive controller for Nightzuku WebUI bridge.
 * Passes package lists and chunks via CLI arguments / environment variables
 * (never waiting on stdin pipe EOF) to eliminate process hangs on Android.
 */

import {
  TRACKER_SIGNATURES,
  analyzePackageForensics
} from './trackers-db.js';

if (typeof window !== 'undefined' && window.NightzukuGuard) {
  try {
    window.NightzukuGuard.enforce({ minApiVersion: 2 });
  } catch (err) {
    console.error('NightzukuGuard blocked execution:', err);
  }
}

const DEFAULT_CONFIG = {
  scanAllAtOnce: true,
  packageScope: 'user',
  workers: 'auto',
  deepDex: true,
  scanComponents: true,
  scanNativeLibs: true,
  scanPermissions: true,
  skipCleanApps: false,
  palette: 'm3-violet-dark',
  exportPath: '/sdcard/Download/metro_tracker_report.json'
};

const state = {
  config: { ...DEFAULT_CONFIG },
  envInfo: null,
  hardware: {
    cores: 4,
    totalRamMb: 4096,
    tier: 'BALANCED',
    recommendedWorkers: 3,
    recommendedBatch: 8
  },
  installedPackages: [],
  selectedPackages: new Set(),
  scanResults: [],
  isScanning: false,
  abortRequested: false,
  lastSavedPath: null,
  lastScanTimestamp: null
};

// --- BRIDGE EXECUTION ---

function getBridge() {
  return (typeof window !== 'undefined' && (window.Nightzuku || window.Shizuku)) || null;
}

function execShell(command, options = null) {
  const bridge = getBridge();
  if (!bridge) {
    throw new Error('Nightzuku WebUI shell bridge is not available.');
  }
  const raw = options
    ? bridge.execWithOptions(String(command), JSON.stringify(options))
    : bridge.exec(String(command));
  return JSON.parse(raw);
}

// Yield cleanly so Android WebView repaints progress and handles touch events
function yieldUiFrame() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => setTimeout(resolve, 24));
    } else {
      setTimeout(resolve, 24);
    }
  });
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function showToast(message, durationMs = 2800) {
  const el = document.getElementById('metroToast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('visible');
  }, durationMs);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- NAVIGATION & CONFIG ---

function switchPivot(pivotId) {
  document.querySelectorAll('.metro-pivot-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pivot === pivotId);
  });
  document.querySelectorAll('.metro-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === `pane-${pivotId}`);
  });
}

function getEffectiveWorkers() {
  if (state.config.workers === 'auto') {
    return Number(state.hardware.recommendedWorkers) || 3;
  }
  return Math.max(1, Math.min(4, Number(state.config.workers) || 2));
}

function getEffectiveUiChunkSize() {
  const workers = getEffectiveWorkers();
  return Math.max(2, workers * 2);
}

function applyConfigToUi() {
  const c = state.config;
  document.documentElement.setAttribute('data-palette', c.palette || 'm3-violet-dark');

  const setCheck = (id, lblId, val) => {
    const input = document.getElementById(id);
    const lbl = document.getElementById(lblId);
    if (input) input.checked = Boolean(val);
    if (lbl) lbl.textContent = val ? 'On' : 'Off';
  };

  setCheck('cfgScanAllAtOnce', 'lblScanAllAtOnce', c.scanAllAtOnce);
  setCheck('cfgSkipCleanApps', 'lblSkipCleanApps', c.skipCleanApps);
  setCheck('cfgDeepDex', 'lblDeepDex', c.deepDex);
  setCheck('cfgScanComponents', 'lblScanComponents', c.scanComponents);
  setCheck('cfgScanNativeLibs', 'lblScanNativeLibs', c.scanNativeLibs);
  setCheck('cfgScanPermissions', 'lblScanPermissions', c.scanPermissions);

  const scopeSel = document.getElementById('cfgPackageScope');
  if (scopeSel) scopeSel.value = c.packageScope;

  const workersSel = document.getElementById('cfgWorkers');
  if (workersSel) workersSel.value = String(c.workers || 'auto');

  const palSel = document.getElementById('cfgPalette');
  if (palSel) palSel.value = c.palette;

  const pathInp = document.getElementById('cfgExportPath');
  if (pathInp) pathInp.value = c.exportPath;

  const layers = [];
  if (c.scanComponents) layers.push('Components');
  if (c.deepDex) layers.push('DEX');
  if (c.scanNativeLibs) layers.push('Native .so');
  if (c.scanPermissions) layers.push('Permissions');

  const subtext = document.getElementById('tileScanSubtext');
  const footerMode = document.getElementById('tileScanFooterMode');
  const workers = getEffectiveWorkers();

  if (subtext) {
    subtext.textContent = `${layers.join(' + ') || 'Basic'} • ${workers} CPU worker(s)`;
  }
  if (footerMode) {
    footerMode.textContent = c.scanAllAtOnce
      ? `Scope: All ${c.packageScope.toUpperCase()} Apps`
      : `Scope: ${state.selectedPackages.size} Selected`;
  }
}

function readConfigFromUi() {
  state.config = {
    scanAllAtOnce: document.getElementById('cfgScanAllAtOnce').checked,
    packageScope: document.getElementById('cfgPackageScope').value,
    workers: document.getElementById('cfgWorkers').value,
    deepDex: document.getElementById('cfgDeepDex').checked,
    scanComponents: document.getElementById('cfgScanComponents').checked,
    scanNativeLibs: document.getElementById('cfgScanNativeLibs').checked,
    scanPermissions: document.getElementById('cfgScanPermissions').checked,
    skipCleanApps: document.getElementById('cfgSkipCleanApps').checked,
    palette: document.getElementById('cfgPalette').value,
    exportPath:
      document.getElementById('cfgExportPath').value.trim() ||
      DEFAULT_CONFIG.exportPath
  };
  applyConfigToUi();
  try {
    localStorage.setItem('metro_tracker_cfg', JSON.stringify(state.config));
  } catch (_) {}
}

function persistConfigToDevice() {
  readConfigFromUi();
  try {
    execShell('sh "$MODDIR/scripts/scanner.sh" --save-config', {
      timeoutSeconds: 10,
      env: { CONFIG_PAYLOAD: JSON.stringify(state.config, null, 2) }
    });
    showToast('Config saved.');
  } catch (err) {
    showToast('Saved locally.');
  }
}

// --- PACKAGE LIST & SELECTOR ---

async function refreshInstalledPackages() {
  const scope = state.config.packageScope || 'user';
  try {
    const res = execShell(`sh "$MODDIR/scripts/scanner.sh" --list-packages ${scope}`, {
      timeoutSeconds: 30
    });
    const lines = String(res.stdout || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch (_) {}
    }

    state.installedPackages = parsed;
    if (state.selectedPackages.size === 0) {
      parsed.forEach((p) => state.selectedPackages.add(p.package));
    }

    document.getElementById('metricInstalledTotal').textContent = `${parsed.length} total`;
    renderPackageSelector();
    applyConfigToUi();
    return parsed;
  } catch (err) {
    showToast('Package list error: ' + err.message);
    return [];
  }
}

function renderPackageSelector() {
  const grid = document.getElementById('pkgSelectorGrid');
  const query = (document.getElementById('searchPkgSelectorInput')?.value || '')
    .trim()
    .toLowerCase();

  const filtered = state.installedPackages.filter((item) =>
    item.package.toLowerCase().includes(query)
  );

  document.getElementById('pkgSelectorCaption').textContent =
    `${filtered.length} of ${state.installedPackages.length} packages (${state.selectedPackages.size} selected)`;
  document.getElementById('btnScanSelectedPkgs').textContent =
    `Scan Selected (${state.selectedPackages.size})`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="metro-empty-state" style="grid-column:1/-1;">No matching packages.</div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((item) => {
      const isSel = state.selectedPackages.has(item.package);
      return `
        <div class="metro-pkg-check-item ${isSel ? 'selected' : ''}" data-pkg="${escapeHtml(item.package)}">
          <div class="metro-pkg-left">
            <div class="metro-check-box">${isSel ? '✓' : ''}</div>
            <div style="overflow:hidden;">
              <div style="font-size:12px;color:var(--md-sys-color-on-surface);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">
                ${escapeHtml(item.package)}
              </div>
              <div style="font-size:10px;color:var(--md-sys-color-on-surface-variant);">
                ${item.isSystem ? 'System' : 'User'}
              </div>
            </div>
          </div>
          <button class="metro-pkg-one-btn" data-scan-one="${escapeHtml(item.package)}" type="button">Scan</button>
        </div>
      `;
    })
    .join('');

  grid.querySelectorAll('.metro-pkg-check-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-scan-one]')) return;
      const pkg = el.dataset.pkg;
      if (state.selectedPackages.has(pkg)) {
        state.selectedPackages.delete(pkg);
      } else {
        state.selectedPackages.add(pkg);
      }
      renderPackageSelector();
      applyConfigToUi();
    });
  });

  grid.querySelectorAll('[data-scan-one]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const singlePkg = btn.dataset.scanOne;
      switchPivot('scanner');
      runDeepScan([singlePkg]);
    });
  });
}

// --- HARDWARE-ADAPTIVE DEEP SCANNER ---

function setScanProgress(percent, title, detail, active = true) {
  const topBar = document.getElementById('topProgress');
  const topFill = document.getElementById('topProgressFill');
  const mainFill = document.getElementById('scanProgressBar');
  const statusTitle = document.getElementById('scanStatusTitle');
  const statusPct = document.getElementById('scanStatusPercent');
  const statusDetail = document.getElementById('scanStatusDetail');

  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (topBar) topBar.classList.toggle('active', active);
  if (topFill) topFill.style.width = `${clamped}%`;
  if (mainFill) mainFill.style.width = `${clamped}%`;
  if (statusTitle) statusTitle.textContent = title;
  if (statusPct) statusPct.textContent = `${clamped}%`;
  if (statusDetail && detail) statusDetail.textContent = detail;
}

async function runDeepScan(explicitPackageList = null) {
  if (state.isScanning) {
    state.abortRequested = true;
    return;
  }
  readConfigFromUi();

  state.isScanning = true;
  state.abortRequested = false;
  document.getElementById('appbarRunScan').style.display = 'none';
  document.getElementById('appbarStopScan').style.display = 'inline-flex';
  document.getElementById('tileScanHeadline').textContent = 'Scanning... (Tap to Stop)';
  document.getElementById('tileScanActionHint').textContent = 'STOP';

  try {
    let targetList = [];

    if (Array.isArray(explicitPackageList) && explicitPackageList.length > 0) {
      targetList = explicitPackageList;
    } else {
      setScanProgress(2, 'Loading package list...', 'Querying PackageManager...');
      await yieldUiFrame();

      if (state.installedPackages.length === 0 || state.config.scanAllAtOnce) {
        await refreshInstalledPackages();
      }
      targetList = state.config.scanAllAtOnce
        ? state.installedPackages.map((p) => p.package)
        : Array.from(state.selectedPackages);
    }

    if (targetList.length === 0) {
      showToast('No packages selected.');
      return;
    }

    state.scanResults = [];
    const total = targetList.length;
    const workers = getEffectiveWorkers();
    const uiChunkSize = total === 1 ? 1 : getEffectiveUiChunkSize();

    const envFlags = {
      SCAN_COMPONENTS: state.config.scanComponents ? '1' : '0',
      SCAN_DEX: state.config.deepDex ? '1' : '0',
      SCAN_NATIVE: state.config.scanNativeLibs ? '1' : '0',
      SCAN_PERMS: state.config.scanPermissions ? '1' : '0',
      SCAN_WORKERS: String(workers)
    };

    for (let offset = 0; offset < total; offset += uiChunkSize) {
      if (state.abortRequested) break;

      const chunk = targetList.slice(offset, offset + uiChunkSize);
      const pct = (offset / total) * 100;
      setScanProgress(
        pct,
        `Scanning ${offset + 1}–${Math.min(offset + chunk.length, total)} of ${total} (${workers} workers)...`,
        chunk.join(', ')
      );
      await yieldUiFrame();

      if (state.abortRequested) break;

      // Pass package names safely via arguments & env (never via stdin!)
      const safeArgs = chunk
        .filter((p) => /^[A-Za-z0-9_.$]+$/.test(p))
        .join(' ');

      if (!safeArgs) continue;

      const res = execShell(
        `sh "$MODDIR/scripts/scanner.sh" --scan-batch ${safeArgs}`,
        {
          timeoutSeconds: 60,
          env: envFlags
        }
      );

      const lines = String(res.stdout || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const rawObj = JSON.parse(line);
          const analyzed = analyzePackageForensics(rawObj);
          state.scanResults.push(analyzed);
        } catch (_) {}
      }

      updateDashboardMetrics();
      renderResultsList();
    }

    state.lastScanTimestamp = new Date().toISOString();
    const foundTrackers = getTotalTrackerMatches();
    const appsWithTrackers = getInfectedAppsCount();

    setScanProgress(
      100,
      state.abortRequested
        ? `Stopped (${state.scanResults.length} scanned)`
        : `Completed: ${state.scanResults.length} scanned, ${foundTrackers} trackers in ${appsWithTrackers} apps`,
      `Hardware profile: ${state.hardware.tier} (${state.hardware.cores} cores, ${workers} workers)`,
      false
    );

    updateDashboardMetrics();
    renderResultsList();
    updateJsonPreview();

    // Auto-open details if the user scanned a single package
    if (state.scanResults.length === 1 && !state.abortRequested) {
      openPackageFlyout(state.scanResults[0].package);
    }

    if (state.scanResults.length > 0) {
      await saveReportToDevice(false, true);
    }
  } catch (err) {
    setScanProgress(0, 'Error: ' + err.message, 'Verify Nightzuku is active.', false);
    showToast('Scan error: ' + err.message);
  } finally {
    state.isScanning = false;
    state.abortRequested = false;
    document.getElementById('appbarRunScan').style.display = 'inline-flex';
    document.getElementById('appbarStopScan').style.display = 'none';
    document.getElementById('tileScanHeadline').textContent = 'Start Deep Scan';
    document.getElementById('tileScanActionHint').textContent = 'RUN';
  }
}

// --- METRICS & RESULTS LIST ---

function getTotalTrackerMatches() {
  return state.scanResults.reduce((acc, item) => acc + item.trackerCount, 0);
}

function getInfectedAppsCount() {
  return state.scanResults.filter((item) => item.trackerCount > 0).length;
}

function updateDashboardMetrics() {
  const totalScanned = state.scanResults.length;
  const totalTrackers = getTotalTrackerMatches();
  const infectedApps = getInfectedAppsCount();

  document.getElementById('metricScannedApps').textContent = String(totalScanned);
  document.getElementById('metricTotalTrackers').textContent = String(totalTrackers);
  document.getElementById('metricInfectedApps').textContent = `${infectedApps} apps`;
}

function renderResultsList() {
  const container = document.getElementById('resultsListContainer');
  if (!container) return;

  if (state.scanResults.length === 0) {
    container.innerHTML = `<div class="metro-empty-state">No applications scanned yet. Tap <strong>Start Deep Scan</strong> above or pick a single app in the <strong>packages</strong> tab.</div>`;
    return;
  }

  const query = (document.getElementById('searchResultsInput')?.value || '')
    .trim()
    .toLowerCase();
  const riskFilter = document.getElementById('filterRiskSelect')?.value || 'all';
  const sortMode = document.getElementById('sortResultsSelect')?.value || 'trackers_desc';

  const list = state.scanResults.filter((app) => {
    if (riskFilter === 'tracked' && app.trackerCount === 0) return false;
    if (riskFilter === 'high' && app.riskLevel !== 'CRITICAL' && app.riskLevel !== 'HIGH') return false;
    if (riskFilter === 'clean' && app.trackerCount > 0) return false;

    if (!query) return true;
    if (app.package.toLowerCase().includes(query)) return true;
    if (app.displayName.toLowerCase().includes(query)) return true;
    return app.trackers.some(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.vendor.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
  });

  list.sort((a, b) => {
    if (sortMode === 'trackers_desc') {
      return b.trackerCount - a.trackerCount || b.riskScore - a.riskScore || a.package.localeCompare(b.package);
    }
    if (sortMode === 'risk_desc') {
      return b.riskScore - a.riskScore || b.trackerCount - a.trackerCount;
    }
    return a.package.localeCompare(b.package);
  });

  if (list.length === 0) {
    container.innerHTML = `<div class="metro-empty-state">No applications match your filter.</div>`;
    return;
  }

  container.innerHTML = list
    .map((app) => {
      const chips = app.trackers
        .slice(0, 5)
        .map((t) => `<span class="metro-tracker-chip">${escapeHtml(t.name)}</span>`)
        .join('');
      const extra = app.trackers.length > 5 ? `<span class="metro-badge">+${app.trackers.length - 5}</span>` : '';

      return `
        <div class="metro-app-row" data-pkg-detail="${escapeHtml(app.package)}">
          <div class="metro-risk-bar risk-${escapeHtml(app.riskLevel)}"></div>
          <div class="metro-app-main">
            <div class="metro-app-title-row">
              <span class="metro-app-name">${escapeHtml(app.displayName)}</span>
              <span class="metro-badge">${app.isSystem ? 'SYS' : 'USER'}</span>
              <span class="metro-badge ${app.riskLevel === 'CRITICAL' || app.riskLevel === 'HIGH' ? 'alert' : 'vector'}">
                ${escapeHtml(app.riskLevel)} (${app.riskScore})
              </span>
              <span class="metro-badge">v${escapeHtml(app.versionName)}</span>
            </div>
            <div class="metro-app-pkg">${escapeHtml(app.package)}</div>
            ${app.trackers.length > 0 ? `<div class="metro-app-tags">${chips}${extra}</div>` : ''}
          </div>
          <div class="metro-app-metric">
            <div class="metro-app-count ${app.trackerCount === 0 ? 'zero' : ''}">${app.trackerCount}</div>
            <div class="metro-app-count-label">trackers</div>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.metro-app-row').forEach((row) => {
    row.addEventListener('click', () => openPackageFlyout(row.dataset.pkgDetail));
  });
}

function openPackageFlyout(packageName) {
  const app = state.scanResults.find((item) => item.package === packageName);
  if (!app) return;

  const flyout = document.getElementById('flyoutContent');
  const backdrop = document.getElementById('appDetailBackdrop');

  const trackersHtml =
    app.trackers.length === 0
      ? `<div class="metro-empty-state">0 trackers found in manifest components, DEX bytecode, or native libraries.</div>`
      : app.trackers
          .map(
            (t) => `
          <div class="metro-config-block" style="margin-bottom:8px;border-left:4px solid var(--md-sys-color-primary);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <strong>${escapeHtml(t.name)}</strong>
              <span class="metro-badge vector">${escapeHtml(t.category)}</span>
            </div>
            <div style="font-size:11px;color:var(--md-sys-color-on-surface-variant);margin:3px 0 6px 0;">
              ${escapeHtml(t.vendor)} • Vectors: ${escapeHtml(t.vectors.join(', '))}
            </div>
            <div style="font-family:monospace;font-size:11px;background:var(--md-sys-color-surface-container-lowest);padding:6px 8px;word-break:break-all;">
              ${t.evidence.map((ev) => `<div>• ${escapeHtml(ev)}</div>`).join('')}
            </div>
          </div>
        `
          )
          .join('');

  const permsHtml =
    app.permissions.length === 0
      ? `<div class="metro-empty-state">No tracking permissions declared.</div>`
      : app.permissions
          .map(
            (p) => `
          <div style="padding:7px 10px;background:var(--md-sys-color-surface-container-low);border:1px solid var(--md-sys-color-outline-variant);margin-bottom:5px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;">
              <strong>${escapeHtml(p.shortName)}</strong>
              <span class="metro-badge">+${p.riskWeight}</span>
            </div>
            <div style="font-family:monospace;font-size:10px;color:var(--md-sys-color-primary);margin-top:2px;">${escapeHtml(p.permission)}</div>
          </div>
        `
          )
          .join('');

  flyout.innerHTML = `
    <h2 style="margin:0;font-weight:200;font-size:26px;">${escapeHtml(app.displayName)}</h2>
    <div style="font-family:monospace;font-size:11px;color:var(--md-sys-color-primary);margin-bottom:12px;">
      ${escapeHtml(app.package)} • v${escapeHtml(app.versionName)} (${escapeHtml(app.versionCode)})
    </div>

    <div class="metro-tile-grid" style="grid-template-columns:repeat(2,1fr);grid-auto-rows:84px;margin-bottom:12px;">
      <div class="metro-tile tile-primary" style="cursor:default;">
        <div class="tile-big-number" style="font-size:30px;">${app.trackerCount}</div>
        <div class="tile-footer"><span>trackers</span></div>
      </div>
      <div class="metro-tile tile-tertiary" style="cursor:default;">
        <div class="tile-big-number" style="font-size:30px;">${app.riskScore}/100</div>
        <div class="tile-footer"><span>risk: ${escapeHtml(app.riskLevel)}</span></div>
      </div>
    </div>

    <div class="metro-config-block" style="margin-bottom:12px;font-size:11px;">
      Components: <strong>${app.rawVectors.componentCount}</strong> •
      DEX / Modules: <strong>${app.rawVectors.dexSignatureCount}</strong> •
      Native .so: <strong>${app.rawVectors.nativeLibCount}</strong> •
      Meta Keys: <strong>${app.rawVectors.metaKeyCount}</strong>
    </div>

    <div class="metro-section-title">detected trackers (${app.trackers.length})</div>
    ${trackersHtml}

    <div class="metro-section-title" style="margin-top:14px;">tracking permissions (${app.permissions.length})</div>
    ${permsHtml}
  `;

  backdrop.classList.add('open');
}

// --- JSON EXPORT & SAVE (ZERO STDIN HANG) ---

function buildStructuredJsonReport() {
  const appsForExport = state.config.skipCleanApps
    ? state.scanResults.filter((a) => a.trackerCount > 0)
    : state.scanResults;

  const totalTrackers = getTotalTrackerMatches();
  const infectedApps = getInfectedAppsCount();

  return {
    module: 'metro-tracker-inspector',
    author: 'kerneldroid [Official]',
    generatedAt: state.lastScanTimestamp || new Date().toISOString(),
    device: state.envInfo?.device || {},
    hardware: state.hardware,
    configuration: state.config,
    summary: {
      totalScannedApps: state.scanResults.length,
      exportedApps: appsForExport.length,
      appsWithTrackers: infectedApps,
      cleanApps: Math.max(0, state.scanResults.length - infectedApps),
      totalTrackerDetections: totalTrackers,
      signatureCount: TRACKER_SIGNATURES.length
    },
    applications: appsForExport
  };
}

function updateJsonPreview() {
  const box = document.getElementById('jsonPreviewBox');
  const sizeLbl = document.getElementById('jsonSizeLabel');
  if (!box) return;

  const report = buildStructuredJsonReport();
  const jsonText = JSON.stringify(report, null, 2);
  box.textContent = jsonText;
  if (sizeLbl) {
    sizeLbl.textContent = `${(jsonText.length / 1024).toFixed(1)} KB`;
  }
}

async function saveReportToDevice(switchView = false, silent = false) {
  readConfigFromUi();
  if (state.scanResults.length === 0) {
    if (!silent) showToast('No scan results to save.');
    return;
  }

  const report = buildStructuredJsonReport();
  const jsonString = JSON.stringify(report, null, 2);
  const targetPath = state.config.exportPath || DEFAULT_CONFIG.exportPath;

  try {
    // Encode in 18 KB UTF-8 slices -> base64 CLI args so stdin is never used
    const SLICE_LEN = 18 * 1024;
    const firstB64 = utf8ToBase64(jsonString.slice(0, SLICE_LEN));
    execShell(`sh "$MODDIR/scripts/scanner.sh" --save-report-init "${firstB64}"`, {
      timeoutSeconds: 20
    });

    for (let pos = SLICE_LEN; pos < jsonString.length; pos += SLICE_LEN) {
      const partB64 = utf8ToBase64(jsonString.slice(pos, pos + SLICE_LEN));
      execShell(`sh "$MODDIR/scripts/scanner.sh" --save-report-append "${partB64}"`, {
        timeoutSeconds: 20
      });
    }

    const commitRes = execShell(
      `sh "$MODDIR/scripts/scanner.sh" --save-report-commit "${targetPath}"`,
      { timeoutSeconds: 20 }
    );
    const meta = JSON.parse(commitRes.stdout || '{}');

    state.lastSavedPath = meta.path || targetPath;
    document.getElementById('jsonStatusLabel').textContent = `Saved: ${state.lastSavedPath}`;
    updateJsonPreview();

    if (switchView) switchPivot('json');
    if (!silent) showToast(`Saved to ${state.lastSavedPath}`);
  } catch (err) {
    if (!silent) showToast('Save failed: ' + err.message);
  }
}

function loadSavedReportFromDevice() {
  readConfigFromUi();
  try {
    const res = execShell(
      `sh "$MODDIR/scripts/scanner.sh" --load-report "${state.config.exportPath}"`,
      { timeoutSeconds: 20 }
    );
    if (!res.stdout) throw new Error('Empty response');
    const parsed = JSON.parse(res.stdout);
    if (parsed.ok === false) {
      showToast(parsed.error || 'No saved JSON found.');
      return;
    }

    if (Array.isArray(parsed.applications)) {
      state.scanResults = parsed.applications.map((item) =>
        Array.isArray(item.trackers) ? item : analyzePackageForensics(item)
      );
      state.lastScanTimestamp = parsed.generatedAt || new Date().toISOString();
      updateDashboardMetrics();
      renderResultsList();
      updateJsonPreview();
      setScanProgress(
        100,
        `Loaded saved report (${state.scanResults.length} apps)`,
        `Generated: ${state.lastScanTimestamp}`,
        false
      );
      showToast(`Loaded ${state.scanResults.length} apps.`);
    }
  } catch (err) {
    showToast('Load failed: ' + err.message);
  }
}

// --- INITIALIZATION ---

async function initApp() {
  try {
    const saved = localStorage.getItem('metro_tracker_cfg');
    if (saved) {
      state.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (_) {}

  applyConfigToUi();

  document.querySelectorAll('.metro-pivot-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchPivot(btn.dataset.pivot));
  });

  document.getElementById('tileStartScan').addEventListener('click', () => runDeepScan(null));
  document.getElementById('appbarRunScan').addEventListener('click', () => runDeepScan(null));
  document.getElementById('appbarStopScan').addEventListener('click', () => {
    state.abortRequested = true;
  });

  document.getElementById('tileModeSwitch').addEventListener('click', () => switchPivot('packages'));
  document.getElementById('tileTrackersMetric').addEventListener('click', () => {
    const sel = document.getElementById('filterRiskSelect');
    if (sel) sel.value = sel.value === 'tracked' ? 'all' : 'tracked';
    renderResultsList();
  });

  document.getElementById('appbarSaveJson').addEventListener('click', () => saveReportToDevice(true, false));
  document.getElementById('btnWriteJsonDevice').addEventListener('click', () => saveReportToDevice(false, false));
  document.getElementById('appbarLoadJson').addEventListener('click', () => loadSavedReportFromDevice());
  document.getElementById('btnLoadLastJson').addEventListener('click', () => loadSavedReportFromDevice());

  document.getElementById('btnCopyJsonClipboard').addEventListener('click', async () => {
    updateJsonPreview();
    const text = document.getElementById('jsonPreviewBox').textContent;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard.');
    } catch (_) {
      showToast('Select text in the box to copy.');
    }
  });

  document.getElementById('btnDownloadJsonBlob').addEventListener('click', () => {
    updateJsonPreview();
    const text = document.getElementById('jsonPreviewBox').textContent;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metro_tracker_report.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Download started.');
  });

  document.getElementById('searchResultsInput').addEventListener('input', renderResultsList);
  document.getElementById('filterRiskSelect').addEventListener('change', renderResultsList);
  document.getElementById('sortResultsSelect').addEventListener('change', renderResultsList);

  document.getElementById('searchPkgSelectorInput').addEventListener('input', renderPackageSelector);
  document.getElementById('btnRefreshPackages').addEventListener('click', refreshInstalledPackages);
  document.getElementById('btnSelectAllPkgs').addEventListener('click', () => {
    state.installedPackages.forEach((p) => state.selectedPackages.add(p.package));
    renderPackageSelector();
    applyConfigToUi();
  });
  document.getElementById('btnClearAllPkgs').addEventListener('click', () => {
    state.selectedPackages.clear();
    renderPackageSelector();
    applyConfigToUi();
  });
  document.getElementById('btnScanSelectedPkgs').addEventListener('click', () => {
    if (state.selectedPackages.size === 0) {
      showToast('Select at least 1 package.');
      return;
    }
    switchPivot('scanner');
    runDeepScan(Array.from(state.selectedPackages));
  });

  [
    'cfgScanAllAtOnce',
    'cfgPackageScope',
    'cfgWorkers',
    'cfgSkipCleanApps',
    'cfgDeepDex',
    'cfgScanComponents',
    'cfgScanNativeLibs',
    'cfgScanPermissions',
    'cfgPalette',
    'cfgExportPath'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const prevScope = state.config.packageScope;
        readConfigFromUi();
        if (id === 'cfgPackageScope' && state.config.packageScope !== prevScope) {
          state.selectedPackages.clear();
          refreshInstalledPackages();
        }
      });
    }
  });

  document.getElementById('btnSaveConfig').addEventListener('click', persistConfigToDevice);
  document.getElementById('btnResetConfig').addEventListener('click', () => {
    state.config = { ...DEFAULT_CONFIG };
    applyConfigToUi();
    persistConfigToDevice();
  });

  document.getElementById('btnCloseFlyout').addEventListener('click', () => {
    document.getElementById('appDetailBackdrop').classList.remove('open');
  });
  document.getElementById('appDetailBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'appDetailBackdrop') {
      document.getElementById('appDetailBackdrop').classList.remove('open');
    }
  });

  // Probe hardware & Nightzuku environment
  try {
    const envRes = execShell('sh "$MODDIR/scripts/scanner.sh" --env-info', { timeoutSeconds: 15 });
    if (envRes.stdout) {
      state.envInfo = JSON.parse(envRes.stdout);
      if (state.envInfo.hardware) {
        state.hardware = state.envInfo.hardware;
      }
      const hw = state.hardware;
      const dev = state.envInfo.device || {};
      document.getElementById('hwBadgeLabel').textContent =
        `${dev.model || 'Android'} • ${hw.cores} cores • ${hw.recommendedWorkers} workers (${hw.tier})`;
      const hwHint = document.getElementById('hwConfigHint');
      if (hwHint) {
        hwHint.textContent = `Detected ${hw.cores} CPU cores, ${hw.totalRamMb} MB RAM → Recommended: ${hw.recommendedWorkers} parallel workers (${hw.tier} profile).`;
      }
      applyConfigToUi();
    }
    await refreshInstalledPackages();
  } catch (err) {
    document.getElementById('hwBadgeLabel').textContent = 'Offline / Preview';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
