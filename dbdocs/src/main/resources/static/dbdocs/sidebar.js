/* =========================================================
   SIDEBAR.js - Sidebar rendering, entity tree, search, grouping
   ========================================================= */

// ── Derive Group / Module / Domain ────────────────────────
function deriveGroup(entity) {
  const meta = entity.metadata || {};
  if (meta['module'])    return meta['module'].toLowerCase();
  if (meta['submodule']) return meta['submodule'].toLowerCase();
  if (meta['domain'])    return meta['domain'].toLowerCase();
  const tbl = entity.tableName || '';
  return tbl.split('_')[0] || 'other';
}

function deriveSubgroup(entity) {
  return (entity.metadata || {})['submodule'] || '';
}

function deriveDomain(entity) {
  return (entity.metadata || {})['domain'] || 'unassigned';
}

function deriveCriticality(entity) {
  return (entity.metadata || {})['criticality'] || 'unspecified';
}

function deriveTableType(entity) {
  return (entity.metadata || {})['type'] || 'standard';
}

function deriveLifecycle(entity) {
  return (entity.metadata || {})['lifecycle'] || 'unspecified';
}

function deriveSourceSystem(entity) {
  return (entity.metadata || {})['sourceSystem'] || 'internal';
}

// Returns the group key for the currently active groupMode
function deriveGroupKey(entity) {
  switch (groupMode) {
    case 'domain':       return deriveDomain(entity);
    case 'submodule':    return deriveSubgroup(entity) || deriveGroup(entity);
    case 'criticality':  return deriveCriticality(entity);
    case 'tabletype':    return deriveTableType(entity);
    case 'lifecycle':    return deriveLifecycle(entity);
    case 'sourcesystem': return deriveSourceSystem(entity);
    default:             return null;
  }
}

// Icons/badges per groupMode for the group header
const GROUP_MODE_ICONS = {
  domain:       '◈',
  submodule:    '◫',
  criticality:  '⚠',
  tabletype:    '⊞',
  lifecycle:    '↻',
  sourcesystem: '⇆',
};

function deriveGroupLabel(groupName, groupEntities) {
  const ent = (groupEntities || []).find(e => {
    const meta = e.metadata || {};
    return (meta['module'] || '').toLowerCase() === groupName
        && meta['comment'];
  });
  if (ent) return ent.metadata['comment'];
  return groupName.charAt(0).toUpperCase() + groupName.slice(1);
}

function qualifiedLabel(entity) {
  const mod = deriveGroup(entity);
  const sub = deriveSubgroup(entity);
  return sub ? ` ${sub.toLowerCase()} · ${entity.tableName}`
             : `${mod} · ${entity.tableName}`;
}

function deriveSchema(entity) { return deriveGroup(entity); }

// ── Sidebar Rendering ────────────────────────────────────
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

  if (groupMode !== 'none') {
    // Group by active mode
    const groups = {};
    entities.forEach(e => {
      const g = deriveGroupKey(e) || 'other';
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

  const icon = GROUP_MODE_ICONS[groupMode] || '▤';
  const displayName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
  const count = entities.length;

  const header = document.createElement('div');
  header.className = 'schema-group-header';
  header.innerHTML = `
    <span class="schema-caret">▾</span>
    <span class="schema-group-icon">${icon}</span>
    <span class="schema-group-name">${displayName}</span>
    <span class="schema-group-count">${count}</span>
  `;
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

// ── Field Tooltip ─────────────────────────────────────────
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
    const priority = ['pii','encryption','masking','piiCategory',
      'classification','accessLevel','businessKey','naturalKey',
      'searchable','lawfulBasis','consentRequired','legalHold'];
    const shown = [...priority.filter(k => meta[k]), ...metaKeys.filter(k => !priority.includes(k))].slice(0, 5);
    shown.forEach(k => {
      const val = meta[k];
      const chip = document.createElement('span');
      chip.className = 'tooltip-meta-chip';
      const labelMap = {
        'pii': 'PII', 'encryption': 'Encrypted', 'masking': 'Masking',
        'piiCategory': 'PII Type', 'classification': 'Classification',
        'accessLevel': 'Access', 'businessKey': 'Business Key', 'naturalKey': 'Natural Key',
        'searchable': 'Searchable', 'lawfulBasis': 'Lawful Basis',
        'consentRequired': 'Consent', 'legalHold': 'Legal Hold',
        'derivedFrom': 'From', 'derived.expression': 'Expr',
        'indexStrategy': 'Index', 'apiExposed': 'API', 'publicApi': 'Public API',
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

// ── Sidebar Event Handlers ────────────────────────────────
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

// ── Group-by dropdown ─────────────────────────────────────
(function () {
  const btn      = document.getElementById('btn-group-schema');
  const dropdown = document.getElementById('group-dropdown');
  const label    = document.getElementById('group-label');

  const MODE_LABELS = {
    domain:       'Domain',
    submodule:    'Submodule',
    criticality:  'Criticality',
    tabletype:    'Table Type',
    lifecycle:    'Lifecycle Stage',
    sourcesystem: 'Source System',
    none:         'No Grouping',
  };

  function applyMode(mode) {
    groupMode     = mode;
    label.textContent = MODE_LABELS[mode] || mode;
    btn.classList.toggle('active', mode !== 'none');

    // Update active option
    dropdown.querySelectorAll('.group-option').forEach(li => {
      li.classList.toggle('active', li.dataset.mode === mode);
    });

    dropdown.classList.add('hidden');
    renderSidebar();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  dropdown.querySelectorAll('.group-option').forEach(li => {
    li.addEventListener('click', () => applyMode(li.dataset.mode));
  });

  document.addEventListener('click', () => dropdown.classList.add('hidden'));
  dropdown.addEventListener('click', e => e.stopPropagation());
})();

// ── Exports ───────────────────────────────────────────────
window.Sidebar = {
  deriveGroup, deriveSubgroup, deriveDomain, deriveCriticality,
  deriveTableType, deriveLifecycle, deriveSourceSystem,
  deriveGroupKey, deriveGroupLabel, qualifiedLabel, deriveSchema,
  renderSidebar, buildSchemaGroup, buildTableItem,
  showFieldTooltip, hideFieldTooltip, positionTooltip
};
