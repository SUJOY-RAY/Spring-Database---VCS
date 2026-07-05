/* =========================================================
   UTILS.js - Utility functions, formatters, colors, helpers
   ========================================================= */

// ── Type Abbreviation ─────────────────────────────────────
function getTypeAbbr(javaType) {
  if (!javaType) return '?';
  const map = { 'String': 'str', 'Long': 'int', 'Integer': 'int', 'BigDecimal': 'dec',
    'boolean': 'bool', 'Boolean': 'bool', 'LocalDateTime': 'ts', 'LocalDate': 'dt',
    'Double': 'dec', 'Float': 'dec' };
  return map[javaType] || javaType.substring(0, 3).toLowerCase();
}

// ── SQL Type Mapping ──────────────────────────────────────
function mapSqlType(javaType) {
  const map = {
    'String': 'varchar', 'Long': 'bigint', 'Integer': 'int', 'BigDecimal': 'decimal',
    'boolean': 'boolean', 'Boolean': 'boolean', 'LocalDateTime': 'timestamp',
    'LocalDate': 'date', 'Double': 'double', 'Float': 'float', 'Status': 'varchar'
  };
  return map[javaType] || javaType.toLowerCase();
}

// ── HTML Escaping ────────────────────────────────────────
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ── Formatting ────────────────────────────────────────────
function generateFieldDesc(field) {
  if (field.id) return `Primary key of the record`;
  const name = field.name.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateTableDesc(entity) {
  const name = entity.tableName.replace(/_/g, ' ');
  return `information about each ${name.replace(/s$/, '')} record in the system`;
}

// ── SQL Examples ──────────────────────────────────────────
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

// ── Fields Table Building ─────────────────────────────────
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

// ── Metadata Badges ───────────────────────────────────────
function buildFieldMetaBadges(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return '';

  const pills = [];

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

// ── Activity Section ──────────────────────────────────────
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

// ── Time Formatting ───────────────────────────────────────
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const now = new Date();
  const then = new Date(timestamp);
  const secs = Math.floor((now - then) / 1000);

  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  if (secs < 2592000) return `${Math.floor(secs / 604800)}w ago`;
  return `${Math.floor(secs / 2592000)}mo ago`;
}

// ── Author Parsing ────────────────────────────────────────
function parseAuthor(authorStr) {
  if (!authorStr) return { displayName: 'Database', initials: 'DB' };
  const parts = authorStr.trim().split(/\s+/);
  const initials = parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 2);
  return { displayName: authorStr, initials };
}

// ── Commit Title Building ─────────────────────────────────
function buildCommitTitle(entry, diff, isLatest) {
  const added    = diff.added    || [];
  const removed  = diff.removed  || [];
  const modified = diff.modified || [];
  const totalChanged = added.length + removed.length + modified.length;

  const titleParts = [];
  if (added.length > 0)    titleParts.push(`+${added.length}`);
  if (modified.length > 0) titleParts.push(`~${modified.length}`);
  if (removed.length > 0)  titleParts.push(`-${removed.length}`);

  const title = titleParts.join(' / ') || 'No changes';
  return isLatest ? `Latest: ${title}` : title;
}

// ── Relation Label ────────────────────────────────────────
function relLabel(type) {
  switch (type) {
    case 'ONE_TO_MANY': return '1:N';
    case 'MANY_TO_ONE': return 'N:1';
    case 'MANY_TO_MANY': return 'N:M';
    case 'ONE_TO_ONE':  return '1:1';
    default: return type;
  }
}

// ── Tag Classification ────────────────────────────────────
function tagClass(tag) {
  const lowerTag = (tag || '').toLowerCase();
  if (lowerTag.includes('pii') || lowerTag.includes('sensitive') || lowerTag.includes('personal')) return 'privacy';
  if (lowerTag.includes('security') || lowerTag.includes('encrypt') || lowerTag.includes('secure')) return 'security';
  if (lowerTag.includes('deprecated') || lowerTag.includes('legacy')) return 'deprecated';
  if (lowerTag.includes('new') || lowerTag.includes('experimental')) return 'new';
  if (lowerTag.includes('critical') || lowerTag.includes('important')) return 'critical';
  return 'default';
}

function tagDesc(tag) {
  const map = {
    'PII': 'Personally Identifiable Information',
    'Encrypted': 'Data is encrypted at rest or in transit',
    'Masking': 'Data is masked in non-production environments',
    'PII Type': 'Category of PII (e.g., email, phone, SSN)',
    'Classification': 'Data classification level (e.g., public, confidential)',
    'Access': 'Access control level required',
    'Business Key': 'Identifies a unique business object',
    'Natural Key': 'Natural unique identifier (not auto-generated)',
    'Searchable': 'Field is indexed for search',
    'Lawful Basis': 'Legal basis for processing (GDPR)',
    'Consent': 'Requires explicit user consent for processing',
    'Legal Hold': 'Data is under legal hold and cannot be deleted',
    'Remarks': 'Additional notes or comments about this field'
  };
  return map[tag] || '';
}

// ── SVG Helper ────────────────────────────────────────────
function svgMake(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// ── Card Height Calculation ───────────────────────────────
function cardHeight(entity) {
  const visible = Math.min((entity.fields || []).length, MAX_ROWS);
  return CARD_HEADER_H + visible * ROW_H + (entity.fields.length > MAX_ROWS ? ROW_H : 0) + 6;
}

// ── Color Palette ─────────────────────────────────────────
const PALETTE_HUES = [
  60,   // yellow    — sales
  120,  // green     — product
  180,  // cyan      — operations
  240,  // blue      — engineering
  300,  // magenta   — marketing
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

function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

function groupColor(groupName) {
  const key   = (groupName || 'other').toLowerCase().trim();
  const idx   = hashStr(key) % PALETTE_HUES.length;
  const hue   = PALETTE_HUES[idx];
  const hdr   = `hsl(${hue}, 52%, 38%)`;
  const bg    = `hsla(${hue}, 52%, 38%, 0.07)`;
  const border= `hsl(${hue}, 52%, 45%)`;
  return [hdr, bg, border];
}

function groupLabel(groupName, groupEntities) {
  return deriveGroupLabel(groupName, groupEntities);
}

// ── Exports ───────────────────────────────────────────────
window.Utils = {
  getTypeAbbr, mapSqlType, escapeHtml, generateFieldDesc, generateTableDesc,
  buildSqlExample, sampleValue, buildFieldsTable, buildFieldMetaBadges,
  buildTags, buildRefs, buildActivitySection, formatTimeAgo, parseAuthor,
  buildCommitTitle, relLabel, tagClass, tagDesc, svgMake, cardHeight,
  groupColor, groupLabel, hashStr
};
