/* =========================================================
   STATE.js - Global state, constants, DOM references, initialization
   ========================================================= */

const API = '/dbvcs/api';

// ── Global State Variables ────────────────────────────────
let schema = null;
let positions = {};
let activeTable = null;  // simpleClassName of selected table
let searchQuery = '';
let groupBySchema = true;
let groupMode = 'module';   // 'none' | 'module' | 'domain' | 'criticality' | 'tabletype' | 'submodule' | 'lifecycle' | 'sourcesystem'
let sortAsc = true;
let isTableDiagramView = false;  // Track if we're viewing a table-specific diagram

// ── Pan/Zoom State ───────────────────────────────────────
let viewX = 0, viewY = 0, viewScale = 1;
let isPanning = false, panStart = null;

// ── DOM References ───────────────────────────────────────
const versionSelect  = document.getElementById('version-select');
const snapshotDate   = document.getElementById('snapshot-date');
const entityTree     = document.getElementById('entity-tree');
const sidebarSearch  = document.getElementById('sidebar-search');
const wikiContent    = document.getElementById('wiki-content');
const changelogContent = document.getElementById('changelog-content');
const canvas         = document.getElementById('canvas');
const canvasRoot     = document.getElementById('canvas-root');
const toast          = document.getElementById('toast');
const fieldTooltip   = document.getElementById('field-tooltip');
const tooltipFieldName = document.getElementById('tooltip-field-name');
const tooltipFieldType = document.getElementById('tooltip-field-type');
const tooltipFieldDesc = document.getElementById('tooltip-field-desc');

// ── Constants for Canvas Layout ──────────────────────────
const CARD_W          = 240;
const CARD_HEADER_H   = 22;
const ROW_H           = 18;
const MAX_ROWS        = 8;
const CARD_GAP_X      = 20;
const CARD_GAP_Y      = 16;
const COLS_PER_GROUP  = 2;
const GROUP_PAD       = 16;
const GROUP_TITLE_H   = 28;
const GROUP_GAP_X     = 40;
const GROUP_GAP_Y     = 50;

// ── Boot / Initialization ─────────────────────────────────
async function initializeApp() {
  await loadVersionList();
  const latest = versionSelect.value;
  if (latest) await loadVersion(parseInt(latest, 10));
  // Pre-load changelog so Recent Activities in wiki tab is populated
  await loadChangelog();
  // Show system wiki on landing
  renderSystemWiki();
}

// ── Version Loading ──────────────────────────────────────
async function loadVersionList() {
  try {
    const res = await fetch(`${API}/versions`);
    const data = await res.json();
    versionSelect.innerHTML = '';
    [...data.versions].reverse().forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `schema-${v}`;
      if (v === data.latest) opt.selected = true;
      versionSelect.appendChild(opt);
    });
  } catch (e) {
    showToast('Could not reach /dbvcs/api/versions', true);
  }
}

versionSelect.addEventListener('change', () => {
  loadVersion(parseInt(versionSelect.value, 10));
});

async function loadVersion(version) {
  try {
    const res = await fetch(`${API}/versions/${version}`);
    if (!res.ok) { showToast(`Version ${version} not found`, true); return; }
    schema = await res.json();
    positions = {};
    activeTable = null;
    isTableDiagramView = false;  // Reset table diagram flag
    // Reset context chip
    const ctx = document.getElementById('inner-tabbar-context');
    if (ctx) ctx.innerHTML = '';
    renderSidebar();
    autoLayout();
    // Re-render active inner tab at system level
    const activeInner = document.querySelector('.inner-tab-btn.active')?.dataset.innerTab || 'wiki';
    if (activeInner === 'wiki') switchWikiSubTab('overview');
    else if (activeInner === 'diagram') { renderCanvas(); setTimeout(fitAll, 60); }
    snapshotDate.textContent = schema.capturedAt
      ? new Date(schema.capturedAt).toLocaleString()
      : '';
  } catch (e) {
    showToast('Failed to load schema', true);
  }
}

// ── Sidebar Collapse / Expand ─────────────────────────────
(function () {
  const sidebar       = document.getElementById('sidebar');
  const btnCollapse   = document.getElementById('btn-sidebar-toggle');
  const btnExpand     = sidebar.querySelector('.sidebar-expand-btn');

  function collapse() {
    sidebar.classList.add('collapsed');
  }

  function expand() {
    sidebar.classList.remove('collapsed');
  }

  btnCollapse.addEventListener('click', collapse);
  btnExpand.addEventListener('click', expand);
})();

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, error = false) {
  toast.textContent = msg;
  toast.style.borderColor = error ? 'var(--danger)' : 'var(--success)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── Exports ───────────────────────────────────────────────
window.State = {
  schema, positions, activeTable, searchQuery, groupBySchema, sortAsc,
  viewX, viewY, viewScale, isPanning, panStart, isTableDiagramView,
  initializeApp, loadVersion
};
