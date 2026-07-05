/* =========================================================
   CHANGELOG.js - Changelog rendering, version history, commits
   ========================================================= */

// ── Changelog State ───────────────────────────────────────
let changelogData = null;
let expandedDiffs = new Set(); // version numbers with expanded entity lists

// ── Changelog Loading ─────────────────────────────────────
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

// ── System-level Changelog ───────────────────────────────
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

    const { displayName, initials } = parseAuthor(entry.capturedBy);
    const timeAgo = formatTimeAgo(entry.capturedAt);

    const card = document.createElement('div');
    card.className = 'cl-card';
    if (isLatest) card.classList.add('latest');
    if (isFirst) card.classList.add('first-version');

    // Card header with toggle
    const cardHead = document.createElement('div');
    cardHead.className = 'cl-card-head';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'cl-card-title';
    titleDiv.style.display = 'flex';
    titleDiv.style.alignItems = 'center';
    titleDiv.style.gap = '8px';

    const caret = document.createElement('span');
    caret.className = 'cl-caret';
    caret.textContent = isExpanded ? '▾' : '▸';
    caret.style.cursor = 'pointer';
    caret.style.userSelect = 'none';
    caret.addEventListener('click', () => {
      const newExpanded = !expandedDiffs.has(entry.version);
      if (newExpanded) {
        expandedDiffs.add(entry.version);
      } else {
        expandedDiffs.delete(entry.version);
      }
      renderChangelog();
    });
    titleDiv.appendChild(caret);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'cl-commit-title';
    titleSpan.textContent = buildCommitTitle(entry, diff, isLatest);
    titleDiv.appendChild(titleSpan);

    const verNum = document.createElement('span');
    verNum.className = 'cl-version-num';
    verNum.textContent = `#${entry.version}`;
    titleDiv.appendChild(verNum);

    cardHead.appendChild(titleDiv);
    card.appendChild(cardHead);

    // Author line
    const authorLine = document.createElement('div');
    authorLine.className = 'cl-author-line';
    authorLine.innerHTML = `
      <div class="cl-avatar">${initials}</div>
      <span class="cl-author-name">${displayName}</span>
      <span class="cl-author-action">authored ${timeAgo}</span>
    `;
    card.appendChild(authorLine);

    // Entity diffs (expandable)
    if (isExpanded && totalChanged > 0) {
      const diffsDiv = document.createElement('div');
      diffsDiv.className = 'cl-diffs';

      if (added.length > 0) {
        const addedDiv = document.createElement('div');
        addedDiv.className = 'cl-entity-group';
        addedDiv.innerHTML = `<div class="cl-group-label" style="color:var(--success);font-weight:600;margin-top:12px;margin-bottom:8px">+ Added (${added.length})</div>`;
        const list = document.createElement('div');
        list.className = 'cl-entity-list';
        added.forEach(e => {
          const item = document.createElement('div');
          item.className = 'cl-entity-item';
          item.style.cursor = 'pointer';
          item.onclick = () => selectTable(e.simpleClassName);
          item.innerHTML = `
            <span style="width:18px;height:18px;border-radius:4px;background:var(--success-light);color:var(--success);font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</span>
            <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;color:var(--text)">${escapeHtml(e.tableName)}</span>
          `;
          list.appendChild(item);
        });
        addedDiv.appendChild(list);
        diffsDiv.appendChild(addedDiv);
      }

      if (modified.length > 0) {
        const modDiv = document.createElement('div');
        modDiv.className = 'cl-entity-group';
        modDiv.innerHTML = `<div class="cl-group-label" style="color:var(--warning);font-weight:600;margin-top:12px;margin-bottom:8px">~ Modified (${modified.length})</div>`;
        const list = document.createElement('div');
        list.className = 'cl-entity-list';
        modified.forEach(e => {
          const item = document.createElement('div');
          item.className = 'cl-entity-item';
          item.style.cursor = 'pointer';
          item.onclick = () => selectTable(e.simpleClassName);
          const fieldChanges = e.fieldChanges || [];
          const added = fieldChanges.filter(c => c.startsWith('+')).length;
          const deleted = fieldChanges.filter(c => c.startsWith('-')).length;
          item.innerHTML = `
            <span style="width:18px;height:18px;border-radius:4px;background:var(--warning-light);color:var(--warning);font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">~</span>
            <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;color:var(--text)">${escapeHtml(e.tableName)}</span>
            ${added > 0 ? `<span style="font-size:10px;color:var(--success);font-weight:600">+${added}</span>` : ''}
            ${deleted > 0 ? `<span style="font-size:10px;color:var(--danger);font-weight:600">-${deleted}</span>` : ''}
          `;
          list.appendChild(item);
        });
        modDiv.appendChild(list);
        diffsDiv.appendChild(modDiv);
      }

      if (removed.length > 0) {
        const remDiv = document.createElement('div');
        remDiv.className = 'cl-entity-group';
        remDiv.innerHTML = `<div class="cl-group-label" style="color:var(--danger);font-weight:600;margin-top:12px;margin-bottom:8px">− Removed (${removed.length})</div>`;
        const list = document.createElement('div');
        list.className = 'cl-entity-list';
        removed.forEach(e => {
          const item = document.createElement('div');
          item.className = 'cl-entity-item';
          item.innerHTML = `
            <span style="width:18px;height:18px;border-radius:4px;background:var(--danger-light);color:var(--danger);font-weight:700;font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0">−</span>
            <span style="font-family:'JetBrains Mono',Consolas,monospace;font-size:12px;color:var(--text)">${escapeHtml(e.tableName)}</span>
          `;
          list.appendChild(item);
        });
        remDiv.appendChild(list);
        diffsDiv.appendChild(remDiv);
      }

      card.appendChild(diffsDiv);
    }

    changelogContent.appendChild(card);
  });
}

// ── Table-scoped Changelog ───────────────────────────────
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
          <div class="cl-entity-list">
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

// ── Mini Diagram ──────────────────────────────────────────
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

  const relColor = {
    ONE_TO_MANY: '#5b6ef5', MANY_TO_ONE: '#8b5cf6',
    MANY_TO_MANY: '#22c55e', ONE_TO_ONE: '#f59e0b'
  };

  // Calculate positions
  const mainH = cHeight(entity);
  const relHeights = relatedEntities.map(cHeight);
  const totalRelH = relHeights.reduce((s, h) => s + h, 0)
                  + VGAP * Math.max(0, relatedEntities.length - 1);

  const diagramH = Math.max(mainH, totalRelH) + PAD * 2;
  const diagramW = relatedEntities.length > 0
    ? CW + HGAP + CW + PAD * 2
    : CW + PAD * 2;

  const mainX = PAD;
  const mainY = PAD + Math.max(0, (diagramH - PAD * 2 - mainH) / 2);

  const relStartY = PAD + Math.max(0, (diagramH - PAD * 2 - totalRelH) / 2);
  const relX = PAD + CW + HGAP;
  const relPositions = [];
  let ry = relStartY;
  relatedEntities.forEach((re, i) => {
    relPositions.push({ x: relX, y: ry });
    ry += relHeights[i] + VGAP;
  });

  // Build SVG
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

  // Draw connector lines (behind cards)
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

  // Draw a single card
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

      if (f.id) {
        const key = mkEl('text', {
          x: x + 6, y: fy,
          fill: '#f59e0b', 'font-size': 10,
          'font-family': 'Inter, system-ui, sans-serif'
        });
        key.textContent = '🔑';
        g.appendChild(key);
      }

      const fnEl = mkEl('text', {
        x: x + (f.id ? 20 : 8), y: fy,
        fill: f.id ? '#f59e0b' : '#4a5168',
        'font-size': 10, 'font-weight': f.id ? 600 : 400,
        'font-family': 'Inter, system-ui, sans-serif'
      });
      fnEl.textContent = f.columnName || f.name;
      g.appendChild(fnEl);

      const ftEl = mkEl('text', {
        x: x + CW - 6, y: fy,
        fill: '#a0a8c0', 'font-size': 9,
        'text-anchor': 'end', 'font-family': 'Inter, system-ui, sans-serif'
      });
      ftEl.textContent = mapSqlType(f.javaType);
      g.appendChild(ftEl);

      if (i < visFields.length - 1) {
        g.appendChild(mkEl('line', {
          x1: x, y1: y + HPAD + (i + 1) * FROW,
          x2: x + CW, y2: y + HPAD + (i + 1) * FROW,
          stroke: '#eaecf4', 'stroke-width': 0.5
        }));
      }
    });

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

  relatedEntities.forEach((re, i) => {
    svg.appendChild(drawCard(re, relPositions[i].x, relPositions[i].y, false));
  });

  svg.appendChild(drawCard(entity, mainX, mainY, true));

  container.parentNode.replaceChild(svg, container);
}

// ── View Version (switch schema version and show wiki) ───
function viewVersion(version) {
  versionSelect.value = version;
  loadVersion(version).then(() => {
    switchInnerTab('wiki');
  });
}

// ── Exports ───────────────────────────────────────────────
window.Changelog = {
  loadChangelog, renderChangelog, renderTableChangelog, renderMiniDiagram,
  viewVersion
};
