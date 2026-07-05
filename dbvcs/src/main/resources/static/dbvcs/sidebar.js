/* =========================================================
   SIDEBAR.js - Sidebar rendering, entity tree, search, grouping
   ========================================================= */

// ── Derive Group / Module / Domain ────────────────────────
function deriveGroup(entity) {
  const meta = entity.metadata || {};
  if (meta['module.name'])  return meta['module.name'].toLowerCase();
  if (meta['domain.name'])  return meta['domain.name'].toLowerCase();
  const tbl = entity.tableName || '';
  return tbl.split('_')[0] || 'other';
}

function deriveSubgroup(entity) {
  return (entity.metadata || {})['submodule.name'] || '';
}

function deriveDomain(entity) {
  return (entity.metadata || {})['domain.name'] || '';
}

function deriveCriticality(entity) {
  return (entity.metadata || {})['criticality.level'] || '';
}

function deriveGroupLabel(groupName, groupEntities) {
  const ent = (groupEntities || []).find(e => {
    const meta = e.metadata || {};
    return (meta['module.name'] || '').toLowerCase() === groupName
        && meta['module.description'];
  });
  if (ent) return ent.metadata['module.description'];
  return groupName.charAt(0).toUpperCase() + groupName.slice(1);
}

function qualifiedLabel(entity) {
  const mod = deriveGroup(entity);
  const sub = deriveSubgroup(entity);
  return sub ? `${mod} · ${sub.toLowerCase()} · ${entity.tableName}`
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

document.getElementById('btn-group-schema').addEventListener('click', () => {
  groupBySchema = !groupBySchema;
  const btn = document.getElementById('btn-group-schema');
  btn.classList.toggle('active', groupBySchema);
  btn.textContent = groupBySchema ? '≡ Group by: Schema' : '≡ No grouping';
  renderSidebar();
});

// ── Exports ───────────────────────────────────────────────
window.Sidebar = {
  deriveGroup, deriveSubgroup, deriveDomain, deriveCriticality,
  deriveGroupLabel, qualifiedLabel, deriveSchema,
  renderSidebar, buildSchemaGroup, buildTableItem,
  showFieldTooltip, hideFieldTooltip, positionTooltip
};
