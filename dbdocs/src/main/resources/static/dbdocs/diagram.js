/* =========================================================
   DIAGRAM.js - Canvas rendering, layout, entity cards, connectors
   ========================================================= */

let _lineCounter = 0;

// ── Layout Algorithm ─────────────────────────────────────
function autoLayout() {
  if (!schema) return;

  // 1. Build groups
  const groupMap = {};
  schema.entities.forEach(e => {
    const g = deriveGroupKey(e) || deriveGroup(e);
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

// ── Canvas Rendering ────────────────────────────────────
function renderCanvas() {
  canvasRoot.innerHTML = '';
  _lineCounter = 0;
  if (!schema || !schema.entities.length) return;

  isTableDiagramView = false;  // Mark that we're back to full schema view

  // 1. Group background boxes (bottom layer)
  const groupsLayer = svgMake('g', { class: 'groups-layer' });
  const groupMap = {};
  schema.entities.forEach(e => {
    const g = deriveGroupKey(e) || deriveGroup(e);
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

// ── SVG Transform ────────────────────────────────────────
function applyTransform() {
  canvasRoot.setAttribute('transform', `translate(${viewX},${viewY}) scale(${viewScale})`);
}

// ── Entity Card Drawing ──────────────────────────────────
function drawEntityCard(entity) {
  const pos    = positions[entity.simpleClassName] || { x: 60, y: 60 };
  const fields = entity.fields || [];
  const vis    = fields.slice(0, MAX_ROWS);
  const h      = cardHeight(entity);
  const gName  = deriveGroupKey(entity) || deriveGroup(entity);
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

// ── Relation Lines ────────────────────────────────────────
function pkRowY(entity) {
  const pos = positions[entity.simpleClassName];
  if (!pos) return null;
  const pkIdx = (entity.fields || []).findIndex(f => f.id);
  const row   = pkIdx < 0 ? 0 : pkIdx;
  return pos.y + CARD_HEADER_H + row * ROW_H + ROW_H / 2;
}

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

  // Anchor points on PK rows
  const srcY  = pkRowY(fromEntity) ?? (fromPos.y + fh / 2);
  const srcX  = fromPos.x + CARD_W;

  const dstY  = pkRowY(toEntity)   ?? (toPos.y + th / 2);
  const dstX  = toPos.x;

  const MARGIN = 14; // clearance around cards for routing

  let midX = srcX + (dstX - srcX) / 2;

  // Check if the vertical segment at midX overlaps any card
  const vOverlaps = vertSegmentOverlapsCards(midX, srcY, dstY, excl);
  if (vOverlaps.length > 0) {
    // Push midX to the right of all overlapping cards + margin
    const rightEdge = Math.max(...vOverlaps.map(e => positions[e.simpleClassName].x + CARD_W));
    midX = rightEdge + MARGIN;
  }

  // Check horizontal legs for card overlaps and detour if needed
  const h1Overlaps = segmentOverlapsCards(srcX, midX, srcY, excl);
  const h2Overlaps = segmentOverlapsCards(midX, dstX, dstY, excl);

  let path;
  if (h1Overlaps.length === 0 && h2Overlaps.length === 0) {
    path = `M ${srcX} ${srcY} L ${midX} ${srcY} L ${midX} ${dstY} L ${dstX} ${dstY}`;
  } else {
    // Fall back to 5-segment path going out wide to avoid overlaps
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

  const pathLen    = Math.abs(dstX - srcX) + Math.abs(dstY - srcY);
  const lineId     = `rel-pulse-${_lineCounter++}`;
  const DASH_LEN   = 12;
  const GAP_LEN    = Math.max(pathLen, DASH_LEN + 10);
  const DURATION   = Math.max(0.7, pathLen / 150).toFixed(2);
  const totalTravel = DASH_LEN + GAP_LEN;
  const animName   = `pulse_${lineId.replace(/-/g, '_')}`;

  // Static base line
  parent.appendChild(svgMake('path', {
    d: path, fill: 'none',
    stroke, 'stroke-width': 1.5, opacity: 0.3,
    'stroke-linejoin': 'round',
    'marker-end': arrowMarker
  }));

  // Animated pulse dash
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

// ── Table-scoped Diagram ──────────────────────────────────
function renderTableDiagram(name) {
  const entity = schema && schema.entities.find(e => e.simpleClassName === name);
  canvasRoot.innerHTML = '';
  _lineCounter = 0;
  if (!entity) return;

  isTableDiagramView = true;  // Mark that we're in table-specific view

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
  const CW = CARD_W;

  const others = subEntities.filter(e => e.simpleClassName !== name);
  const angleStep = (2 * Math.PI) / Math.max(others.length, 1);
  // Radius large enough so neighbour cards don't overlap the focal card
  const focalH = cardHeight(entity);
  const maxNeighbourH = others.reduce((m, e) => Math.max(m, cardHeight(e)), 0);
  const radius = Math.max(300, others.length * 80, (focalH / 2) + (maxNeighbourH / 2) + 60);

  // Centre at an offset that guarantees all cards stay in positive coordinates
  const cx = radius + CW + 20;
  const cy = radius + maxNeighbourH + 20;
  positions[name] = { x: cx, y: cy };

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

// ── Dragging ──────────────────────────────────────────────
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
      if (isTableDiagramView && activeTable) {
        renderTableDiagram(activeTable);
      } else {
        renderCanvas();
      }
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

  // In table diagram view, only fit the visible subset of entities
  const entitiesToFit = (isTableDiagramView && activeTable)
    ? (() => {
        const focal = schema.entities.find(e => e.simpleClassName === activeTable);
        if (!focal) return schema.entities;
        const visible = new Set([activeTable]);
        (focal.relations || []).forEach(r => visible.add(r.targetEntity));
        schema.entities.forEach(e => {
          (e.relations || []).forEach(r => { if (r.targetEntity === activeTable) visible.add(e.simpleClassName); });
        });
        return schema.entities.filter(e => visible.has(e.simpleClassName));
      })()
    : schema.entities;

  entitiesToFit.forEach(e => {
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

// ── Exports ───────────────────────────────────────────────
window.Diagram = {
  autoLayout, renderCanvas, applyTransform, drawEntityCard, drawRelationLine,
  renderTableDiagram, makeDraggable, fitAll
};
