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
  else if (activeInner === 'diagram') { autoLayout(); renderCanvas(); setTimeout(fitAll, 60); }
  else if (activeInner === 'changelog') renderChangelog();
}

// ── Wiki Page Rendering ───────────────────────────────────
function renderWikiPage(entity) {
  const fields = entity.fields || [];
  const relations = entity.relations || [];
  const schemaName = deriveSchema(entity);
  const tags = entity.tags || [];

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

  // Page header
  html += `<div class="wiki-page-header">
    <div class="wiki-page-title">
      <div class="wiki-table-icon">T</div>
      <h1>${entity.tableName} Table</h1>
      ${entity.criticalityLevel ? `<span class="wiki-criticality-badge wiki-criticality-${entity.criticalityLevel.toLowerCase()}">${entity.criticalityLevel}</span>` : ''}
    </div>
    <div class="wiki-page-meta">
      <div class="wiki-meta-item">
        <div class="wiki-meta-dot"></div>
        <span>Last updated: just now</span>
      </div>
      <div class="wiki-meta-item">
        <span>${fields.length} fields</span>
      </div>
      <div class="wiki-meta-item">
        <span>${relations.length} relations</span>
      </div>
      ${entity.lifecycleStage ? `<div class="wiki-meta-item"><span class="wiki-lifecycle-badge wiki-lifecycle-${entity.lifecycleStage.toLowerCase()}">${entity.lifecycleStage}</span></div>` : ''}
      ${entity.dataClassification ? `<div class="wiki-meta-item"><span class="wiki-classification-badge">${entity.dataClassification}</span></div>` : ''}
    </div>
    ${tags.length > 0 ? `<div class="wiki-entity-tags">${tags.map(t => `<span class="wiki-entity-tag wiki-tag-${tagClass(t)}" title="${escapeHtml(tagDesc(t))}">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
  </div>`;

  // Description
  const tableDesc = entity.comment
    ? entity.comment
    : `Stores information about each ${entity.tableName.replace(/_/g, ' ').replace(/s$/, '')} record in the system.`;

  html += `<div class="wiki-section">
    <h2>${entity.simpleClassName} Table</h2>
    <p>${tableDesc}</p>
  </div>`;

  // Entity-level metadata panel
  const entityMeta = entity.metadata || {};
  if (Object.keys(entityMeta).length > 0) {
    html += `<div class="wiki-section">
      <h3>Metadata Annotations</h3>
      ${buildEntityMetaPanel(entityMeta)}
    </div>`;
  }

  // Insert code example
  html += `<div class="wiki-section">
    <h3>Insert Code Example</h3>
    ${buildSqlExample(entity)}
  </div>`;

  // Fields table
  html += `<div class="wiki-section">
    <div class="fields-section-header" onclick="toggleFieldsTable(this)">
      <span class="fields-caret open">▾</span>
      <h3>Fields (${fields.length})</h3>
    </div>
    <div class="fields-table-wrap">
      ${buildFieldsTable(entity)}
    </div>
  </div>`;

  // Table references diagram (only if has relations)
  if (relations.length > 0) {
    html += `<div class="wiki-section">
      <h3>Table references</h3>
      <div class="table-refs-diagram">
        <div id="mini-svg-${entity.simpleClassName}"></div>
      </div>
    </div>`;
  }

  // Recent activity placeholder
  html += buildActivitySection(entity);

  wikiContent.innerHTML = html;

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

function toggleFieldsTable(headerEl) {
  const caret = headerEl.querySelector('.fields-caret');
  const wrap = headerEl.nextElementSibling;
  const isOpen = caret.classList.contains('open');
  caret.classList.toggle('open', !isOpen);
  wrap.style.display = isOpen ? 'none' : '';
}

// ── Entity Metadata Panel ─────────────────────────────────
function buildEntityMetaPanel(meta) {
  const categories = [
    {
      label: 'Business',
      icon: '🏢',
      rows: [
        row(meta, 'module.name',        'Module',        'module.description'),
        row(meta, 'submodule.name',     'Submodule',     'submodule.description'),
        row(meta, 'domain.name',        'Domain',        'domain.description'),
        row(meta, 'purpose.value',      'Purpose',       'purpose.description'),
        row(meta, 'criticality.level',  'Criticality',   'criticality.description'),
      ]
    },
    {
      label: 'Ownership',
      icon: '👤',
      rows: [
        row(meta, 'businessOwner',  'Business Owner'),
        row(meta, 'technicalOwner', 'Technical Owner'),
        row(meta, 'dataSteward',    'Data Steward'),
      ]
    },
    {
      label: 'Table Classification',
      icon: '🗄️',
      rows: [
        row(meta, 'tableType.type',        'Table Type',    'tableType.description'),
        row(meta, 'masterData',            'Master Data'),
        row(meta, 'transactionalData',     'Transactional'),
        row(meta, 'lookupTable',           'Lookup Table'),
        row(meta, 'referenceData',         'Reference Data'),
      ]
    },
    {
      label: 'Integration',
      icon: '🔗',
      rows: [
        row(meta, 'sourceSystem.name', 'Source System', 'sourceSystem.description'),
        row(meta, 'integration',       'Integration'),
        row(meta, 'derivedFrom',       'Derived From'),
        row(meta, 'derived.expression','Expression'),
      ]
    },
    {
      label: 'Data Classification',
      icon: '🔒',
      rows: [
        row(meta, 'dataClassification.level', 'Classification', 'dataClassification.description'),
        row(meta, 'accessLevel.level',         'Access Level'),
      ]
    },
    {
      label: 'Privacy & Compliance',
      icon: '🛡️',
      rows: [
        row(meta, 'pii',              'PII'),
        row(meta, 'piiCategory.type', 'PII Category',   'piiCategory.description'),
        row(meta, 'spd',              'Sensitive Data'),
        row(meta, 'containsChildrenData', 'Children Data'),
        row(meta, 'lawfulBasis.type', 'Lawful Basis',   'lawfulBasis.description'),
        row(meta, 'consentRequired',  'Consent Required'),
        row(meta, 'legalHold',        'Legal Hold'),
      ]
    },
    {
      label: 'Security',
      icon: '🔐',
      rows: [
        row(meta, 'encrypted.algorithm', 'Encryption'),
        row(meta, 'masking.strategy',     'Masking'),
      ]
    },
    {
      label: 'Lifecycle',
      icon: '📅',
      rows: [
        row(meta, 'retention.type',          'Retention',        'retention.description'),
        row(meta, 'lifecycle',               'Lifecycle Stage'),
        row(meta, 'deprecatedSince.version', 'Deprecated Since', 'deprecatedSince.replacement'),
      ]
    },
    {
      label: 'Operations',
      icon: '⚙️',
      rows: [
        row(meta, 'refreshFrequency', 'Refresh Frequency'),
        row(meta, 'updateStrategy',   'Update Strategy'),
        row(meta, 'versioned',        'Versioned'),
        row(meta, 'auditable',        'Auditable'),
        row(meta, 'auditColumns.createdBy', 'Audit: createdBy'),
        row(meta, 'auditColumns.updatedBy', 'Audit: updatedBy'),
        row(meta, 'auditColumns.createdAt', 'Audit: createdAt'),
        row(meta, 'auditColumns.updatedAt', 'Audit: updatedAt'),
      ]
    },
    {
      label: 'Data Quality',
      icon: '✅',
      rows: [
        row(meta, 'dataQuality.rules', 'Quality Rules'),
        row(meta, 'dataQualityLevel',  'Quality Level'),
      ]
    },
    {
      label: 'API',
      icon: '🌐',
      rows: [
        row(meta, 'apiExposed', 'API Exposed'),
        row(meta, 'publicApi',  'Public API'),
      ]
    },
    {
      label: 'Notes',
      icon: '📝',
      rows: [
        row(meta, 'remarks', 'Remarks'),
      ]
    },
  ];

  // Only render categories that have at least one populated row
  const activeCats = categories.map(cat => ({
    ...cat,
    rows: cat.rows.filter(r => r !== null)
  })).filter(cat => cat.rows.length > 0);

  if (activeCats.length === 0) return '<p style="color:var(--text-muted);font-size:13px">No metadata annotations present.</p>';

  let html = '<div class="meta-panel">';
  activeCats.forEach(cat => {
    html += `<div class="meta-category">
      <div class="meta-category-header">
        <span class="meta-category-icon">${cat.icon}</span>
        <span class="meta-category-label">${cat.label}</span>
      </div>
      <div class="meta-rows">`;
    cat.rows.forEach(({ label, value, desc }) => {
      const displayVal = value === 'true' ? '✓ Yes' : escapeHtml(value);
      const descHtml = desc ? `<span class="meta-row-desc">${escapeHtml(desc)}</span>` : '';
      html += `<div class="meta-row">
        <span class="meta-row-label">${escapeHtml(label)}</span>
        <span class="meta-row-value">${displayVal}${descHtml}</span>
      </div>`;
    });
    html += `</div></div>`;
  });
  html += '</div>';
  return html;
}

function row(meta, key, label, descKey) {
  const val = meta[key];
  if (val === undefined || val === null || val === '') return null;
  return { label, value: String(val), desc: descKey ? meta[descKey] || '' : '' };
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
        <th>Table</th><th>Class</th><th>Fields</th><th>Relations</th><th>Classification</th><th>Tags</th><th>Description</th>
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
  renderWikiPage, toggleFieldsTable, buildEntityMetaPanel, 
  renderSystemWiki, renderSystemWikiOverview, renderSystemWikiAllTables
};
