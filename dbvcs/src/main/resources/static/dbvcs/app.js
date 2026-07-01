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
// Group by the first segment of the table name when split by "_".
// e.g. "order_items" → "order", "order_list" → "order", "users" → "users"
function deriveGroup(entity) {
  const tbl = entity.tableName || '';
  return tbl.split('_')[0] || 'default';
}

// Full qualified label shown in sidebar: "order.order_items"
function qualifiedLabel(entity) {
  return `${deriveGroup(entity)}.${entity.tableName}`;
}

// Keep backward compat — deriveSchema now returns the group name
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
  tooltipFieldName.textContent = `Field ${field.name}`;
  tooltipFieldType.textContent = `Type ${field.javaType}`;
  tooltipFieldDesc.textContent = field.comment ? field.comment : generateFieldDesc(field);
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

  // Page header
  html += `<div class="wiki-page-header">
    <div class="wiki-page-title">
      <div class="wiki-table-icon">T</div>
      <h1>${entity.tableName} Table</h1>
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
    </div>
  </div>`;

  // Description
  const tableDesc = entity.comment
    ? entity.comment
    : `Stores information about each ${entity.tableName.replace(/_/g, ' ').replace(/s$/, '')} record in the system.`;

  html += `<div class="wiki-section">
    <h2>${entity.simpleClassName} Table</h2>
    <p>${tableDesc}</p>
  </div>`;

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

  // Build FK map: which fields are foreign keys from relations
  const fkTargets = {};
  relations.forEach(r => {
    if (r.type === 'MANY_TO_ONE' || r.type === 'ONE_TO_ONE') {
      fkTargets[r.fieldName] = r.targetEntity;
    }
  });

  let rows = '';
  fields.forEach(f => {
    const tags = buildTags(f, fkTargets[f.name]);
    const refs = buildRefs(entity, f, fkTargets[f.name]);
    rows += `<tr>
      <td><div class="col-name">
        <div class="col-icon ${f.id ? 'pk' : ''}">${f.id ? 'PK' : getTypeAbbr(f.javaType)}</div>
        <span>${f.columnName || f.name}</span>
      </div></td>
      <td><code class="col-code">${mapSqlType(f.javaType)}</code></td>
      <td>${tags}</td>
      <td>${refs}</td>
      <td style="color:var(--text-muted);font-size:12px">${f.comment ? escapeHtml(f.comment) : generateFieldDesc(f)}</td>
      <td style="color:var(--text-muted);font-size:11px;white-space:nowrap">+ now</td>
    </tr>`;
  });

  return `<table class="wiki-table">
    <thead><tr>
      <th>Name</th>
      <th>Type</th>
      <th>Settings</th>
      <th>References</th>
      <th>Default Value &amp; Notes</th>
      <th>Last Updated</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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

function buildRefs(entity, field, fkTarget) {
  if (!fkTarget) {
    // Check if other entities reference this field
    const refs = [];
    if (schema) {
      schema.entities.forEach(e => {
        if (e.simpleClassName === entity.simpleClassName) return;
        (e.relations || []).forEach(r => {
          if (r.targetEntity === entity.simpleClassName &&
              (r.type === 'MANY_TO_ONE' || r.type === 'ONE_TO_ONE')) {
            refs.push({ entity: e.simpleClassName, table: e.tableName });
          }
        });
      });
    }
    if (refs.length === 0) return '—';
    const shown = refs.slice(0, 2);
    let html = shown.map(r =>
      `<div><a class="ref-link" data-target="${r.entity}">
        <span class="ref-arrow">↔</span> ${r.table}.${field.columnName || field.name}
      </a></div>`
    ).join('');
    if (refs.length > 2) html += `<div style="color:var(--text-muted);font-size:11px">+${refs.length-2} more</div>`;
    return html;
  }
  const targetEntity = schema.entities.find(e => e.simpleClassName === fkTarget);
  const targetTable = targetEntity ? targetEntity.tableName : fkTarget.toLowerCase() + 's';
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
        <th>Table</th><th>Class</th><th>Fields</th><th>Relations</th><th>Description</th>
      </tr></thead>
      <tbody>
        ${entities.map(e => `<tr onclick="selectTable('${e.simpleClassName}')" style="cursor:pointer">
          <td><div class="col-name">
            <div class="col-icon" style="background:var(--accent-light);color:var(--accent);border-color:rgba(91,110,245,0.2)">T</div>
            <span>${e.tableName}</span>
          </div></td>
          <td style="color:var(--text-muted);font-size:12px">${e.simpleClassName}</td>
          <td style="color:var(--text-muted)">${(e.fields||[]).length}</td>
          <td style="color:var(--text-muted)">${(e.relations||[]).length}</td>
          <td style="color:var(--text-muted);font-size:12px">${e.comment ? escapeHtml(e.comment.substring(0,80)) + (e.comment.length>80?'…':'') : '—'}</td>
        </tr>`).join('')}
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

function viewVersion(version) {
  versionSelect.value = version;
  loadVersion(version).then(() => {
    switchInnerTab('wiki');
  });
}

// ── Export HTML ───────────────────────────────────────────
document.getElementById('btn-export-html').addEventListener('click', exportHtml);

function exportHtml() {
  if (!schema) { showToast('No schema loaded', true); return; }

  const isTableView = !!activeTable;
  const entity = isTableView
    ? schema.entities.find(e => e.simpleClassName === activeTable)
    : null;

  const title = isTableView
    ? `${entity.tableName} — dbvcs docs`
    : `Schema v${schema.version} — dbvcs docs`;

  // ── Build page sections ──────────────────────────────────
  let bodyHtml = '';

  // 1. Wiki section
  bodyHtml += `<section class="export-section" id="section-wiki">
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Wiki
    </div>
    ${isTableView ? buildExportTableWiki(entity) : buildExportSystemWiki()}
  </section>`;

  // 2. Diagram section (SVG snapshot)
  bodyHtml += `<section class="export-section" id="section-diagram">
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="17.5" y1="10" x2="17.5" y2="14"/><line x1="6.5" y1="10" x2="17.5" y2="10"/><line x1="6.5" y1="10" x2="6.5" y2="14"/></svg>
      Diagram
    </div>
    ${buildExportDiagram(entity)}
  </section>`;

  // 3. Changelog section
  bodyHtml += `<section class="export-section" id="section-changelog">
    <div class="export-section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      Changelog
    </div>
    ${isTableView ? buildExportTableChangelog(entity) : buildExportSystemChangelog()}
  </section>`;

  // ── Assemble full HTML ───────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${escapeHtml(title)}</title>
  <style>${exportCss()}</style>
</head>
<body>
  <header class="ex-topbar">
    <div class="ex-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/>
      </svg>
      <span>dbvcs</span>
    </div>
    <div class="ex-title">${escapeHtml(isTableView ? entity.tableName : 'Schema Overview')}</div>
    <div class="ex-meta">
      Version ${schema.version}
      &nbsp;·&nbsp;
      ${schema.capturedAt ? new Date(schema.capturedAt).toLocaleString() : ''}
      ${schema.capturedBy ? '&nbsp;·&nbsp; by ' + escapeHtml(schema.capturedBy) : ''}
    </div>
  </header>

  <nav class="ex-nav">
    <a href="#section-wiki">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Wiki
    </a>
    <a href="#section-diagram">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="17.5" y1="10" x2="17.5" y2="14"/><line x1="6.5" y1="10" x2="17.5" y2="10"/><line x1="6.5" y1="10" x2="6.5" y2="14"/></svg>
      Diagram
    </a>
    <a href="#section-changelog">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      Changelog
    </a>
    <span class="ex-nav-spacer"></span>
    <span class="ex-generated">Generated by dbvcs · ${new Date().toLocaleString()}</span>
  </nav>

  <main class="ex-main">
    ${bodyHtml}
  </main>
</body>
</html>`;

  // ── Download ─────────────────────────────────────────────
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = isTableView
    ? `dbvcs-${entity.tableName}-v${schema.version}.html`
    : `dbvcs-schema-v${schema.version}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${a.download}`);
}

// ── Export: Table Wiki ────────────────────────────────────
function buildExportTableWiki(entity) {
  const fields    = entity.fields    || [];
  const relations = entity.relations || [];
  const desc = entity.comment
    ? escapeHtml(entity.comment)
    : `Stores information about each ${entity.tableName.replace(/_/g, ' ')} record in the system.`;

  // FK map
  const fkTargets = {};
  relations.forEach(r => {
    if (r.type === 'MANY_TO_ONE' || r.type === 'ONE_TO_ONE') fkTargets[r.fieldName] = r.targetEntity;
  });

  const fieldRows = fields.map(f => {
    const isPk = f.id;
    const isFk = !!fkTargets[f.name];
    const tags = [
      isPk ? '<span class="ex-tag ex-pk">PK</span><span class="ex-tag ex-inc">increment</span>' : '',
      isFk ? '<span class="ex-tag ex-fk">FK</span>' : '',
      !f.nullable && !isPk ? '<span class="ex-tag ex-nn">NOT NULL</span>' : '',
      f.nullable  && !isPk ? '<span class="ex-tag ex-null">null</span>'   : ''
    ].join('');
    const note = f.comment ? escapeHtml(f.comment) : generateFieldDesc(f);
    return `<tr>
      <td><span class="ex-col-badge ${isPk ? 'pk' : ''}">${isPk ? 'PK' : getTypeAbbr(f.javaType)}</span> ${escapeHtml(f.columnName || f.name)}</td>
      <td><code>${mapSqlType(f.javaType)}</code></td>
      <td>${tags || '—'}</td>
      <td style="color:#7a829e;font-size:12px">${note}</td>
    </tr>`;
  }).join('');

  const relRows = relations.map(r =>
    `<tr>
      <td>${escapeHtml(r.fieldName)}</td>
      <td><span class="ex-rel-badge">${r.type.replace(/_/g,' ')}</span></td>
      <td>${escapeHtml(r.targetEntity)}</td>
      <td style="color:#7a829e;font-size:12px">${r.mappedBy ? 'mapped by ' + r.mappedBy : (r.optional ? 'optional' : 'required')}</td>
    </tr>`
  ).join('');

  return `
    <div class="ex-page-header">
      <div class="ex-page-title">
        <span class="ex-table-badge">T</span>
        <h1>${escapeHtml(entity.tableName)}</h1>
      </div>
      <div class="ex-page-meta">
        <span>${fields.length} fields</span>
        <span>${relations.length} relations</span>
        <span>${escapeHtml(entity.simpleClassName)}</span>
      </div>
    </div>
    <div class="ex-card">
      <h3>Description</h3>
      <p>${desc}</p>
    </div>
    <div class="ex-card">
      <h3>Fields (${fields.length})</h3>
      <table class="ex-table">
        <thead><tr><th>Column</th><th>Type</th><th>Constraints</th><th>Notes</th></tr></thead>
        <tbody>${fieldRows}</tbody>
      </table>
    </div>
    ${relations.length > 0 ? `
    <div class="ex-card">
      <h3>Relationships (${relations.length})</h3>
      <table class="ex-table">
        <thead><tr><th>Field</th><th>Type</th><th>Target</th><th>Notes</th></tr></thead>
        <tbody>${relRows}</tbody>
      </table>
    </div>` : ''}`;
}

// ── Export: System Wiki ───────────────────────────────────
function buildExportSystemWiki() {
  const entities = schema.entities || [];
  const totalFields    = entities.reduce((s,e) => s + (e.fields    || []).length, 0);
  const totalRelations = entities.reduce((s,e) => s + (e.relations || []).length, 0);

  const groups = {};
  entities.forEach(e => {
    const g = deriveGroup(e);
    if (!groups[g]) groups[g] = [];
    groups[g].push(e);
  });

  const groupCards = Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).map(([g, ents]) => {
    const [col] = groupColor(g);
    const rows = ents.map(e =>
      `<tr>
        <td><strong>${escapeHtml(e.tableName)}</strong></td>
        <td style="color:#7a829e">${escapeHtml(e.simpleClassName)}</td>
        <td style="color:#7a829e">${(e.fields||[]).length}</td>
        <td style="color:#7a829e">${(e.relations||[]).length}</td>
        <td style="color:#7a829e;font-size:11px">${e.comment ? escapeHtml(e.comment.substring(0,80))+(e.comment.length>80?'…':'') : '—'}</td>
      </tr>`
    ).join('');
    return `<div class="ex-card">
      <h3 style="color:${col}">${g.charAt(0).toUpperCase()+g.slice(1)} (${ents.length} tables)</h3>
      <table class="ex-table">
        <thead><tr><th>Table</th><th>Class</th><th>Fields</th><th>Relations</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  return `
    <div class="ex-page-header">
      <div class="ex-page-title">
        <span class="ex-table-badge" style="background:#0d9488">S</span>
        <h1>Schema Overview</h1>
      </div>
      <div class="ex-page-meta">
        <span>${entities.length} tables</span>
        <span>${totalFields} fields</span>
        <span>${totalRelations} relations</span>
        <span>${Object.keys(groups).length} domain groups</span>
      </div>
    </div>
    ${groupCards}`;
}

// ── Export: Diagram (SVG snapshot) ───────────────────────
function buildExportDiagram(entity) {
  // Snapshot the live SVG canvas
  const svgEl = document.getElementById('canvas');
  if (!svgEl) return '<p style="color:#7a829e">No diagram available</p>';

  // If table view, render the focused diagram first
  if (entity) {
    renderTableDiagram(entity.simpleClassName);
  } else {
    autoLayout();
    renderCanvas();
  }

  // Clone and serialise
  const clone = svgEl.cloneNode(true);
  // Remove animations for static export
  clone.querySelectorAll('style').forEach(s => s.remove());
  clone.querySelectorAll('path[id^="rel-pulse"]').forEach(p => p.remove());

  const bbox = svgEl.getBoundingClientRect();
  clone.setAttribute('width',  bbox.width  || 900);
  clone.setAttribute('height', bbox.height || 500);
  clone.style.cssText = 'display:block;max-width:100%;border:1px solid #dde2ee;border-radius:8px;background:#f8f9fc';

  const serialised = new XMLSerializer().serializeToString(clone);
  return `<div class="ex-card ex-diagram-wrap">${serialised}</div>`;
}

// ── Export: Table Changelog ───────────────────────────────
function buildExportTableChangelog(entity) {
  if (!changelogData || changelogData.length === 0) return '<p style="color:#7a829e">No changelog data available</p>';

  const relevant = [];
  changelogData.forEach(entry => {
    const diff = entry.diff || {};
    [{ list: diff.added||[], status:'added' }, { list: diff.modified||[], status:'modified' }, { list: diff.removed||[], status:'removed' }]
      .forEach(({ list, status }) => {
        const match = list.find(e => e.simpleClassName === entity.simpleClassName);
        if (match) relevant.push({ entry, match, status });
      });
  });

  if (relevant.length === 0) return '<p style="color:#7a829e">No recorded changes for this table</p>';

  return relevant.map(({ entry, match, status }) => {
    const { displayName } = parseAuthor(entry.capturedBy);
    const timeAgo = formatTimeAgo(entry.capturedAt);
    const color = status === 'added' ? '#22c55e' : status === 'removed' ? '#ef4444' : '#f59e0b';
    const changes = [...(match.fieldChanges||[]), ...(match.relationChanges||[])];
    const changeRows = changes.map(c => {
      const isAdd=c.startsWith('+'), isRem=c.startsWith('-');
      const col = isAdd?'#22c55e':isRem?'#ef4444':'#f59e0b';
      const icon= isAdd?'+':isRem?'−':'~';
      return `<div style="display:flex;gap:10px;padding:6px 16px;border-bottom:1px solid #eaecf4;font-family:monospace;font-size:12px">
        <span style="color:${col};font-weight:700">${icon}</span>
        <span>${escapeHtml(c.slice(2).trim())}</span>
      </div>`;
    }).join('');

    return `<div class="ex-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <strong>Version #${entry.version}</strong>
          <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${color}22;color:${color};font-weight:600">${status}</span>
        </div>
        <span style="font-size:12px;color:#7a829e">${timeAgo}</span>
      </div>
      <div style="font-size:13px;color:#7a829e;margin-bottom:${changes.length?12:0}px">by ${escapeHtml(displayName)}</div>
      ${changes.length ? `<div style="border:1px solid #dde2ee;border-radius:6px;overflow:hidden">${changeRows}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Export: System Changelog ──────────────────────────────
function buildExportSystemChangelog() {
  if (!changelogData || changelogData.length === 0) return '<p style="color:#7a829e">No changelog data available</p>';

  return changelogData.map(entry => {
    const diff     = entry.diff || {};
    const added    = diff.added    || [];
    const removed  = diff.removed  || [];
    const modified = diff.modified || [];
    const { displayName } = parseAuthor(entry.capturedBy);
    const timeAgo  = formatTimeAgo(entry.capturedAt);
    const title    = buildCommitTitle(entry, diff, false);

    const allChanges = [
      ...added.map(e => ({ ...e, _s:'added' })),
      ...removed.map(e => ({ ...e, _s:'removed' })),
      ...modified.map(e => ({ ...e, _s:'modified' }))
    ];

    const changeRows = allChanges.map(e => {
      const color = e._s==='added'?'#22c55e':e._s==='removed'?'#ef4444':'#f59e0b';
      const icon  = e._s==='added'?'+':e._s==='removed'?'−':'~';
      const subs  = [...(e.fieldChanges||[]), ...(e.relationChanges||[])].slice(0,4);
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 16px;border-bottom:1px solid #eaecf4;font-size:13px">
        <span style="color:${color};font-weight:700;font-size:14px;width:16px;text-align:center;flex-shrink:0">${icon}</span>
        <div>
          <span style="font-weight:600">${escapeHtml(e.tableName)}</span>
          ${subs.length ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px">${subs.map(c=>`<code style="font-size:10px;background:#f1f3f8;border:1px solid #dde2ee;border-radius:3px;padding:1px 5px">${escapeHtml(c)}</code>`).join('')}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return `<div class="ex-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <strong>${escapeHtml(title)}</strong>
          <span style="color:#7a829e;font-size:13px">#${entry.version}</span>
        </div>
        <span style="font-size:12px;color:#7a829e">${timeAgo}</span>
      </div>
      <div style="font-size:13px;color:#7a829e;margin-bottom:${allChanges.length?10:0}px">by ${escapeHtml(displayName)}</div>
      ${allChanges.length ? `<div style="border:1px solid #dde2ee;border-radius:6px;overflow:hidden">${changeRows}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Export CSS (self-contained) ───────────────────────────
function exportCss() {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
           background: #f8f9fc; color: #1a1d2e; font-size: 14px; line-height: 1.5; }

    /* Topbar */
    .ex-topbar { background: #fff; border-bottom: 1px solid #dde2ee; padding: 12px 32px;
                 display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .ex-brand  { display: flex; align-items: center; gap: 7px; font-size: 16px;
                 font-weight: 700; color: #5b6ef5; }
    .ex-title  { font-size: 15px; font-weight: 600; color: #1a1d2e; flex: 1; }
    .ex-meta   { font-size: 12px; color: #7a829e; }

    /* Nav */
    .ex-nav { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #dde2ee;
              padding: 0 32px; display: flex; align-items: center; gap: 4px; z-index: 100; }
    .ex-nav a { display: flex; align-items: center; gap: 6px; padding: 10px 14px; color: #7a829e;
                text-decoration: none; font-size: 13px; font-weight: 500;
                border-bottom: 2px solid transparent; transition: color 0.12s, border-color 0.12s; }
    .ex-nav a:hover { color: #5b6ef5; border-bottom-color: #5b6ef5; }
    .ex-nav-spacer { flex: 1; }
    .ex-generated  { font-size: 11px; color: #a0a8c0; }

    /* Main */
    .ex-main { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }

    /* Section */
    .export-section { margin-bottom: 48px; }
    .export-section-title { display: flex; align-items: center; gap: 8px; font-size: 18px;
                            font-weight: 700; color: #1a1d2e; margin-bottom: 20px;
                            padding-bottom: 10px; border-bottom: 2px solid #5b6ef5; }

    /* Page header */
    .ex-page-header { margin-bottom: 20px; }
    .ex-page-title  { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .ex-page-title h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.4px; }
    .ex-table-badge { width: 28px; height: 28px; border-radius: 5px; background: #5b6ef5;
                      display: flex; align-items: center; justify-content: center; color: #fff;
                      font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .ex-page-meta   { display: flex; gap: 16px; font-size: 12px; color: #7a829e;
                      padding-left: 38px; }

    /* Card */
    .ex-card { background: #fff; border: 1px solid #dde2ee; border-radius: 10px;
               padding: 20px 24px; margin-bottom: 16px; }
    .ex-card h3 { font-size: 14px; font-weight: 600; color: #1a1d2e; margin-bottom: 14px; }
    .ex-card p  { font-size: 13px; color: #7a829e; line-height: 1.7; }

    /* Table */
    .ex-table { width: 100%; border-collapse: collapse; font-size: 12.5px;
                border: 1px solid #dde2ee; border-radius: 8px; overflow: hidden; }
    .ex-table th { text-align: left; padding: 8px 12px; font-weight: 600; font-size: 11px;
                   color: #7a829e; background: #f1f3f8; border-bottom: 1px solid #dde2ee; }
    .ex-table td { padding: 9px 12px; border-bottom: 1px solid #eaecf4; color: #1a1d2e;
                   vertical-align: middle; }
    .ex-table tr:last-child td { border-bottom: none; }
    .ex-table code { background: #f1f3f8; border: 1px solid #dde2ee; border-radius: 4px;
                     padding: 1px 6px; font-family: monospace; font-size: 11px; }

    /* Tags */
    .ex-tag { display: inline-flex; padding: 2px 7px; border-radius: 4px; font-size: 10px;
              font-weight: 600; margin-right: 3px; }
    .ex-pk   { background: rgba(245,158,11,.12); color: #f59e0b; border: 1px solid rgba(245,158,11,.25); }
    .ex-fk   { background: rgba(91,110,245,.08); color: #5b6ef5; border: 1px solid rgba(91,110,245,.2); }
    .ex-nn   { background: #f1f3f8; color: #7a829e; border: 1px solid #dde2ee; }
    .ex-null { background: #f1f3f8; color: #a0a8c0; border: 1px solid #dde2ee; }
    .ex-inc  { background: rgba(13,148,136,.1); color: #0d9488; border: 1px solid rgba(13,148,136,.2); }

    .ex-col-badge { display: inline-flex; width: 22px; height: 16px; border-radius: 3px;
                    background: #e8ecf4; border: 1px solid #dde2ee; align-items: center;
                    justify-content: center; font-size: 7px; font-weight: 700;
                    color: #7a829e; font-family: monospace; margin-right: 4px; }
    .ex-col-badge.pk { background: rgba(245,158,11,.12); border-color: #f59e0b; color: #f59e0b; }

    .ex-rel-badge { display: inline-block; padding: 2px 8px; background: rgba(91,110,245,.08);
                    color: #5b6ef5; border-radius: 4px; font-size: 11px; font-weight: 600; }

    .ex-diagram-wrap svg { max-width: 100%; height: auto; }

    @media print {
      .ex-nav { display: none; }
      .export-section { page-break-inside: avoid; }
    }
  `;
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

// Group palette: [header bg, group bg, border]
const GROUP_COLORS = {
  order:    ['#d94f3d', 'rgba(217,79,61,0.08)',  '#d94f3d'],
  product:  ['#3a7d44', 'rgba(58,125,68,0.08)',  '#3a7d44'],
  user:     ['#5b6ef5', 'rgba(91,110,245,0.08)', '#5b6ef5'],
  address:  ['#5b6ef5', 'rgba(91,110,245,0.08)', '#5b6ef5'],
  review:   ['#8b5cf6', 'rgba(139,92,246,0.08)', '#8b5cf6'],
  category: ['#0d9488', 'rgba(13,148,136,0.08)', '#0d9488'],
};
const DEFAULT_COLOR = ['#6b7a9b', 'rgba(107,122,155,0.08)', '#6b7a9b'];

function groupColor(groupName) {
  return GROUP_COLORS[groupName] || DEFAULT_COLOR;
}

function groupLabel(groupName) {
  return groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' Management';
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
