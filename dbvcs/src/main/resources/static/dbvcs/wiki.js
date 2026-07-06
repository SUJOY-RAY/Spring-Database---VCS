/* =========================================================
   WIKI.js - Wiki page rendering, entity details, metadata panels
   ========================================================= */

// ── Inner Tab Switching ───────────────────────────────────
function switchInnerTab(name) {
  document.querySelectorAll('.inner-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.innerTab === name);
  });
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');

  if (name === 'diagram') {
    if (activeTable) renderTableDiagram(activeTable);
    else { autoLayout(); renderCanvas(); setTimeout(fitAll, 60); }
  }
  if (name === 'changelog') {
    if (changelogData) renderChangelog();
    else loadChangelog();
  }
  if (name === 'wiki') {
    if (activeTable) {
      const entity = schema && schema.entities.find(e => e.simpleClassName === activeTable);
      if (entity) renderWikiPage(entity);
    } else {
      // Show overview sub-tab when no table selected
      switchWikiSubTab('overview');
    }
  }
}

document.querySelectorAll('.inner-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchInnerTab(btn.dataset.innerTab));
});

// ── Wiki Sub-Tab Switching ───────────────────────────────
function switchWikiSubTab(subtabName) {
  document.querySelectorAll('.wiki-subtab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.wikiSubtab === subtabName);
  });
  
  if (activeTable) {
    // If table is selected, ignore sub-tabs and show the table details
    return;
  }

  if (subtabName === 'overview') {
    renderSystemWikiOverview();
  } else if (subtabName === 'all-tables') {
    renderSystemWikiAllTables();
  }
}

document.querySelectorAll('.wiki-subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchWikiSubTab(btn.dataset.wikiSubtab));
});

// ── Table Selection ───────────────────────────────────────
function selectTable(name) {
  activeTable = name;
  const entity = schema.entities.find(e => e.simpleClassName === name);
  if (!entity) return;

  // Hide wiki sub-tabs when a table is selected
  const subtabbar = document.querySelector('.wiki-subtabbar');
  if (subtabbar) subtabbar.style.display = 'none';

  // Update context chip in the inner tabbar
  const ctx = document.getElementById('inner-tabbar-context');
  if (ctx) {
    ctx.innerHTML = `
      <span class="itb-sep">/</span>
      <span class="itb-chip">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        ${entity.tableName}
        <button class="itb-clear" onclick="clearSelection()" title="Back to system view">✕</button>
      </span>`;
  }

  // Re-render whichever inner tab is currently active
  const activeInner = document.querySelector('.inner-tab-btn.active')?.dataset.innerTab || 'wiki';
  if (activeInner === 'wiki') renderWikiPage(entity);
  else if (activeInner === 'diagram') renderTableDiagram(name);
  else if (activeInner === 'changelog') renderTableChangelog(entity);
}

function clearSelection() {
  activeTable = null;
  isTableDiagramView = false;  // Reset table diagram flag
  // Clear sidebar highlight
  document.querySelectorAll('.table-item').forEach(i => i.classList.remove('open'));
  document.querySelectorAll('.table-item-header').forEach(h => h.classList.remove('active'));
  // Clear context chip
  const ctx = document.getElementById('inner-tabbar-context');
  if (ctx) ctx.innerHTML = '';
  // Show wiki sub-tabs again
  const subtabbar = document.querySelector('.wiki-subtabbar');
  if (subtabbar) subtabbar.style.display = '';
  // Re-render active inner tab at system level
  const activeInner = document.querySelector('.inner-tab-btn.active')?.dataset.innerTab || 'wiki';
  if (activeInner === 'wiki') switchWikiSubTab('overview');
  else if (activeInner === 'diagram') { 
    // Force complete canvas clear and redraw the global ER diagram
    if (canvasRoot) {
      canvasRoot.innerHTML = '';
    }
    // Reset positions to force full layout recalculation
    positions = {};
    // Reset view transform to ensure we're not stuck in a table-specific view
    viewX = 0; 
    viewY = 0; 
    viewScale = 1;
    autoLayout(); 
    renderCanvas(); 
    setTimeout(() => {
      // Apply transform to ensure proper positioning
      applyTransform();
      fitAll();
    }, 100); 
  }
  else if (activeInner === 'changelog') renderChangelog();
}

// ── Wiki Page Rendering ───────────────────────────────────
function renderWikiPage(entity) {
  const fields = entity.fields || [];
  const relations = entity.relations || [];
  const schemaName = deriveSchema(entity);
  const tags = entity.tags || [];
  const tableDesc = entity.comment
    ? entity.comment
    : `Stores information about each ${entity.tableName.replace(/_/g, ' ').replace(/s$/, '')} record in the system.`;

  let html = '';

  // Breadcrumb
  html += `<div class="wiki-breadcrumb">
    <a onclick="clearSelection()">schemas</a>
    <span>/</span>
    <span>${schemaName}</span>
    <span>/</span>
    <span class="table-icon-inline">□</span>
    <span>${entity.tableName}</span>
  </div>`;

  // Deprecated banner
  if (entity.deprecated) {
    const since = (entity.metadata || {})['deprecatedSince.version'] || '';
    const replacement = (entity.metadata || {})['deprecatedSince.replacement'] || '';
    html += `<div class="wiki-deprecated-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>This table is <strong>deprecated</strong>${since ? ' since version ' + escapeHtml(since) : ''}.${replacement ? ' Use <strong>' + escapeHtml(replacement) + '</strong> instead.' : ''}</span>
    </div>`;
  }

  // Page header with table name, description, and db table name
  html += `<div class="wiki-page-header">
    <div class="wiki-page-title">
      <div class="wiki-table-icon">${escapeHtml(entity.simpleClassName.charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h1 style="margin:0;font-size:18px;font-weight:700;color:var(--text)">${escapeHtml(entity.simpleClassName)}</h1>
          ${entity.deprecated ? `<span style="font-size:10px;color:var(--danger);font-weight:700;letter-spacing:0.05em">DEPRECATED</span>` : ''}
        </div>
        <p style="font-size:13px;color:var(--text-light);margin:4px 0 6px 0">${tableDesc}</p>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <code style="font-size:11px;color:var(--text-muted);font-family:var(--mono,monospace);background:var(--surface2);border:1px solid var(--border);display:inline-block;padding:2px 8px;border-radius:3px">DB: ${escapeHtml(entity.tableName)}</code>
          <span style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text-muted)">${fields.length} fields</span>
          <span style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text-muted)">${relations.length} relations</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:var(--success,#16a34a);display:inline-block"></span>Last updated: just now</span>
        </div>
      </div>
    </div>
  </div>`;

  // Tabs for metadata, fields, and table references
  html += `<div class="wiki-tabs-container">
    <div class="wiki-tabs-nav">
      <button class="wiki-tab-btn active" data-wiki-tab="metadata">Metadata</button>
      <button class="wiki-tab-btn" data-wiki-tab="fields">Fields</button>
      ${relations.length > 0 ? `<button class="wiki-tab-btn" data-wiki-tab="references">Table References</button>` : ''}
    </div>

    <!-- Metadata Tab -->
    <div class="wiki-tab-content active" id="wiki-tab-metadata">
      ${(() => {
        const entityMeta = entity.metadata || {};
        if (Object.keys(entityMeta).length > 0) {
          return buildEntityMetaPanel(entityMeta);
        }
        return '<p style="color:var(--text-muted);font-size:13px">No metadata annotations present.</p>';
      })()}
    </div>

    <!-- Fields Tab -->
    <div class="wiki-tab-content" id="wiki-tab-fields">
      <div class="fields-table-wrap">
        ${buildFieldsTable(entity)}
      </div>
    </div>

    <!-- Table References Tab -->
    ${relations.length > 0 ? `<div class="wiki-tab-content" id="wiki-tab-references">
      <div class="table-refs-diagram">
        <div id="mini-svg-${entity.simpleClassName}"></div>
      </div>
    </div>` : ''}
  </div>`;

  // Recent activity as footer
  html += buildActivitySection(entity);

  wikiContent.innerHTML = html;

  // Wire up tab switching
  wikiContent.querySelectorAll('.wiki-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.wikiTab;
      // Remove active from all buttons
      wikiContent.querySelectorAll('.wiki-tab-btn').forEach(b => b.classList.remove('active'));
      // Add active to clicked button
      this.classList.add('active');
      // Hide all content
      wikiContent.querySelectorAll('.wiki-tab-content').forEach(t => t.classList.remove('active'));
      // Show selected content
      const selectedTab = document.getElementById(`wiki-tab-${tabName}`);
      if (selectedTab) selectedTab.classList.add('active');
    });
  });

  // Render mini diagram if relations exist
  if (relations.length > 0) {
    setTimeout(() => renderMiniDiagram(entity), 50);
  }

  // Wire up relation links
  wikiContent.querySelectorAll('.ref-link[data-target]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = schema.entities.find(en => en.simpleClassName === a.dataset.target);
      if (target) selectTable(target.simpleClassName);
    });
  });
}

// ── Entity Metadata Panel ─────────────────────────────────
function buildEntityMetaPanel(meta) {
  const allRows = [
    // Business
    row(meta, 'module.name',        'Module'),
    row(meta, 'submodule',          'Submodule'),
    row(meta, 'domain',             'Domain'),
    row(meta, 'purpose.value',      'Purpose'),
    row(meta, 'criticality',        'Criticality'),
    row(meta, 'type',               'Type'),
    // Ownership
    row(meta, 'businessOwner',  'Business Owner'),
    row(meta, 'technicalOwner', 'Technical Owner'),
    row(meta, 'dataSteward',    'Data Steward'),
    // Table Classification
    row(meta, 'masterData',            'Master Data'),
    row(meta, 'transactionalData',     'Transactional'),
    row(meta, 'lookupTable',           'Lookup Table'),
    row(meta, 'referenceData',         'Reference Data'),
    // Integration
    row(meta, 'sourceSystem', 'Source System'),
    row(meta, 'integration',  'Integration'),
    row(meta, 'derivedFrom',  'Derived From'),
    row(meta, 'derived.expression','Expression'),
    // Data Classification
    row(meta, 'classification',  'Classification'),
    row(meta, 'accessLevel',     'Access Level'),
    // Privacy & Compliance
    row(meta, 'pii',              'PII'),
    row(meta, 'piiCategory', 'PII Category'),
    row(meta, 'spd',              'Sensitive Data'),
    row(meta, 'containsChildrenData', 'Children Data'),
    row(meta, 'lawfulBasis', 'Lawful Basis'),
    row(meta, 'consentRequired',  'Consent Required'),
    row(meta, 'legalHold',        'Legal Hold'),
    // Security
    row(meta, 'encryption', 'Encryption'),
    row(meta, 'masking',     'Masking'),
    // Lifecycle
    row(meta, 'retention',          'Retention'),
    row(meta, 'lifecycle',          'Lifecycle Stage'),
    row(meta, 'deprecatedSince.version', 'Deprecated Since'),
    // Operations
    row(meta, 'refreshFrequency', 'Refresh Frequency'),
    row(meta, 'updateStrategy',   'Update Strategy'),
    row(meta, 'versioned',        'Versioned'),
    row(meta, 'auditable',        'Auditable'),
    row(meta, 'auditColumns.createdBy', 'Audit: createdBy'),
    row(meta, 'auditColumns.updatedBy', 'Audit: updatedBy'),
    row(meta, 'auditColumns.createdAt', 'Audit: createdAt'),
    row(meta, 'auditColumns.updatedAt', 'Audit: updatedAt'),
    // Data Quality
    row(meta, 'dataQuality.rules', 'Quality Rules'),
    row(meta, 'dataQualityLevel',  'Quality Level'),
    // API
    row(meta, 'apiExposed', 'API Exposed'),
    row(meta, 'publicApi',  'Public API'),
    // Notes
    row(meta, 'remarks', 'Remarks'),
  ];

  const populatedRows = allRows.filter(r => r !== null);

  if (populatedRows.length === 0) return '<p style="color:var(--text-muted);font-size:13px">No metadata annotations present.</p>';

  let html = `<table class="meta-table" style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden">
    <thead style="background:var(--surface2);border-bottom:1px solid var(--border)">
      <tr>
        <th style="text-align:left;padding:8px 12px;font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;width:200px">Attribute</th>
        <th style="text-align:left;padding:8px 12px;font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Value</th>
      </tr>
    </thead>
    <tbody>`;

  // Keys that carry boolean-like yes/no semantics
  const boolTrueKeys  = new Set(['pii','spd','masterData','transactionalData','lookupTable','referenceData','versioned','auditable','apiExposed','publicApi','consentRequired','legalHold','containsChildrenData']);
  const boolFalseOk   = new Set(['pii','spd','consentRequired','legalHold']);

  // Keys that map to colour-coded badges
  const critMap = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' };
  const lifecycleMap = { ACTIVE: 'success', DEPRECATED: 'danger', ARCHIVED: 'muted', LEGACY: 'warning' };
  const entityTypeMap = {
    MASTER:        ['rgba(34,197,94,.10)',  '#16a34a', 'rgba(34,197,94,.30)'],
    TRANSACTIONAL: ['rgba(59,130,246,.10)', '#2563eb', 'rgba(59,130,246,.30)'],
    DIMENSIONAL:   ['rgba(168,85,247,.10)', '#9333ea', 'rgba(168,85,247,.30)'],
    AGGREGATE:     ['rgba(249,115,22,.10)', '#ea580c', 'rgba(249,115,22,.30)'],
    STAGING:       ['rgba(245,158,11,.10)', '#d97706', 'rgba(245,158,11,.30)'],
    AUDIT:         ['rgba(239,68,68,.10)',  '#dc2626', 'rgba(239,68,68,.30)'],
    REFERENCE:     ['rgba(6,182,212,.10)',  '#0891b2', 'rgba(6,182,212,.30)']
  };

  const classificationMap = {
    PUBLIC:        ['rgba(34,197,94,.10)',  '#16a34a', 'rgba(34,197,94,.30)'],
    INTERNAL:      ['rgba(59,130,246,.10)', '#2563eb', 'rgba(59,130,246,.30)'],
    CONFIDENTIAL:  ['rgba(249,115,22,.10)', '#ea580c', 'rgba(249,115,22,.30)'],
    RESTRICTED:    ['rgba(239,68,68,.10)',  '#dc2626', 'rgba(239,68,68,.30)'],
    SECRET:        ['rgba(168,85,247,.10)', '#9333ea', 'rgba(168,85,247,.30)']
  };
  
  function metaValueHtml(label, value) {
    const v = value.trim();
    const vUp = v.toUpperCase();

    // Boolean true
    if (v === 'true') {
      const isDanger = boolTrueKeys.has(label.toLowerCase().replace(/\s/g,'')) && ['pii','spd','legalhold','consentRequired','containschildrendata'].includes(label.toLowerCase().replace(/\s/g,''));
      const [bg, color, border] = isDanger
        ? ['rgba(239,68,68,0.10)', '#ef4444', 'rgba(239,68,68,0.3)']
        : ['rgba(34,197,94,0.10)', '#16a34a', 'rgba(34,197,94,0.3)'];
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${bg};color:${color};border:1px solid ${border}">✓ Yes</span>`;
    }

    // Boolean false
    if (v === 'false') {
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:var(--surface2);color:var(--text-muted);border:1px solid var(--border)">✕ No</span>`;
    }

    // Criticality
    if (critMap[vUp]) {
      const [bg, col, brd] = {
        success: ['rgba(34,197,94,0.10)', '#16a34a', 'rgba(34,197,94,0.3)'],
        warning: ['rgba(245,158,11,0.10)', '#d97706', 'rgba(245,158,11,0.3)'],
        danger:  ['rgba(239,68,68,0.12)', '#ef4444', 'rgba(239,68,68,0.3)'],
      }[critMap[vUp]];
      return `<span style="display:inline-flex;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;background:${bg};color:${col};border:1px solid ${brd}">${escapeHtml(v)}</span>`;
    }

    // Lifecycle
    if (lifecycleMap[vUp]) {
      const [bg, col, brd] = {
        success: ['rgba(34,197,94,0.10)', '#16a34a', 'rgba(34,197,94,0.3)'],
        warning: ['rgba(245,158,11,0.10)', '#d97706', 'rgba(245,158,11,0.3)'],
        danger:  ['rgba(239,68,68,0.10)', '#ef4444', 'rgba(239,68,68,0.3)'],
        muted:   ['rgba(107,114,128,0.10)', '#6b7280', 'rgba(107,114,128,0.3)'],
      }[lifecycleMap[vUp]];
      return `<span style="display:inline-flex;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${bg};color:${col};border:1px solid ${brd}">${escapeHtml(v)}</span>`;
    }

    if (entityTypeMap[vUp]) {
        const [bg, col, brd] = entityTypeMap[vUp];
        return `<span style="
            display:inline-flex;
            padding:2px 9px;
            border-radius:20px;
            font-size:11px;
            font-weight:600;
            background:${bg};
            color:${col};
            border:1px solid ${brd}">
            ${escapeHtml(v)}
        </span>`;
    }

    if (classificationMap[vUp]) {
        const [bg, col, brd] = classificationMap[vUp];
        return `<span style="
            display:inline-flex;
            padding:2px 9px;
            border-radius:20px;
            font-size:11px;
            font-weight:600;
            background:${bg};
            color:${col};
            border:1px solid ${brd}">
            ${escapeHtml(v)}
        </span>`;
    }

    // Default: plain styled text
    return `<span style="font-weight:500;color:var(--text)">${escapeHtml(v)}</span>`;
  }

  populatedRows.sort((a, b) => a.label.localeCompare(b.label));

  populatedRows.forEach(({ label, value }) => {
    html += `<tr style="border-bottom:1px solid var(--border-light)">
      <td style="padding:8px 12px;color:var(--text-muted);font-size:12px;white-space:nowrap">${escapeHtml(label)}</td>
      <td style="padding:8px 12px">${metaValueHtml(label, value)}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

function row(meta, key, label) {
  const val = meta[key];
  if (val === undefined || val === null || val === '') return null;
  return { label, value: String(val) };
}

// ── System Wiki (no table selected) ───────────────────────
function renderSystemWiki() {
  // Dispatch to current sub-tab (or default to overview)
  const activeSubTab = document.querySelector('.wiki-subtab-btn.active')?.dataset.wikiSubtab || 'overview';
  switchWikiSubTab(activeSubTab);
}

function renderSystemWikiOverview() {
  if (!schema) return;
  const entities = schema.entities || [];
  const totalFields    = entities.reduce((s, e) => s + (e.fields    || []).length, 0);
  const totalRelations = entities.reduce((s, e) => s + (e.relations || []).length, 0);

  // Build group map
  const groups = {};
  entities.forEach(e => {
    const g = deriveGroup(e);
    if (!groups[g]) groups[g] = [];
    groups[g].push(e);
  });

  let html = '';

  // Header
  html += `<div class="wiki-page-header">
    <div class="wiki-page-title">
      <div class="wiki-table-icon" style="background:var(--teal)">S</div>
      <h1>Schema Overview</h1>
    </div>
    <div class="wiki-page-meta">
      <div class="wiki-meta-item">
        <div class="wiki-meta-dot"></div>
        <span>Version ${schema.version}</span>
      </div>
      <div class="wiki-meta-item"><span>${entities.length} tables</span></div>
      <div class="wiki-meta-item"><span>${totalFields} fields</span></div>
      <div class="wiki-meta-item"><span>${totalRelations} relations</span></div>
    </div>
  </div>`;

  // Description
  html += `<div class="wiki-section">
    <h2>Database Schema</h2>
    <p>This schema contains <strong>${entities.length}</strong> entities across <strong>${Object.keys(groups).length}</strong> domain groups, with a total of <strong>${totalFields}</strong> fields and <strong>${totalRelations}</strong> relationships. Select a table from the sidebar to view detailed documentation.</p>
  </div>`;

  // Domain groups
  html += `<div class="wiki-section">
    <h3>Domain Groups</h3>
    <div class="sys-groups-grid">`;
  Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).forEach(([groupName, ents]) => {
    const [hdrCol] = groupColor(groupName);
    html += `<div class="sys-group-card" style="--g-color:${hdrCol}">
      <div class="sys-group-header">${groupName}</div>
      <div class="sys-group-tables">
        ${ents.map(e => `<div class="sys-group-table-row" onclick="selectTable('${e.simpleClassName}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>${e.tableName}</span>
          <span class="sys-field-count">${(e.fields||[]).length}f</span>
        </div>`).join('')}
      </div>
    </div>`;
  });
  html += `</div></div>`;

  wikiContent.innerHTML = html;
}

function renderSystemWikiAllTables() {
  if (!schema) return;
  const entities = schema.entities || [];

  let html = '';

  // Header
  html += `<div class="wiki-page-header">
    <div class="wiki-page-title">
      <div class="wiki-table-icon" style="background:var(--accent)">⊞</div>
      <h1>All Tables</h1>
    </div>
    <div class="wiki-page-meta">
      <div class="wiki-meta-item">
        <div class="wiki-meta-dot"></div>
        <span>${entities.length} tables</span>
      </div>
    </div>
  </div>`;

  // All tables flat list
  html += `<div class="wiki-section">
    <table class="wiki-table">
      <thead><tr>
        <th>Table</th><th>Class</th><th>Fields</th><th>Relations</th><th>Classification</th><th>Tags</th>
      </tr></thead>
      <tbody>
        ${entities.map(e => {
          const eTags = e.tags || [];
          const tagsHtml = eTags.length > 0
            ? eTags.slice(0, 4).map(t => `<span class="wiki-entity-tag wiki-tag-${tagClass(t)}" style="font-size:10px;padding:1px 6px" title="${escapeHtml(tagDesc(t))}">${escapeHtml(t)}</span>`).join('')
              + (eTags.length > 4 ? `<span style="color:var(--text-light);font-size:10px">+${eTags.length - 4}</span>` : '')
            : '—';
          const classHtml = e.dataClassification
            ? `<span class="wiki-classification-badge" style="font-size:10px">${escapeHtml(e.dataClassification)}</span>`
            : '—';
          return `<tr onclick="selectTable('${e.simpleClassName}')" style="cursor:pointer">
            <td><div class="col-name">
              <div class="col-icon" style="background:var(--accent-light);color:var(--accent);border-color:rgba(91,110,245,0.2)">T</div>
              <div>
                <span>${e.tableName}</span>
                ${e.deprecated ? '<span style="font-size:9px;color:var(--danger);font-weight:600;margin-left:4px">DEPRECATED</span>' : ''}
              </div>
            </div></td>
            <td style="color:var(--text-muted);font-size:12px">${e.simpleClassName}</td>
            <td style="color:var(--text-muted)">${(e.fields||[]).length}</td>
            <td style="color:var(--text-muted)">${(e.relations||[]).length}</td>
            <td>${classHtml}</td>
            <td><div style="display:flex;flex-wrap:wrap;gap:3px">${tagsHtml}</div></td>
            <td style="color:var(--text-muted);font-size:12px">${e.comment ? escapeHtml(e.comment.substring(0,80)) + (e.comment.length>80?'…':'') : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  wikiContent.innerHTML = html;
}

// ── Exports ───────────────────────────────────────────────
window.Wiki = {
  switchInnerTab, switchWikiSubTab, selectTable, clearSelection, 
  renderWikiPage, buildEntityMetaPanel, 
  renderSystemWiki, renderSystemWikiOverview, renderSystemWikiAllTables
};
