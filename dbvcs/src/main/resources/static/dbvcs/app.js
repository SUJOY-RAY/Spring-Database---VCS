/* =========================================================
   dbvcs — Schema Explorer UI  (wiki-style redesign)
   ========================================================= */

const API = '/dbvcs/api';

// ── State ─────────────────────────────────────────────────
let schema = null;
let positions = {};
let activeTable = null;  // simpleClassName of selected table
let searchQuery = '';
let groupBySchema = true;
let sortAsc = true;

// ── Pan/Zoom ───────────────────────────────────────────────
let viewX = 0, viewY = 0, viewScale = 1;
let isPanning = false, panStart = null;

// ── DOM refs ──────────────────────────────────────────────
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

// ── Boot ──────────────────────────────────────────────────
(async () => {
  await loadVersionList();
  const latest = versionSelect.value;
  if (latest) await loadVersion(parseInt(latest, 10));
  // Pre-load changelog so Recent Activities in wiki tab is populated
  await loadChangelog();
  // Show system wiki on landing
  renderSystemWiki();
})();

// ── Version loading ───────────────────────────────────────
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
    // Reset context chip
    const ctx = document.getElementById('inner-tabbar-context');
    if (ctx) ctx.innerHTML = '';
    renderSidebar();
    autoLayout();
    // Re-render active inner tab at system level
    const activeInner = document.querySelector('.inner-tab-btn.active')?.dataset.innerTab || 'wiki';
    if (activeInner === 'wiki') renderSystemWiki();
    else if (activeInner === 'diagram') renderCanvas();
    snapshotDate.textContent = schema.capturedAt
      ? new Date(schema.capturedAt).toLocaleString()
      : '';
  } catch (e) {
    showToast('Failed to load schema', true);
  }
}

// ── Sidebar collapse / expand ─────────────────────────────
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


// ── Inner tab switching ───────────────────────────────────
function switchInnerTab(name) {
  document.querySelectorAll('.inner-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.innerTab === name);
  });
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');

  if (name === 'diagram') {
    if (activeTable) renderTableDiagram(activeTable);
    else { autoLayout(); renderCanvas(); }
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
      renderSystemWiki();
    }
  }
}

document.querySelectorAll('.inner-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchInnerTab(btn.dataset.innerTab));
});

// Remove the old .tab-btn handler (topbar nav is now empty)

// ── Sidebar search ────────────────────────────────────────
sidebarSearch.addEventListener('input', () => {
  searchQuery = sidebarSearch.value.toLowerCase();
  renderSidebar();
});

document.getElementById('btn-clear-search').addEventListener('click', () => {
  sidebarSearch.value = '';
  searchQuery = '';
  renderSidebar();
});

document.getElementById('btn-sort').addEventListener('click', () => {
  sortAsc = !sortAsc;
  renderSidebar();
});

document.getElementById('btn-group-schema').addEventListener('click', () => {
  groupBySchema = !groupBySchema;
  const btn = document.getElementById('btn-group-schema');
  btn.classList.toggle('active', groupBySchema);
  btn.textContent = groupBySchema ? '≡ Group by: Schema' : '≡ No grouping';
  renderSidebar();
});

// ── Schema / group derivation ─────────────────────────────
// ── Group / module derivation ─────────────────────────────
// Reads the @BusinessModule annotation value from entity metadata.
// Falls back to domain, then table prefix, then "other".
function deriveGroup(entity) {
  const meta = entity.metadata || {};
  if (meta['module.name'])  return meta['module.name'].toLowerCase();
  if (meta['domain.name'])  return meta['domain.name'].toLowerCase();
  // Last-resort: first segment of table name (legacy fallback)
  const tbl = entity.tableName || '';
  return tbl.split('_')[0] || 'other';
}

// Reads @Submodule name from metadata. Returns empty string if absent.
function deriveSubgroup(entity) {
  return (entity.metadata || {})['submodule.name'] || '';
}

// Reads @Domain name from metadata.
function deriveDomain(entity) {
  return (entity.metadata || {})['domain.name'] || '';
}

// Reads @Criticality level from metadata.
function deriveCriticality(entity) {
  return (entity.metadata || {})['criticality.level'] || '';
}

// Human-readable group label: prefer module description, else title-case the key.
// Accepts the full entity list for that group to find the description.
function deriveGroupLabel(groupName, groupEntities) {
  const ent = (groupEntities || []).find(e => {
    const meta = e.metadata || {};
    return (meta['module.name'] || '').toLowerCase() === groupName
        && meta['module.description'];
  });
  if (ent) return ent.metadata['module.description'];
  return groupName.charAt(0).toUpperCase() + groupName.slice(1);
}

// Full qualified label shown in sidebar: "MODULE · submodule · table_name"
function qualifiedLabel(entity) {
  const mod = deriveGroup(entity);
  const sub = deriveSubgroup(entity);
  return sub ? `${mod} · ${sub.toLowerCase()} · ${entity.tableName}`
             : `${mod} · ${entity.tableName}`;
}

// Alias kept for call sites
function deriveSchema(entity) { return deriveGroup(entity); }

function renderSidebar() {
  if (!schema) return;
  entityTree.innerHTML = '';

  let entities = [...schema.entities];

  // Filter
  if (searchQuery) {
    entities = entities.filter(e =>
      e.simpleClassName.toLowerCase().includes(searchQuery) ||
      e.tableName.toLowerCase().includes(searchQuery) ||
      (e.fields || []).some(f => f.name.toLowerCase().includes(searchQuery))
    );
  }

  // Sort
  entities.sort((a, b) => sortAsc
    ? a.simpleClassName.localeCompare(b.simpleClassName)
    : b.simpleClassName.localeCompare(a.simpleClassName)
  );

  if (groupBySchema) {
    // Group by logical domain group
    const groups = {};
    entities.forEach(e => {
      const g = deriveGroup(e);
      if (!groups[g]) groups[g] = [];
      groups[g].push(e);
    });
    Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).forEach(([groupName, ents]) => {
      entityTree.appendChild(buildSchemaGroup(groupName, ents));
    });
  } else {
    entities.forEach(e => entityTree.appendChild(buildTableItem(e)));
  }
}

function buildSchemaGroup(groupName, entities) {
  const group = document.createElement('div');
  group.className = 'schema-group';

  const header = document.createElement('div');
  header.className = 'schema-group-header';
  header.innerHTML = `<span class="schema-caret">▾</span><span>${groupName}</span>`;
  header.addEventListener('click', () => group.classList.toggle('collapsed'));
  group.appendChild(header);

  const tablesDiv = document.createElement('div');
  tablesDiv.className = 'schema-group-tables';
  entities.forEach(e => tablesDiv.appendChild(buildTableItem(e)));
  group.appendChild(tablesDiv);

  return group;
}

function buildTableItem(entity) {
  const item = document.createElement('div');
  item.className = 'table-item';
  if (activeTable === entity.simpleClassName) item.classList.add('open');

  const header = document.createElement('div');
  header.className = 'table-item-header';
  if (activeTable === entity.simpleClassName) header.classList.add('active');

  header.innerHTML = `
    <div class="table-icon">T</div>
    <span class="table-name">${qualifiedLabel(entity)}</span>
    <span class="table-caret">›</span>
  `;

  // Click: select table + expand fields
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains('open');
    // Close all others
    document.querySelectorAll('.table-item').forEach(i => i.classList.remove('open'));
    document.querySelectorAll('.table-item-header').forEach(h => h.classList.remove('active'));

    if (!wasOpen || activeTable !== entity.simpleClassName) {
      item.classList.add('open');
      header.classList.add('active');
    }
    selectTable(entity.simpleClassName);
  });

  item.appendChild(header);

  // Fields
  const fieldsDiv = document.createElement('div');
  fieldsDiv.className = 'table-fields';
  (entity.fields || []).forEach(f => {
    const fItem = document.createElement('div');
    fItem.className = 'field-item';
    fItem.innerHTML = `
      <div class="field-type-icon ${f.id ? 'pk' : ''}">${f.id ? 'PK' : getTypeAbbr(f.javaType)}</div>
      <span>${f.columnName || f.name}</span>
    `;
    fItem.addEventListener('mouseenter', (ev) => showFieldTooltip(ev, f));
    fItem.addEventListener('mouseleave', hideFieldTooltip);
    fItem.addEventListener('click', () => selectTable(entity.simpleClassName));
    fieldsDiv.appendChild(fItem);
  });
  item.appendChild(fieldsDiv);

  return item;
}

function getTypeAbbr(javaType) {
  if (!javaType) return '?';
  const map = { 'String': 'str', 'Long': 'int', 'Integer': 'int', 'BigDecimal': 'dec',
    'boolean': 'bool', 'Boolean': 'bool', 'LocalDateTime': 'ts', 'LocalDate': 'dt',
    'Double': 'dec', 'Float': 'dec' };
  return map[javaType] || javaType.substring(0, 3).toLowerCase();
}

// ── Field tooltip ─────────────────────────────────────────
function showFieldTooltip(ev, field) {
  tooltipFieldName.textContent = field.columnName || field.name;
  tooltipFieldType.textContent = `${mapSqlType(field.javaType)}  ·  ${field.javaType}`;
  // Description line
  const descText = field.comment ? field.comment : generateFieldDesc(field);
  tooltipFieldDesc.textContent = descText;

  // Metadata pills inside tooltip
  let existingMeta = fieldTooltip.querySelector('.tooltip-meta');
  if (existingMeta) existingMeta.remove();

  const meta = field.metadata || {};
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    const metaDiv = document.createElement('div');
    metaDiv.className = 'tooltip-meta';
    // Show first 4 most relevant meta entries
    const priority = ['pii','encrypted.algorithm','masking.strategy','piiCategory.type',
      'dataClassification.level','accessLevel.level','businessKey','naturalKey',
      'searchable','lawfulBasis.type','consentRequired','legalHold'];
    const shown = [...priority.filter(k => meta[k]), ...metaKeys.filter(k => !priority.includes(k))].slice(0, 5);
    shown.forEach(k => {
      const val = meta[k];
      const chip = document.createElement('span');
      chip.className = 'tooltip-meta-chip';
      const labelMap = {
        'pii': 'PII', 'encrypted.algorithm': 'Encrypted', 'masking.strategy': 'Masking',
        'piiCategory.type': 'PII Type', 'dataClassification.level': 'Classification',
        'accessLevel.level': 'Access', 'businessKey': 'Business Key', 'naturalKey': 'Natural Key',
        'searchable': 'Searchable', 'lawfulBasis.type': 'Lawful Basis',
        'consentRequired': 'Consent', 'legalHold': 'Legal Hold',
        'derivedFrom': 'From', 'derived.expression': 'Expr',
        'indexedFor.purpose': 'Index', 'apiExposed': 'API', 'publicApi': 'Public API',
        'dataQualityLevel': 'Quality', 'remarks': 'Note'
      };
      const lbl = labelMap[k] || k.replace(/\./g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      chip.textContent = val === 'true' ? lbl : `${lbl}: ${val}`;
      const desc = tagDesc(lbl);
      if (desc) chip.title = desc;
      metaDiv.appendChild(chip);
    });
    fieldTooltip.appendChild(metaDiv);
  }

  fieldTooltip.classList.remove('hidden');
  positionTooltip(ev);
}

function positionTooltip(ev) {
  const tt = fieldTooltip;
  const x = ev.clientX + 12;
  const y = ev.clientY + 8;
  tt.style.left = `${Math.min(x, window.innerWidth - 260)}px`;
  tt.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
}

document.addEventListener('mousemove', (ev) => {
  if (!fieldTooltip.classList.contains('hidden')) positionTooltip(ev);
});

function hideFieldTooltip() {
  fieldTooltip.classList.add('hidden');
}

function generateFieldDesc(field) {
  if (field.id) return `Primary key of the record`;
  const name = field.name.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Table selection ───────────────────────────────────────
function selectTable(name) {
  activeTable = name;
  const entity = schema.entities.find(e => e.simpleClassName === name);
  if (!entity) return;

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

function clearSelection() {
  activeTable = null;
  // Clear sidebar highlight
  document.querySelectorAll('.table-item').forEach(i => i.classList.remove('open'));
  document.querySelectorAll('.table-item-header').forEach(h => h.classList.remove('active'));
  // Clear context chip
  const ctx = document.getElementById('inner-tabbar-context');
  if (ctx) ctx.innerHTML = '';
  // Re-render active inner tab at system level
  const activeInner = document.querySelector('.inner-tab-btn.active')?.dataset.innerTab || 'wiki';
  if (activeInner === 'wiki') renderSystemWiki();
  else if (activeInner === 'diagram') { autoLayout(); renderCanvas(); }
  else if (activeInner === 'changelog') renderChangelog();
}

function toggleFieldsTable(headerEl) {
  const caret = headerEl.querySelector('.fields-caret');
  const wrap = headerEl.nextElementSibling;
  const isOpen = caret.classList.contains('open');
  caret.classList.toggle('open', !isOpen);
  wrap.style.display = isOpen ? 'none' : '';
}

// ── Entity-level metadata panel ───────────────────────────
/**
 * Renders a structured two-column grid of all entity-level metadata annotations.
 * Groups related keys into logical categories with a heading per category.
 */
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

/** Returns { label, value, desc } if the key exists in meta, otherwise null. */
function row(meta, key, label, descKey) {
  const val = meta[key];
  if (val === undefined || val === null || val === '') return null;
  return { label, value: String(val), desc: descKey ? meta[descKey] || '' : '' };
}

// ── Wiki helper builders ───────────────────────────────────
function generateTableDesc(entity) {
  const name = entity.tableName.replace(/_/g, ' ');
  return `information about each ${name.replace(/s$/, '')} record in the system`;
}

function buildSqlExample(entity) {
  const fields = (entity.fields || []).filter(f => !f.id).slice(0, 4);
  const cols = fields.map(f => f.columnName || f.name).join(', ');
  const vals = fields.map(f => sampleValue(f)).join(', ');
  return `<div class="sql-block">
<span class="sql-keyword">INSERT INTO</span> <span class="sql-table">${entity.tableName}</span> (${cols})
<span class="sql-keyword">VALUES</span> (${vals});
</div>`;
}

function sampleValue(field) {
  const t = field.javaType;
  if (t === 'String') return `<span class="sql-string">'sample_value'</span>`;
  if (t === 'Long' || t === 'Integer') return `<span class="sql-number">1</span>`;
  if (t === 'BigDecimal' || t === 'Double') return `<span class="sql-number">9.99</span>`;
  if (t === 'boolean' || t === 'Boolean') return `<span class="sql-number">true</span>`;
  if (t === 'LocalDateTime') return `<span class="sql-string">NOW()</span>`;
  return `<span class="sql-string">'value'</span>`;
}

function buildFieldsTable(entity) {
  const fields = entity.fields || [];
  const relations = entity.relations || [];

  // Owning-side relations (MANY_TO_ONE, ONE_TO_ONE without mappedBy) — these are real FK columns
  const owningSideRels = relations.filter(r =>
    (r.type === 'MANY_TO_ONE' || r.type === 'ONE_TO_ONE') && r.joinColumnName
  );

  // Map joinColumnName → relation, for quick lookup when rendering fields
  const joinColMap = {};
  owningSideRels.forEach(r => {
    joinColMap[r.joinColumnName] = r;
  });

  // Also map fieldName → relation (fallback for any field whose name matches)
  const fieldNameMap = {};
  owningSideRels.forEach(r => { fieldNameMap[r.fieldName] = r; });

  let rows = '';

  // ── Regular columns ──────────────────────────────────────
  fields.forEach(f => {
    // Check if this field corresponds to a FK join column
    const rel = joinColMap[f.columnName] || joinColMap[f.name]
              || fieldNameMap[f.name] || null;
    const isFk = !!rel;

    const tags  = buildTags(f, isFk);
    const refs  = buildRefs(entity, f, rel ? rel.targetEntity : null, rel);
    const desc  = f.comment ? escapeHtml(f.comment) : generateFieldDesc(f);
    const metaHtml = buildFieldMetaBadges(f.metadata);

    rows += `<tr>
      <td><div class="col-name">
        <div class="col-icon ${f.id ? 'pk' : ''}">${f.id ? 'PK' : getTypeAbbr(f.javaType)}</div>
        <div>
          <div style="font-weight:500">${escapeHtml(f.columnName || f.name)}</div>
          ${f.name !== (f.columnName || f.name) ? `<div style="font-size:10px;color:var(--text-light);font-style:italic">${escapeHtml(f.name)}</div>` : ''}
        </div>
      </div></td>
      <td><code class="col-code">${mapSqlType(f.javaType)}</code><div style="font-size:10px;color:var(--text-light);margin-top:2px">${escapeHtml(f.javaType)}</div></td>
      <td>${tags}</td>
      <td>${refs}</td>
      <td>
        <div class="field-desc-cell">
          <span class="field-desc-text">${desc}</span>
          ${metaHtml}
        </div>
      </td>
    </tr>`;
  });

  // ── FK join columns (owning-side relations not already in fields[]) ──────
  // These are the physical *_id columns that JPA maps as relation fields
  owningSideRels.forEach(r => {
    const colName = r.joinColumnName;
    // Skip if the fields list already contains a field with this column name
    const alreadyCovered = fields.some(f => (f.columnName || f.name) === colName);
    if (alreadyCovered) return;

    const targetEntity = schema ? schema.entities.find(e => e.simpleClassName === r.targetEntity) : null;
    const targetTable  = targetEntity ? targetEntity.tableName : r.targetEntity.toLowerCase() + 's';
    const refHtml = `<a class="ref-link" data-target="${r.targetEntity}">
      <span class="ref-arrow">→</span> ${targetTable}.id
    </a>`;
    const tags = '<span class="tag tag-fk">FK</span>'
               + (r.optional ? '<span class="tag tag-null">null</span>' : '<span class="tag tag-nn">NOT NULL</span>');

    rows += `<tr>
      <td><div class="col-name">
        <div class="col-icon" style="background:var(--accent-light);color:var(--accent);border-color:rgba(91,110,245,0.25)">FK</div>
        <div>
          <div style="font-weight:500">${escapeHtml(colName)}</div>
          <div style="font-size:10px;color:var(--text-light);font-style:italic">${escapeHtml(r.fieldName)}</div>
        </div>
      </div></td>
      <td><code class="col-code">bigint</code><div style="font-size:10px;color:var(--text-light);margin-top:2px">Long</div></td>
      <td>${tags}</td>
      <td>${refHtml}</td>
      <td><div class="field-desc-cell">
        <span class="field-desc-text">Foreign key → ${targetTable}</span>
      </div></td>
    </tr>`;
  });

  return `<table class="wiki-table">
    <thead><tr>
      <th>Column</th>
      <th>Type</th>
      <th>Constraints</th>
      <th>References</th>
      <th>Description &amp; Metadata</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/**
 * Renders a compact set of metadata badge pills from a field's metadata map.
 * Groups related keys (e.g. piiCategory.type + piiCategory.description) into one pill.
 */
function buildFieldMetaBadges(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return '';

  const pills = [];

  // Helper: get a value and its paired description
  const get = (k) => metadata[k];

  // Privacy
  if (get('pii'))                pills.push(metaPill('PII', get('pii') === 'true' ? '' : get('pii'), 'pii'));
  if (get('piiCategory.type'))   pills.push(metaPill('PII Category', formatMetaVal('piiCategory.type', get('piiCategory.type'), get('piiCategory.description')), 'pii'));
  if (get('spd'))                pills.push(metaPill('SPD', get('spd') === 'true' ? '' : get('spd'), 'privacy'));
  if (get('consentRequired'))    pills.push(metaPill('Consent Required', get('consentRequired') === 'true' ? '' : get('consentRequired'), 'privacy'));
  if (get('legalHold'))          pills.push(metaPill('Legal Hold', get('legalHold') === 'true' ? '' : get('legalHold'), 'warn'));
  if (get('containsChildrenData')) pills.push(metaPill('Children Data', get('containsChildrenData') === 'true' ? '' : get('containsChildrenData'), 'warn'));
  if (get('lawfulBasis.type'))   pills.push(metaPill('Lawful Basis', formatMetaVal('lawfulBasis.type', get('lawfulBasis.type'), get('lawfulBasis.description')), 'privacy'));

  // Security
  if (get('encrypted.algorithm')) pills.push(metaPill('Encrypted', get('encrypted.algorithm'), 'security'));
  if (get('masking.strategy'))    pills.push(metaPill('Masking', get('masking.strategy'), 'security'));

  // Classification
  if (get('dataClassification.level')) pills.push(metaPill('Classification', formatMetaVal('dataClassification.level', get('dataClassification.level'), get('dataClassification.description')), 'class'));
  if (get('accessLevel.level'))        pills.push(metaPill('Access', get('accessLevel.level'), 'class'));

  // Integration / derivation
  if (get('sourceSystem.name')) pills.push(metaPill('Source', formatMetaVal('sourceSystem.name', get('sourceSystem.name'), get('sourceSystem.description')), 'integration'));
  if (get('derivedFrom'))       pills.push(metaPill('Derived From', get('derivedFrom'), 'integration'));
  if (get('derived.expression'))pills.push(metaPill('Expression', get('derived.expression'), 'integration'));

  // Data quality / modeling
  if (get('dataQuality.rules'))  pills.push(metaPill('Quality Rules', get('dataQuality.rules'), 'quality'));
  if (get('dataQualityLevel'))   pills.push(metaPill('Quality Level', get('dataQualityLevel'), 'quality'));
  if (get('businessKey'))        pills.push(metaPill('Business Key', '', 'modeling'));
  if (get('naturalKey'))         pills.push(metaPill('Natural Key', '', 'modeling'));
  if (get('searchable'))         pills.push(metaPill('Searchable', '', 'modeling'));
  if (get('indexedFor.purpose')) pills.push(metaPill('Indexed For', get('indexedFor.purpose'), 'modeling'));

  // API
  if (get('apiExposed')) pills.push(metaPill('API Exposed', '', 'api'));
  if (get('publicApi'))  pills.push(metaPill('Public API', '', 'api'));

  // Misc
  if (get('remarks')) pills.push(metaPill('Remark', get('remarks'), 'remark'));

  if (pills.length === 0) return '';
  return `<div class="field-meta-badges">${pills.join('')}</div>`;
}

function formatMetaVal(key, value, desc) {
  return desc ? `${value} — ${desc}` : value;
}

function metaPill(label, value, type) {
  const typeClass = `meta-pill--${type}`;
  const valueHtml = value ? `<span class="meta-pill-val">${escapeHtml(value)}</span>` : '';
  const desc = tagDesc(label);
  const titleText = [label, value, desc].filter(Boolean).join(' · ');
  return `<span class="meta-pill ${typeClass}" title="${escapeHtml(titleText)}">
    <span class="meta-pill-label">${escapeHtml(label)}</span>${valueHtml}
  </span>`;
}

function buildTags(field, isFk) {
  let tags = '';
  if (field.id) {
    tags += '<span class="tag tag-pk">PK</span>';
    tags += '<span class="tag tag-increment">increment</span>';
  }
  if (isFk) tags += '<span class="tag tag-fk">FK</span>';
  if (!field.nullable && !field.id) tags += '<span class="tag tag-nn">NOT NULL</span>';
  if (field.nullable && !field.id) tags += '<span class="tag tag-null">null</span>';
  return tags || '—';
}

function buildRefs(entity, field, fkTarget, relation) {
  const colName = field.columnName || field.name;

  if (!fkTarget) {
    // This is not an FK field — check if other entities point TO this entity's columns
    const refs = [];
    if (schema) {
      schema.entities.forEach(e => {
        if (e.simpleClassName === entity.simpleClassName) return;
        (e.relations || []).forEach(r => {
          // Only owning-side relations with a real join column pointing to this entity
          if (r.targetEntity === entity.simpleClassName
              && (r.type === 'MANY_TO_ONE' || r.type === 'ONE_TO_ONE')
              && !r.mappedBy) {
            refs.push({ entity: e.simpleClassName, table: e.tableName, col: r.joinColumnName || (r.fieldName + '_id') });
          }
        });
      });
    }
    // Only show the reference on the PK row (id field)
    if (!field.id || refs.length === 0) return '—';
    const shown = refs.slice(0, 3);
    let html = shown.map(r =>
      `<div><a class="ref-link" data-target="${r.entity}">
        <span class="ref-arrow">←</span> ${r.table}.${r.col}
      </a></div>`
    ).join('');
    if (refs.length > 3) html += `<div style="color:var(--text-muted);font-size:11px">+${refs.length - 3} more</div>`;
    return html;
  }

  // This field (or the FK row) points to another entity
  const targetEntity = schema ? schema.entities.find(e => e.simpleClassName === fkTarget) : null;
  const targetTable  = targetEntity ? targetEntity.tableName : fkTarget.toLowerCase() + 's';
  return `<a class="ref-link" data-target="${fkTarget}">
    <span class="ref-arrow">→</span> ${targetTable}.id
  </a>`;
}

function mapSqlType(javaType) {
  const map = {
    'String': 'varchar', 'Long': 'bigint', 'Integer': 'int', 'BigDecimal': 'decimal',
    'boolean': 'boolean', 'Boolean': 'boolean', 'LocalDateTime': 'timestamp',
    'LocalDate': 'date', 'Double': 'double', 'Float': 'float', 'Status': 'varchar'
  };
  return map[javaType] || javaType.toLowerCase();
}

function buildActivitySection(entity) {
  // Collect all changelog entries that touched this entity
  const rows = [];

  if (changelogData && changelogData.length > 0) {
    changelogData.forEach(entry => {
      const diff = entry.diff || {};
      const allGroups = [
        { list: diff.added    || [], status: 'added'    },
        { list: diff.modified || [], status: 'modified' },
        { list: diff.removed  || [], status: 'removed'  }
      ];
      allGroups.forEach(({ list, status }) => {
        const match = list.find(e => e.simpleClassName === entity.simpleClassName);
        if (!match) return;

        const fieldChanges = match.fieldChanges || [];
        const added   = fieldChanges.filter(c => c.startsWith('+')).length;
        const deleted = fieldChanges.filter(c => c.startsWith('-')).length;

        rows.push({ entry, status, added, deleted });
      });
    });
  }

  // Fallback: if changelog not loaded yet, show a single placeholder row
  if (rows.length === 0) {
    const { initials } = parseAuthor(schema && schema.capturedBy ? schema.capturedBy : '');
    return `<div class="wiki-section">
      <h3>Recent activities</h3>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-avatar">${initials || 'DB'}</div>
          <span class="activity-time">${schema ? formatTimeAgo(schema.capturedAt) : 'just now'}</span>
          <span class="activity-version">Version ${schema ? schema.version : 1}</span>
          <span class="activity-badge add">+${(entity.fields||[]).length}</span>
          <span class="activity-badge remove">-0</span>
        </div>
      </div>
    </div>`;
  }

  const rowsHtml = rows.map(({ entry, status, added, deleted }) => {
    const { initials } = parseAuthor(entry.capturedBy || '');
    const timeAgo = formatTimeAgo(entry.capturedAt);
    const statusLabel = status === 'added' ? 'Created' : status === 'removed' ? 'Deleted' : 'Modified';

    // For added: show total field count as +N; for removed: show -N
    const addCount    = status === 'added'   ? (entity.fields || []).length : added;
    const removeCount = status === 'removed' ? (entity.fields || []).length : deleted;

    const addBadge    = addCount    > 0 ? `<span class="activity-badge add">+${addCount}</span>`    : '';
    const removeBadge = removeCount > 0 ? `<span class="activity-badge remove">-${removeCount}</span>` : '';

    return `<div class="activity-item">
      <div class="activity-avatar">${initials || 'DB'}</div>
      <span class="activity-time">${timeAgo}</span>
      <span class="activity-version">v${entry.version} — ${statusLabel}</span>
      ${addBadge}${removeBadge}
    </div>`;
  }).join('');

  return `<div class="wiki-section">
    <h3>Recent activities</h3>
    <div class="activity-list">
      ${rowsHtml}
    </div>
  </div>`;
}

// ── System-level Wiki (no table selected) ─────────────────
function renderSystemWiki() {
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

  // All tables flat list
  html += `<div class="wiki-section">
    <h3>All Tables (${entities.length})</h3>
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

  // Wire up table row clicks re-bound via JS for safety (inline onclick already set)
}

// ── Table-scoped Diagram ──────────────────────────────────
function renderTableDiagram(name) {
  const entity = schema && schema.entities.find(e => e.simpleClassName === name);
  canvasRoot.innerHTML = '';
  _lineCounter = 0;
  if (!entity) return;

  // Highlight: show only this entity + its direct neighbours
  const neighbours = new Set([name]);
  (entity.relations || []).forEach(r => neighbours.add(r.targetEntity));
  schema.entities.forEach(e => {
    (e.relations || []).forEach(r => {
      if (r.targetEntity === name) neighbours.add(e.simpleClassName);
    });
  });

  const subEntities = schema.entities.filter(e => neighbours.has(e.simpleClassName));

  // Lay out: focal entity centred, neighbours arranged around it
  const CW = CARD_W, CH = (e) => cardHeight(e);
  const cx = 300, cy = 200;
  positions[name] = { x: cx, y: cy };

  const others = subEntities.filter(e => e.simpleClassName !== name);
  const angleStep = (2 * Math.PI) / Math.max(others.length, 1);
  const radius = Math.max(260, others.length * 60);
  others.forEach((e, i) => {
    const angle = i * angleStep - Math.PI / 2;
    positions[e.simpleClassName] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  });

  // Draw relation lines
  const linesGroup = svgMake('g', { class: 'lines-layer' });
  subEntities.forEach(e => {
    (e.relations || []).forEach(rel => {
      if (neighbours.has(rel.targetEntity)) drawRelationLine(linesGroup, e, rel);
    });
  });
  canvasRoot.appendChild(linesGroup);

  // Draw cards — focal entity highlighted
  subEntities.forEach(e => {
    const card = drawEntityCard(e);
    if (e.simpleClassName === name) {
      // Add a highlight ring
      const pos = positions[e.simpleClassName];
      const h   = cardHeight(e);
      const ring = svgMake('rect', {
        x: pos.x - 3, y: pos.y - 3,
        width: CW + 6, height: h + 6,
        rx: 8, fill: 'none',
        stroke: 'var(--accent)', 'stroke-width': 2.5, opacity: 0.5
      });
      canvasRoot.insertBefore(ring, canvasRoot.firstChild);
    }
    canvasRoot.appendChild(card);
  });

  applyTransform();
  setTimeout(fitAll, 60);
}

// ── Table-scoped Changelog ────────────────────────────────
function renderTableChangelog(entity) {
  changelogContent.innerHTML = '';

  if (!changelogData || changelogData.length === 0) {
    changelogContent.innerHTML = `<div class="wiki-empty"><p>No changelog data available</p></div>`;
    return;
  }

  // Filter to entries that touched this entity
  const relevant = [];
  changelogData.forEach(entry => {
    const diff = entry.diff || {};
    const allGroups = [
      { list: diff.added    || [], status: 'added'    },
      { list: diff.modified || [], status: 'modified' },
      { list: diff.removed  || [], status: 'removed'  }
    ];
    allGroups.forEach(({ list, status }) => {
      const match = list.find(e => e.simpleClassName === entity.simpleClassName);
      if (match) relevant.push({ entry, match, status });
    });
  });

  // Header
  const header = document.createElement('div');
  header.className = 'cl-header';
  header.innerHTML = `
    <h2 class="cl-title">Changelog — <code style="font-size:16px;font-weight:600">${entity.tableName}</code></h2>
    <span style="font-size:12px;color:var(--text-muted)">${relevant.length} version${relevant.length!==1?'s':''} with changes</span>`;
  changelogContent.appendChild(header);

  if (relevant.length === 0) {
    changelogContent.innerHTML += `<div class="wiki-empty" style="min-height:120px"><p>No recorded changes for this table</p></div>`;
    return;
  }

  relevant.forEach(({ entry, match, status }) => {
    const card = document.createElement('div');
    card.className = 'cl-card';

    const { displayName, initials } = parseAuthor(entry.capturedBy);
    const timeAgo    = formatTimeAgo(entry.capturedAt);
    const statusLabel = status === 'added' ? 'Table Created' : status === 'removed' ? 'Table Removed' : 'Table Modified';
    const statusColor = status === 'added' ? 'var(--success)' : status === 'removed' ? 'var(--danger)' : 'var(--warning)';

    const fieldChanges    = match.fieldChanges    || [];
    const relationChanges = match.relationChanges || [];
    const allChanges      = [...fieldChanges, ...relationChanges];

    card.innerHTML = `
      <div class="cl-card-head">
        <div class="cl-card-title">
          <span class="cl-commit-title">${statusLabel}</span>
          <span class="cl-version-num">#${entry.version}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${statusColor}22;color:${statusColor};font-weight:600">${status}</span>
        </div>
        <div class="cl-card-actions">
          <button class="cl-btn-view" onclick="viewVersion(${entry.version})">View changes</button>
        </div>
      </div>
      <div class="cl-author-line">
        <div class="cl-avatar">${initials}</div>
        <span class="cl-author-name">${displayName}</span>
        <span class="cl-author-action">authored ${timeAgo}</span>
      </div>
      ${allChanges.length > 0 ? `
        <div class="cl-changes-box" style="margin-top:8px">
          <div class="cl-changes-label">${allChanges.length} Change${allChanges.length!==1?'s':''}</div>
          <div class="cl-entity-list" style="padding-top:20px">
            ${allChanges.map(c => {
              const isAdd = c.startsWith('+'), isRem = c.startsWith('-'), isMod = c.startsWith('~');
              const color = isAdd ? 'var(--success)' : isRem ? 'var(--danger)' : 'var(--warning)';
              const bgCol = isAdd ? 'var(--success-light)' : isRem ? 'var(--danger-light)' : 'var(--warning-light)';
              const icon  = isAdd ? '+' : isRem ? '−' : '~';
              const text  = c.slice(2).trim();
              return `<div class="cl-entity-item" style="cursor:default;gap:10px">
                <span style="width:18px;height:18px;border-radius:4px;background:${bgCol};color:${color};font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</span>
                <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;color:var(--text)">${escapeHtml(text)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
    `;
    changelogContent.appendChild(card);
  });
}


// Layout: main card on the left, related cards stacked on the right.
// Connector lines run from the right edge of the main card to the
// left edge of each related card.
function renderMiniDiagram(entity) {
  const container = document.getElementById(`mini-svg-${entity.simpleClassName}`);
  if (!container) return;

  const NS   = 'http://www.w3.org/2000/svg';
  const CW   = 160;   // card width
  const HPAD = 22;    // header height
  const FROW = 16;    // field row height
  const PAD  = 16;    // padding inside diagram
  const HGAP = 80;    // horizontal gap between main and related column
  const VGAP = 12;    // vertical gap between related cards
  const MAX_FIELDS = 6;

  function mkEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  // Compute card height based on visible fields
  function cHeight(e) {
    const vis = Math.min((e.fields || []).length, MAX_FIELDS);
    return HPAD + vis * FROW + (e.fields.length > MAX_FIELDS ? FROW : 0) + 8;
  }

  // Collect unique related entities (excluding self-references)
  const relatedNames = [...new Set(
    (entity.relations || [])
      .map(r => r.targetEntity)
      .filter(n => n !== entity.simpleClassName)
  )];
  const relatedEntities = relatedNames
    .map(n => schema.entities.find(e => e.simpleClassName === n))
    .filter(Boolean);

  // Colour map for relation types
  const relColor = {
    ONE_TO_MANY: '#5b6ef5', MANY_TO_ONE: '#8b5cf6',
    MANY_TO_MANY: '#22c55e', ONE_TO_ONE: '#f59e0b'
  };

  // ── Calculate positions ──────────────────────────────────
  const mainH = cHeight(entity);
  const relHeights = relatedEntities.map(cHeight);
  const totalRelH = relHeights.reduce((s, h) => s + h, 0)
                  + VGAP * Math.max(0, relatedEntities.length - 1);

  const diagramH = Math.max(mainH, totalRelH) + PAD * 2;
  const diagramW = relatedEntities.length > 0
    ? CW + HGAP + CW + PAD * 2
    : CW + PAD * 2;

  // Main card: vertically centred on the left
  const mainX = PAD;
  const mainY = PAD + Math.max(0, (diagramH - PAD * 2 - mainH) / 2);

  // Related cards: stacked on the right, centred as a group
  const relStartY = PAD + Math.max(0, (diagramH - PAD * 2 - totalRelH) / 2);
  const relX = PAD + CW + HGAP;
  const relPositions = [];
  let ry = relStartY;
  relatedEntities.forEach((re, i) => {
    relPositions.push({ x: relX, y: ry });
    ry += relHeights[i] + VGAP;
  });

  // ── Build SVG ────────────────────────────────────────────
  const svg = mkEl('svg', {
    xmlns: NS,
    width: diagramW,
    height: diagramH,
    viewBox: `0 0 ${diagramW} ${diagramH}`,
    style: 'display:block;width:100%;'
  });

  // Arrow marker
  const defs = mkEl('defs', {});
  const marker = mkEl('marker', {
    id: `mini-arrow-${entity.simpleClassName}`,
    markerWidth: 8, markerHeight: 6, refX: 8, refY: 3, orient: 'auto'
  });
  const poly = mkEl('polygon', { points: '0 0, 8 3, 0 6', fill: '#a0a8c0' });
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // ── Draw connector lines (behind cards) ──────────────────
  const linesG = mkEl('g', {});
  (entity.relations || []).forEach(rel => {
    const idx = relatedEntities.findIndex(e => e.simpleClassName === rel.targetEntity);
    if (idx === -1) return;
    const rp   = relPositions[idx];
    const rh   = relHeights[idx];
    const x1   = mainX + CW;
    const y1   = mainY + mainH / 2;
    const x2   = rp.x;
    const y2   = rp.y + rh / 2;
    const midX = (x1 + x2) / 2;
    const stroke = relColor[rel.type] || '#c0c7d8';

    const path = mkEl('path', {
      d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
      fill: 'none', stroke, 'stroke-width': 1.5, opacity: 0.75,
      'marker-end': `url(#mini-arrow-${entity.simpleClassName})`
    });
    linesG.appendChild(path);

    // Relation label at midpoint
    const lbl = mkEl('text', {
      x: midX, y: Math.min(y1, y2) - 4,
      fill: stroke, 'font-size': 9,
      'text-anchor': 'middle', 'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': 600
    });
    lbl.textContent = relLabel(rel.type);
    linesG.appendChild(lbl);
  });
  svg.appendChild(linesG);

  // ── Draw a single card ────────────────────────────────────
  function drawCard(e, x, y, isMain) {
    const h   = cHeight(e);
    const col = isMain ? '#5b6ef5' : '#6b7a9b';
    const g   = mkEl('g', { style: 'cursor:pointer' });

    // Shadow
    g.appendChild(mkEl('rect', {
      x: x + 2, y: y + 2, width: CW, height: h, rx: 6,
      fill: 'rgba(0,0,0,0.06)'
    }));

    // Card body
    g.appendChild(mkEl('rect', {
      x, y, width: CW, height: h, rx: 6,
      fill: '#ffffff', stroke: isMain ? '#5b6ef5' : '#dde2ee',
      'stroke-width': isMain ? 2 : 1.5
    }));

    // Header bg
    g.appendChild(mkEl('rect', {
      x, y, width: CW, height: HPAD, rx: 6, fill: col
    }));
    g.appendChild(mkEl('rect', {
      x, y: y + HPAD - 6, width: CW, height: 6, fill: col
    }));

    // Table name in header
    const titleEl = mkEl('text', {
      x: x + 8, y: y + HPAD - 6,
      fill: '#ffffff', 'font-size': 10, 'font-weight': 700,
      'font-family': 'Inter, system-ui, sans-serif'
    });
    titleEl.textContent = e.tableName;
    g.appendChild(titleEl);

    // Fields
    const visFields = (e.fields || []).slice(0, MAX_FIELDS);
    visFields.forEach((f, i) => {
      const fy = y + HPAD + i * FROW + FROW - 3;

      // Key icon for PK
      if (f.id) {
        const key = mkEl('text', {
          x: x + 6, y: fy,
          fill: '#f59e0b', 'font-size': 10,
          'font-family': 'Inter, system-ui, sans-serif'
        });
        key.textContent = '🔑';
        g.appendChild(key);
      }

      // Field name
      const fnEl = mkEl('text', {
        x: x + (f.id ? 20 : 8), y: fy,
        fill: f.id ? '#f59e0b' : '#4a5168',
        'font-size': 10, 'font-weight': f.id ? 600 : 400,
        'font-family': 'Inter, system-ui, sans-serif'
      });
      fnEl.textContent = f.columnName || f.name;
      g.appendChild(fnEl);

      // Type (right-aligned)
      const ftEl = mkEl('text', {
        x: x + CW - 6, y: fy,
        fill: '#a0a8c0', 'font-size': 9,
        'text-anchor': 'end', 'font-family': 'Inter, system-ui, sans-serif'
      });
      ftEl.textContent = mapSqlType(f.javaType);
      g.appendChild(ftEl);

      // Row divider
      if (i < visFields.length - 1) {
        g.appendChild(mkEl('line', {
          x1: x, y1: y + HPAD + (i + 1) * FROW,
          x2: x + CW, y2: y + HPAD + (i + 1) * FROW,
          stroke: '#eaecf4', 'stroke-width': 0.5
        }));
      }
    });

    // "+N more" overflow
    if ((e.fields || []).length > MAX_FIELDS) {
      const moreEl = mkEl('text', {
        x: x + 8, y: y + HPAD + MAX_FIELDS * FROW + FROW - 4,
        fill: '#a0a8c0', 'font-size': 9,
        'font-family': 'Inter, system-ui, sans-serif'
      });
      moreEl.textContent = `+${e.fields.length - MAX_FIELDS} more`;
      g.appendChild(moreEl);
    }

    if (!isMain) {
      g.addEventListener('click', () => selectTable(e.simpleClassName));
    }

    return g;
  }

  // Draw related cards first (behind lines visually if they overlap)
  relatedEntities.forEach((re, i) => {
    svg.appendChild(drawCard(re, relPositions[i].x, relPositions[i].y, false));
  });

  // Draw main card on top
  svg.appendChild(drawCard(entity, mainX, mainY, true));

  // Replace old SVG content
  container.parentNode.replaceChild(svg, container);
}

// ── Changelog rendering ───────────────────────────────────
// Changelog state
let changelogData = null;
let expandedDiffs = new Set(); // version numbers with expanded entity lists

async function loadChangelog() {
  try {
    const res = await fetch(`${API}/changelog`);
    if (!res.ok) throw new Error('failed');
    changelogData = await res.json();
    // Only render into the DOM if the changelog tab is currently visible
    const tab = document.getElementById('tab-changelog');
    if (tab && tab.classList.contains('active')) {
      renderChangelog();
    }
  } catch (e) {
    const tab = document.getElementById('tab-changelog');
    if (tab && tab.classList.contains('active')) {
      changelogContent.innerHTML = `<div class="wiki-empty"><p>Could not load changelog</p></div>`;
    }
  }
}

function renderChangelog() {
  changelogContent.innerHTML = '';

  if (!changelogData || changelogData.length === 0) {
    changelogContent.innerHTML = `<div class="wiki-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
      <p>No changelog data available</p>
    </div>`;
    return;
  }

  // Header bar
  const header = document.createElement('div');
  header.className = 'cl-header';
  header.innerHTML = `<h2 class="cl-title">Changelog — All Tables</h2>`;
  changelogContent.appendChild(header);

  changelogData.forEach((entry, idx) => {
    const diff = entry.diff || {};
    const added    = diff.added    || [];
    const removed  = diff.removed  || [];
    const modified = diff.modified || [];
    const isLatest = idx === 0;
    const isFirst  = added.length > 0 && removed.length === 0 && modified.length === 0 && idx === changelogData.length - 1;

    const totalChanged = added.length + removed.length + modified.length;
    const isExpanded   = expandedDiffs.has(entry.version);

    // Build commit-style title
    const commitTitle = buildCommitTitle(entry, diff, isLatest);

    const card = document.createElement('div');
    card.className = 'cl-card';

    // ── Card header ──
    const cardHead = document.createElement('div');
    cardHead.className = 'cl-card-head';
    cardHead.innerHTML = `
      <div class="cl-card-title">
        <span class="cl-commit-title">${commitTitle}</span>
        <span class="cl-version-num">#${entry.version}</span>
        ${isLatest ? '<span class="cl-latest-badge">Latest version</span>' : ''}
      </div>
      <div class="cl-card-actions">
        <button class="cl-btn-browse" onclick="viewVersion(${entry.version})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Browse
        </button>
        <button class="cl-btn-view" onclick="viewVersion(${entry.version})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          View changes
        </button>
      </div>
    `;
    card.appendChild(cardHead);

    // ── Author line ──
    const authorLine = document.createElement('div');
    authorLine.className = 'cl-author-line';
    const { displayName, initials } = parseAuthor(entry.capturedBy);
    const timeAgo = formatTimeAgo(entry.capturedAt);
    authorLine.innerHTML = `
      <div class="cl-avatar">${initials}</div>
      <span class="cl-author-name">${displayName}</span>
      <span class="cl-author-action">authored ${timeAgo}</span>
    `;
    card.appendChild(authorLine);

    // ── Diff summary badges ──
    if (totalChanged > 0 || isFirst) {
      const summary = document.createElement('div');
      summary.className = 'cl-diff-summary';
      if (added.length > 0) {
        summary.innerHTML += `<span class="cl-badge cl-badge-added">+ ${added.length} Added</span>`;
      }
      if (removed.length > 0) {
        summary.innerHTML += `<span class="cl-badge cl-badge-removed">- ${removed.length} Removed</span>`;
      }
      if (modified.length > 0) {
        summary.innerHTML += `<span class="cl-badge cl-badge-modified">* ${modified.length} Modified</span>`;
      }
      const tableCount = added.length + removed.length + modified.length;
      if (tableCount > 0) {
        summary.innerHTML += `<span class="cl-badge cl-badge-tables">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          ${tableCount} Table${tableCount !== 1 ? 's' : ''}
        </span>`;
      }
      card.appendChild(summary);
    }

    // ── Entities changed box ──
    const allChanges = [
      ...added.map(e => ({ ...e, _status: 'added' })),
      ...removed.map(e => ({ ...e, _status: 'removed' })),
      ...modified.map(e => ({ ...e, _status: 'modified' }))
    ];

    if (allChanges.length > 0) {
      const changesBox = document.createElement('div');
      changesBox.className = 'cl-changes-box';

      const changesLabel = document.createElement('div');
      changesLabel.className = 'cl-changes-label';
      changesLabel.textContent = `${allChanges.length} ${allChanges.length === 1 ? 'Entity' : 'Entities'} Changed`;
      changesBox.appendChild(changesLabel);

      const showMax = 4;
      const toShow  = isExpanded ? allChanges : allChanges.slice(0, showMax);

      const list = document.createElement('div');
      list.className = 'cl-entity-list';      toShow.forEach(e => {
        const item = document.createElement('div');
        item.className = `cl-entity-item cl-entity-${e._status}`;

        const icon = e._status === 'added' ? '+' : e._status === 'removed' ? '−' : '∗';
        const iconClass = `cl-entity-icon cl-icon-${e._status}`;

        // Build sub-changes
        const subChanges = [...(e.fieldChanges || []), ...(e.relationChanges || [])].slice(0, 3);
        const subHtml = subChanges.length > 0
          ? `<div class="cl-sub-changes">${subChanges.map(c => `<span class="cl-sub-change">${escapeHtml(c)}</span>`).join('')}</div>`
          : '';

        item.innerHTML = `
          <span class="${iconClass}">${icon}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cl-table-icon"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span class="cl-entity-name">Table <strong>${escapeHtml(e.tableName)}</strong></span>
          ${subHtml}
        `;
        item.addEventListener('click', () => {
          // Switch to the right version then open the wiki page
          if (schema && schema.version !== entry.version) {
            versionSelect.value = entry.version;
            loadVersion(entry.version).then(() => selectTable(e.simpleClassName));
          } else {
            selectTable(e.simpleClassName);
          }
        });
        list.appendChild(item);
      });
      changesBox.appendChild(list);

      if (allChanges.length > showMax) {
        const more = document.createElement('button');
        more.className = 'cl-show-more';
        more.textContent = isExpanded
          ? '↑ Show less'
          : `↓ Show ${allChanges.length - showMax} more`;
        more.addEventListener('click', () => {
          if (isExpanded) expandedDiffs.delete(entry.version);
          else expandedDiffs.add(entry.version);
          renderChangelog();
        });
        changesBox.appendChild(more);
      }

      card.appendChild(changesBox);
    }

    changelogContent.appendChild(card);

    // ── Between-version gap note ──
    if (idx < changelogData.length - 1) {
      const next = changelogData[idx + 1];
      const skipped = entry.version - next.version - 1;
      if (skipped > 0) {
        const gap = document.createElement('div');
        gap.className = 'cl-gap-note';
        gap.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg> ${skipped} intermediate version${skipped !== 1 ? 's' : ''} skipped <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>`;
        changelogContent.appendChild(gap);
      }
    }
  });
}

function buildCommitTitle(entry, diff, isLatest) {
  const added    = (diff.added    || []).length;
  const removed  = (diff.removed  || []).length;
  const modified = (diff.modified || []).length;
  if (entry.version === 1) return 'Initial schema snapshot';
  if (added > 0 && removed === 0 && modified === 0) return `Add ${added} table${added !== 1 ? 's' : ''}`;
  if (removed > 0 && added === 0 && modified === 0) return `Remove ${removed} table${removed !== 1 ? 's' : ''}`;
  if (modified > 0 && added === 0 && removed === 0) return `Update ${modified} table${modified !== 1 ? 's' : ''}`;
  const parts = [];
  if (added)    parts.push(`+${added}`);
  if (removed)  parts.push(`-${removed}`);
  if (modified) parts.push(`~${modified}`);
  return `Schema changes (${parts.join(', ')})`;
}

function parseAuthor(capturedBy) {
  if (!capturedBy || capturedBy === 'unknown') {
    return { displayName: 'Unknown', initials: '?' };
  }
  // "Name <email>" or just "Name"
  const match = capturedBy.match(/^(.+?)\s*(?:<.+>)?$/);
  const name  = match ? match[1].trim() : capturedBy;
  const parts = name.split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
  return { displayName: name, initials };
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'unknown time ago';
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} day${d !== 1 ? 's' : ''} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo !== 1 ? 's' : ''} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr !== 1 ? 's' : ''} ago`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Maps a tag string to a CSS modifier class for coloring.
 */
function tagClass(tag) {
  const t = (tag || '').toLowerCase().replace(/\s+/g, '-');
  const map = {
    'pii': 'pii', 'spd': 'pii', 'children-data': 'pii',
    'consent-required': 'privacy', 'legal-hold': 'privacy',
    'encrypted': 'security', 'masked': 'security',
    'master-data': 'type', 'transactional': 'type', 'lookup': 'type', 'reference-data': 'type',
    'auditable': 'ops', 'versioned': 'ops',
    'api-exposed': 'api', 'public-api': 'api',
    'deprecated': 'deprecated'
  };
  return map[t] || 'default';
}

/**
 * Human-readable descriptions for every tag and metadata annotation label.
 * Used to populate title/tooltip attributes on chip elements.
 * Keys are the exact label strings shown in the UI (case-insensitive lookup via tagDesc()).
 */
const TAG_DESCRIPTIONS = {
  // Entity header tags
  'PII':              'Personally Identifiable Information — this table contains data that can identify an individual (e.g. name, email, address).',
  'SPD':              'Special/Sensitive Personal Data — GDPR Article 9 category, includes health, religion, biometrics, sexual orientation, etc.',
  'Children Data':    'This table contains data relating to minors (under 18). Extra care and legal safeguards apply.',
  'Consent Required': 'Processing the data in this table requires explicit consent from the data subject.',
  'Legal Hold':       'Data in this table is under a legal hold and must not be deleted or altered until the hold is lifted.',
  'Encrypted':        'Data in this table is stored using encryption at rest (e.g. AES-256). See the "Security" metadata section for the algorithm.',
  'Masked':           'Sensitive values in this table are masked or tokenised before exposure to downstream systems or users.',
  'Master Data':      'This is a master data table — it holds the authoritative, shared reference for a core business entity (e.g. Customer, Product).',
  'Transactional':    'This is a transactional table — it records business events and state changes (e.g. Orders, Payments).',
  'Lookup':           'This is a lookup/code table — it provides a fixed set of valid values used by other tables (e.g. Status, Country).',
  'Reference Data':   'This table holds reference data — relatively static values shared across systems (e.g. Currency codes, ISO standards).',
  'Auditable':        'Row-level changes are audited. Created/updated timestamps and user fields are tracked automatically.',
  'Versioned':        'Optimistic locking is enabled. A version field prevents lost-update conflicts in concurrent writes.',
  'API Exposed':      'This table\'s data is exposed via an internal API endpoint.',
  'Public API':       'This table\'s data is accessible through a public-facing API.',
  'Deprecated':       'This table is deprecated and should no longer be used for new development. Check the metadata for a replacement.',

  // Meta-pill labels (fields table)
  'PII Category':     'The specific category of PII stored (e.g. DIRECT_IDENTIFIER, FINANCIAL, HEALTH). Helps determine the correct handling policy.',
  'SPD':              'Special/Sensitive Personal Data under GDPR Art. 9 — requires explicit consent and heightened protection.',
  'Lawful Basis':     'The GDPR lawful basis for processing this data (e.g. CONSENT, CONTRACT, LEGAL_OBLIGATION, LEGITIMATE_INTEREST).',
  'Classification':   'The data sensitivity classification level (e.g. PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED). Determines who can access this data.',
  'Access':           'The access control level for this field (e.g. PUBLIC, INTERNAL_ONLY, RESTRICTED, ADMIN_ONLY).',
  'Source':           'The upstream system or integration that originates or feeds data into this field.',
  'Derived From':     'This field\'s value is derived or copied from another field or entity.',
  'Expression':       'The expression or formula used to compute this field\'s derived value.',
  'Quality Rules':    'Comma-separated data quality rules that this field must satisfy (e.g. NOT_NULL, POSITIVE, VALID_EMAIL).',
  'Quality Level':    'The assessed data quality level for this field (e.g. HIGH, MEDIUM, LOW).',
  'Business Key':     'This field is a business key — a domain-meaningful identifier used to uniquely identify records in business processes.',
  'Natural Key':      'This field is a natural key — it carries real-world identity and can serve as an alternative to the surrogate primary key.',
  'Searchable':       'This field is indexed and optimised for search/filter queries.',
  'Indexed For':      'Describes the specific query pattern or use case this field\'s index is optimised for.',
  'API Exposed':      'This field is included in API responses.',
  'Public API':       'This field is part of the public API contract and is visible to external consumers.',
  'Remark':           'A free-text implementation note or caveat attached to this field by the data modeller.',
};

/**
 * Returns a tooltip description string for a given tag or pill label.
 * Falls back to an empty string if no description is registered.
 */
function tagDesc(label) {
  if (!label) return '';
  // Case-insensitive lookup
  const key = Object.keys(TAG_DESCRIPTIONS).find(k => k.toLowerCase() === label.toLowerCase());
  return key ? TAG_DESCRIPTIONS[key] : '';
}

function viewVersion(version) {
  versionSelect.value = version;
  loadVersion(version).then(() => {
    switchInnerTab('wiki');
  });
}

const CARD_W       = 180;
const CARD_HEADER_H = 26;
const ROW_H        = 16;
const MAX_ROWS     = 8;
const GROUP_PAD    = 18;   // padding inside group box
const GROUP_TITLE_H = 22;  // height of group title bar
const GROUP_GAP_X  = 60;   // horizontal gap between groups
const GROUP_GAP_Y  = 50;   // vertical gap between groups
const CARD_GAP_X   = 16;   // gap between cards inside a group
const CARD_GAP_Y   = 14;   // gap between card rows inside a group
const COLS_PER_GROUP = 2;  // cards per row inside a group

// ── Group colour palette ──────────────────────────────────
// Colors are derived programmatically from the group name using a hash,
// so any new @BusinessModule / @Domain value automatically gets a stable,
// visually distinct color — no hardcoded map needed.

// A curated palette of hues (in HSL) that are visually distinct and
// look good as card headers on a light background.
const PALETTE_HUES = [
  215,  // blue      — customer / auth
  10,   // red       — order
  145,  // green     — product / inventory
  45,   // amber     — payment / finance
  175,  // teal      — shipping / logistics
  275,  // purple    — notification / review
  0,    // crimson   — security / compliance
  235,  // indigo    — reporting / analytics
  30,   // orange    — admin
  190,  // cyan      — other
  320,  // pink
  90,   // lime
];

/** Stable numeric hash of a string (djb2). */
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

/**
 * Returns [headerBg, groupBgFill, borderColor] for any group name.
 * Colors are derived deterministically so the same module always
 * gets the same color across page reloads and schema versions.
 */
function groupColor(groupName) {
  const key   = (groupName || 'other').toLowerCase().trim();
  const idx   = hashStr(key) % PALETTE_HUES.length;
  const hue   = PALETTE_HUES[idx];
  const hdr   = `hsl(${hue}, 52%, 38%)`;
  const bg    = `hsla(${hue}, 52%, 38%, 0.07)`;
  const border= `hsl(${hue}, 52%, 45%)`;
  return [hdr, bg, border];
}

// Uses module description from the entity list when available
function groupLabel(groupName, groupEntities) {
  return deriveGroupLabel(groupName, groupEntities);
}

function cardHeight(entity) {
  const visible = Math.min((entity.fields || []).length, MAX_ROWS);
  return CARD_HEADER_H + visible * ROW_H + (entity.fields.length > MAX_ROWS ? ROW_H : 0) + 6;
}

// ── Layout: group cards tightly, place groups in a flow grid ─
function autoLayout() {
  if (!schema) return;

  // 1. Build groups
  const groupMap = {};
  schema.entities.forEach(e => {
    const g = deriveGroup(e);
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(e);
  });

  // 2. For each group, compute card positions relative to group origin
  // Then place group boxes in a wrapping row layout
  const groupNames = Object.keys(groupMap).sort();
  const ROW_MAX_W = 1400; // wrap groups after this width
  let gx = 40, gy = 40, rowMaxH = 0;

  groupNames.forEach(gName => {
    const entities = groupMap[gName];

    // Lay cards out in a 2-column grid inside the group
    let maxColH = [0, 0];
    let colW    = [0, 0];
    entities.forEach((e, i) => {
      const col = i % COLS_PER_GROUP;
      const h   = cardHeight(e);
      maxColH[col] += h + (Math.floor(i / COLS_PER_GROUP) > 0 ? CARD_GAP_Y : 0);
      colW[col] = Math.max(colW[col], CARD_W);
    });

    // Actual group inner width & height
    const cols = Math.min(entities.length, COLS_PER_GROUP);
    const innerW = cols * CARD_W + (cols - 1) * CARD_GAP_X;
    const innerH = (() => {
      // sum of tallest card per row
      let h = 0;
      const rows = Math.ceil(entities.length / COLS_PER_GROUP);
      for (let r = 0; r < rows; r++) {
        let rowH = 0;
        for (let c = 0; c < COLS_PER_GROUP; c++) {
          const idx = r * COLS_PER_GROUP + c;
          if (idx < entities.length) rowH = Math.max(rowH, cardHeight(entities[idx]));
        }
        h += rowH + (r > 0 ? CARD_GAP_Y : 0);
      }
      return h;
    })();

    const boxW = innerW + GROUP_PAD * 2;
    const boxH = innerH + GROUP_PAD * 2 + GROUP_TITLE_H;

    // Wrap to next row if needed
    if (gx > 40 && gx + boxW > ROW_MAX_W) {
      gx = 40;
      gy += rowMaxH + GROUP_GAP_Y;
      rowMaxH = 0;
    }

    // Store group origin in positions under a special key
    positions[`__group__${gName}`] = { x: gx, y: gy, w: boxW, h: boxH };

    // Position each card inside the group
    let cardY = gy + GROUP_TITLE_H + GROUP_PAD;
    const rows = Math.ceil(entities.length / COLS_PER_GROUP);
    for (let r = 0; r < rows; r++) {
      let rowH = 0;
      for (let c = 0; c < COLS_PER_GROUP; c++) {
        const idx = r * COLS_PER_GROUP + c;
        if (idx < entities.length) rowH = Math.max(rowH, cardHeight(entities[idx]));
      }
      for (let c = 0; c < COLS_PER_GROUP; c++) {
        const idx = r * COLS_PER_GROUP + c;
        if (idx >= entities.length) break;
        const e = entities[idx];
        if (!positions[e.simpleClassName]) {
          positions[e.simpleClassName] = {
            x: gx + GROUP_PAD + c * (CARD_W + CARD_GAP_X),
            y: cardY
          };
        }
      }
      cardY += rowH + CARD_GAP_Y;
    }

    rowMaxH = Math.max(rowMaxH, boxH);
    gx += boxW + GROUP_GAP_X;
  });
}

function renderCanvas() {
  canvasRoot.innerHTML = '';
  _lineCounter = 0;
  if (!schema || !schema.entities.length) return;

  // 1. Group background boxes (bottom layer)
  const groupsLayer = svgMake('g', { class: 'groups-layer' });
  const groupMap = {};
  schema.entities.forEach(e => {
    const g = deriveGroup(e);
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(e);
  });
  Object.keys(groupMap).sort().forEach(gName => {
    const gp = positions[`__group__${gName}`];
    if (!gp) return;
    const [hdrCol, bgCol, borderCol] = groupColor(gName);

    const grpG = svgMake('g', { class: 'group-box', style: 'cursor:grab' });

    // Outer box
    grpG.appendChild(svgMake('rect', {
      x: gp.x, y: gp.y, width: gp.w, height: gp.h, rx: 8,
      fill: bgCol, stroke: borderCol, 'stroke-width': 1.5
    }));
    // Title bar
    grpG.appendChild(svgMake('rect', {
      x: gp.x, y: gp.y, width: gp.w, height: GROUP_TITLE_H, rx: 8,
      fill: hdrCol
    }));
    grpG.appendChild(svgMake('rect', {
      x: gp.x, y: gp.y + GROUP_TITLE_H - 6, width: gp.w, height: 6,
      fill: hdrCol
    }));
    // Title text
    const lbl = svgMake('text', {
      x: gp.x + 10, y: gp.y + GROUP_TITLE_H - 7,
      fill: '#fff', 'font-size': 11, 'font-weight': 700,
      'font-family': 'Inter, system-ui, sans-serif',
      style: 'pointer-events:none'
    });
    lbl.textContent = `▸ ${groupLabel(gName)}`;
    grpG.appendChild(lbl);

    makeGroupDraggable(grpG, gName);
    groupsLayer.appendChild(grpG);
  });
  canvasRoot.appendChild(groupsLayer);

  // 2. Relation lines (middle layer)
  const linesGroup = svgMake('g', { class: 'lines-layer' });
  schema.entities.forEach(entity => {
    (entity.relations || []).forEach(rel => drawRelationLine(linesGroup, entity, rel));
  });
  canvasRoot.appendChild(linesGroup);

  // 3. Entity cards (top layer)
  schema.entities.forEach(entity => {
    canvasRoot.appendChild(drawEntityCard(entity));
  });

  applyTransform();
}

function applyTransform() {
  canvasRoot.setAttribute('transform', `translate(${viewX},${viewY}) scale(${viewScale})`);
}

function drawEntityCard(entity) {
  const pos    = positions[entity.simpleClassName] || { x: 60, y: 60 };
  const fields = entity.fields || [];
  const vis    = fields.slice(0, MAX_ROWS);
  const h      = cardHeight(entity);
  const gName  = deriveGroup(entity);
  const [hdrCol] = groupColor(gName);

  const g = svgMake('g', { class: 'entity-card', 'data-name': entity.simpleClassName });

  // Shadow
  g.appendChild(svgMake('rect', {
    x: pos.x + 2, y: pos.y + 2, width: CARD_W, height: h, rx: 5,
    fill: 'rgba(0,0,0,0.08)'
  }));

  // Body
  g.appendChild(svgMake('rect', {
    class: 'entity-card-bg',
    x: pos.x, y: pos.y, width: CARD_W, height: h, rx: 5
  }));

  // Header
  g.appendChild(svgMake('rect', {
    x: pos.x, y: pos.y, width: CARD_W, height: CARD_HEADER_H, rx: 5,
    fill: hdrCol
  }));
  g.appendChild(svgMake('rect', {
    x: pos.x, y: pos.y + CARD_HEADER_H - 5, width: CARD_W, height: 5,
    fill: hdrCol
  }));

  // Header label: "group.tablename"
  const headerLabel = svgMake('text', {
    x: pos.x + 8, y: pos.y + CARD_HEADER_H - 8,
    fill: '#fff', 'font-size': 10, 'font-weight': 700,
    'font-family': 'Inter, system-ui, sans-serif'
  });
  headerLabel.textContent = `${gName}.${entity.tableName}`;
  g.appendChild(headerLabel);

  // Field rows
  vis.forEach((field, i) => {
    const fy    = pos.y + CARD_HEADER_H + i * ROW_H + ROW_H - 3;
    const isPk  = field.id;

    // Row bg on hover (use a transparent rect as hit area)
    const rowBg = svgMake('rect', {
      x: pos.x, y: pos.y + CARD_HEADER_H + i * ROW_H,
      width: CARD_W, height: ROW_H,
      fill: 'transparent'
    });
    g.appendChild(rowBg);

    // Row divider
    if (i > 0) {
      g.appendChild(svgMake('line', {
        x1: pos.x, y1: pos.y + CARD_HEADER_H + i * ROW_H,
        x2: pos.x + CARD_W, y2: pos.y + CARD_HEADER_H + i * ROW_H,
        stroke: '#eaecf4', 'stroke-width': 0.5
      }));
    }

    // PK key emoji
    if (isPk) {
      // Left edge PK anchor indicator (where incoming lines attach)
      g.appendChild(svgMake('rect', {
        x: pos.x, y: pos.y + CARD_HEADER_H + i * ROW_H,
        width: 3, height: ROW_H,
        fill: '#f59e0b', rx: 0
      }));
      const key = svgMake('text', { x: pos.x + 7, y: fy, 'font-size': 9, fill: '#f59e0b' });
      key.textContent = '🔑';
      g.appendChild(key);
    }

    // Field name
    const fname = svgMake('text', {
      x: pos.x + (isPk ? 20 : 8), y: fy,
      fill: isPk ? '#f59e0b' : '#2d3450',
      'font-size': 10, 'font-weight': isPk ? 600 : 400,
      'font-family': 'Inter, system-ui, sans-serif'
    });
    fname.textContent = field.columnName || field.name;
    g.appendChild(fname);

    // Field type — right-aligned, leave space for the right-side exit indicator on source
    const ftype = svgMake('text', {
      x: pos.x + CARD_W - 6, y: fy,
      fill: '#9aa0b4', 'font-size': 9,
      'text-anchor': 'end',
      'font-family': 'Inter, system-ui, sans-serif'
    });
    ftype.textContent = mapSqlType(field.javaType);
    g.appendChild(ftype);
  });

  if (fields.length > MAX_ROWS) {
    const moreY = pos.y + CARD_HEADER_H + MAX_ROWS * ROW_H + ROW_H - 4;
    const more = svgMake('text', {
      x: pos.x + 8, y: moreY,
      fill: '#9aa0b4', 'font-size': 9,
      'font-family': 'Inter, system-ui, sans-serif'
    });
    more.textContent = `+${fields.length - MAX_ROWS} more…`;
    g.appendChild(more);
  }

  g.addEventListener('click', () => selectTable(entity.simpleClassName));
  makeDraggable(g, entity.simpleClassName);
  return g;
}

// ── Orthogonal connector lines anchored to PK rows ────────
let _lineCounter = 0;

// Returns the Y centre of the PK (id) field row for an entity card
function pkRowY(entity) {
  const pos = positions[entity.simpleClassName];
  if (!pos) return null;
  const pkIdx = (entity.fields || []).findIndex(f => f.id);
  const row   = pkIdx < 0 ? 0 : pkIdx;
  // mid-point of that row
  return pos.y + CARD_HEADER_H + row * ROW_H + ROW_H / 2;
}

// Check if a horizontal segment y=fy, from x=xa to x=xb passes through any card rect
// Returns the set of cards it overlaps (excluding the two endpoints)
function segmentOverlapsCards(xa, xb, fy, excludeNames) {
  if (!schema) return [];
  const xMin = Math.min(xa, xb) + 2;
  const xMax = Math.max(xa, xb) - 2;
  return schema.entities.filter(e => {
    if (excludeNames.has(e.simpleClassName)) return false;
    const p = positions[e.simpleClassName];
    if (!p) return false;
    const h = cardHeight(e);
    return xMax > p.x && xMin < p.x + CARD_W &&
           fy > p.y && fy < p.y + h;
  });
}

// Check if a vertical segment x=fx, from y=ya to y=yb passes through any card
function vertSegmentOverlapsCards(fx, ya, yb, excludeNames) {
  if (!schema) return [];
  const yMin = Math.min(ya, yb) + 2;
  const yMax = Math.max(ya, yb) - 2;
  return schema.entities.filter(e => {
    if (excludeNames.has(e.simpleClassName)) return false;
    const p = positions[e.simpleClassName];
    if (!p) return false;
    const h = cardHeight(e);
    return fx > p.x && fx < p.x + CARD_W &&
           yMax > p.y && yMin < p.y + h;
  });
}

function drawRelationLine(parent, fromEntity, rel) {
  if (rel.mappedBy) return;

  const fromPos = positions[fromEntity.simpleClassName];
  const toPos   = positions[rel.targetEntity];
  if (!fromPos || !toPos) return;
  if (fromEntity.simpleClassName === rel.targetEntity) return;

  const toEntity = schema.entities.find(e => e.simpleClassName === rel.targetEntity);
  if (!toEntity) return;

  const fh   = cardHeight(fromEntity);
  const th   = cardHeight(toEntity);
  const excl = new Set([fromEntity.simpleClassName, rel.targetEntity]);

  // ── Anchor points on PK rows ───────────────────────────
  // Source: exits from the RIGHT edge of its PK row
  const srcY  = pkRowY(fromEntity) ?? (fromPos.y + fh / 2);
  const srcX  = fromPos.x + CARD_W;          // right edge of source

  // Target: enters at the LEFT edge of its PK row
  const dstY  = pkRowY(toEntity)   ?? (toPos.y + th / 2);
  const dstX  = toPos.x;                     // left edge of target

  // ── Route: try direct 3-segment orthogonal path ────────
  // Canonical: srcX → midX → midX → dstX  (right-elbow-right)
  // If midX falls inside a card, we add a detour around it.

  const MARGIN = 14; // clearance around cards for routing

  let midX = srcX + (dstX - srcX) / 2;

  // Check if the vertical segment at midX overlaps any card
  const vOverlaps = vertSegmentOverlapsCards(midX, srcY, dstY, excl);
  if (vOverlaps.length > 0) {
    // Push midX to the right of all overlapping cards + margin
    const rightEdge = Math.max(...vOverlaps.map(e => positions[e.simpleClassName].x + CARD_W));
    midX = rightEdge + MARGIN;
  }

  // Now check horizontal legs for card overlaps and detour if needed
  // Leg 1: srcX → midX at srcY
  const h1Overlaps = segmentOverlapsCards(srcX, midX, srcY, excl);
  // Leg 2: midX → dstX at dstY
  const h2Overlaps = segmentOverlapsCards(midX, dstX, dstY, excl);

  let path;
  if (h1Overlaps.length === 0 && h2Overlaps.length === 0) {
    // Clean 3-segment path
    path = `M ${srcX} ${srcY} L ${midX} ${srcY} L ${midX} ${dstY} L ${dstX} ${dstY}`;
  } else {
    // Fall back to 5-segment path going out wide to avoid overlaps
    // Find the clearance corridor: go right from srcX enough to clear all obstacles,
    // then travel vertically outside all cards, then come in.
    const allObs = [...h1Overlaps, ...h2Overlaps, ...vOverlaps];
    const detourX = Math.max(
      srcX + MARGIN,
      ...allObs.map(e => positions[e.simpleClassName].x + CARD_W + MARGIN)
    );
    path = `M ${srcX} ${srcY} L ${detourX} ${srcY} L ${detourX} ${dstY} L ${dstX} ${dstY}`;
  }

  const relColorMap = {
    ONE_TO_MANY:  '#5b6ef5',
    MANY_TO_ONE:  '#8b5cf6',
    MANY_TO_MANY: '#22c55e',
    ONE_TO_ONE:   '#f59e0b'
  };
  const arrowMarkerMap = {
    ONE_TO_MANY:  'url(#arrow-blue)',
    MANY_TO_ONE:  'url(#arrow-purple)',
    MANY_TO_MANY: 'url(#arrow-green)',
    ONE_TO_ONE:   'url(#arrow-amber)'
  };
  const stroke      = relColorMap[rel.type]    || '#a0a8c0';
  const arrowMarker = arrowMarkerMap[rel.type] || 'url(#arrow-end)';

  // Path length approx for dash timing (Manhattan)
  const pathLen    = Math.abs(dstX - srcX) + Math.abs(dstY - srcY);
  const lineId     = `rel-pulse-${_lineCounter++}`;
  const DASH_LEN   = 12;
  const GAP_LEN    = Math.max(pathLen, DASH_LEN + 10);
  const DURATION   = Math.max(0.7, pathLen / 150).toFixed(2);
  const totalTravel = DASH_LEN + GAP_LEN;
  const animName   = `pulse_${lineId.replace(/-/g, '_')}`;

  // 1. Static base line
  parent.appendChild(svgMake('path', {
    d: path, fill: 'none',
    stroke, 'stroke-width': 1.5, opacity: 0.3,
    'stroke-linejoin': 'round',
    'marker-end': arrowMarker
  }));

  // 2. Animated pulse dash
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = `
    #${lineId} { animation: ${animName} ${DURATION}s linear infinite; }
    @keyframes ${animName} {
      from { stroke-dashoffset: ${totalTravel}px; }
      to   { stroke-dashoffset: 0px; }
    }
  `;
  parent.appendChild(styleEl);

  parent.appendChild(svgMake('path', {
    id: lineId,
    d: path, fill: 'none',
    stroke, 'stroke-width': 2.5, opacity: 0.9,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'stroke-dasharray': `${DASH_LEN} ${GAP_LEN}`,
    'stroke-dashoffset': `${totalTravel}`,
    'marker-end': arrowMarker
  }));
}

function relLabel(type) {
  switch (type) {
    case 'ONE_TO_MANY': return '1:N';
    case 'MANY_TO_ONE': return 'N:1';
    case 'MANY_TO_MANY': return 'N:M';
    case 'ONE_TO_ONE':  return '1:1';
    default: return type;
  }
}

// ── Draggable cards AND group boxes ──────────────────────
function makeDraggable(g, name) {
  let dragging = false, startX, startY, startPositions = {};

  g.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;

    // Snapshot starting positions for this card and its group siblings
    const gName = name.startsWith('__group__') ? name.slice(9) : null;
    startPositions = {};

    if (gName) {
      // dragging a group box — move all cards in the group + the group box
      startPositions[`__group__${gName}`] = { ...positions[`__group__${gName}`] };
      const groupEntities = schema ? schema.entities.filter(e => deriveGroup(e) === gName) : [];
      groupEntities.forEach(e => {
        startPositions[e.simpleClassName] = { ...positions[e.simpleClassName] };
      });
    } else {
      // dragging a single card
      startPositions[name] = { ...positions[name] };
    }

    const onMove = (ev) => {
      if (!dragging) return;
      const dx = (ev.clientX - startX) / viewScale;
      const dy = (ev.clientY - startY) / viewScale;
      Object.keys(startPositions).forEach(k => {
        if (positions[k]) {
          positions[k] = { ...positions[k], x: startPositions[k].x + dx, y: startPositions[k].y + dy };
        }
      });

      // If dragging a group, keep the group box w/h but update x/y from its key
      // (w/h were set at layout time and don't need recalculation on drag)
      renderCanvas();
    };

    const onUp = () => {
      dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

function makeGroupDraggable(g, gName) {
  makeDraggable(g, `__group__${gName}`);
}

// ── Pan & Zoom ────────────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isPanning = true;
  panStart = { x: e.clientX - viewX, y: e.clientY - viewY };
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  viewX = e.clientX - panStart.x;
  viewY = e.clientY - panStart.y;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();

  if (e.ctrlKey) {
    // Pinch-to-zoom (trackpad pinch sends wheel + ctrlKey)
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    viewX = mx - (mx - viewX) * factor;
    viewY = my - (my - viewY) * factor;
    viewScale = Math.min(Math.max(viewScale * factor, 0.2), 3);
  } else {
    // Scroll to pan
    viewX -= e.deltaX;
    viewY -= e.deltaY;
  }

  applyTransform();
}, { passive: false });

// ── Fit / Reset ───────────────────────────────────────────
document.getElementById('btn-fit').addEventListener('click', fitAll);
document.getElementById('btn-reset').addEventListener('click', () => {
  viewX = 0; viewY = 0; viewScale = 1;
  positions = {};
  autoLayout();
  renderCanvas();
});

function fitAll() {
  if (!schema || !schema.entities.length) return;
  const svgRect = canvas.getBoundingClientRect();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  schema.entities.forEach(e => {
    const pos = positions[e.simpleClassName];
    if (!pos) return;
    const h = cardHeight(e);
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + CARD_W);
    maxY = Math.max(maxY, pos.y + h);
  });
  const contentW = maxX - minX + 80;
  const contentH = maxY - minY + 80;
  const scaleX = svgRect.width / contentW;
  const scaleY = svgRect.height / contentH;
  viewScale = Math.min(scaleX, scaleY, 1);
  viewX = (svgRect.width - contentW * viewScale) / 2 - minX * viewScale + 40 * viewScale;
  viewY = (svgRect.height - contentH * viewScale) / 2 - minY * viewScale + 40 * viewScale;
  applyTransform();
}

// ── SVG helpers ───────────────────────────────────────────
function svgMake(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, error = false) {
  toast.textContent = msg;
  toast.style.borderColor = error ? 'var(--danger)' : 'var(--success)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
