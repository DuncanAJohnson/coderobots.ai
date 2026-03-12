/**
 * Fritzing parsing helpers
 * Converts .fzp XML into normalized connector metadata.
 */

const CONNECTOR_VIEW_PRIORITY = ['breadboardView', 'schematicView', 'pcbView'];

function getFirstViewNode(connectorNode) {
  for (const viewName of CONNECTOR_VIEW_PRIORITY) {
    const view = connectorNode.querySelector(`views > ${viewName} > p`);
    if (view) return view;
  }
  return null;
}

export function parseFritzingModule(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid Fritzing XML');
  }

  const moduleNode = doc.querySelector('module');
  if (!moduleNode) {
    throw new Error('Missing module node in Fritzing XML');
  }

  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const label = doc.querySelector('label')?.textContent?.trim() || '';
  const moduleId = moduleNode.getAttribute('moduleId') || '';

  const connectors = Array.from(doc.querySelectorAll('connectors > connector')).map((connectorNode) => {
    const id = connectorNode.getAttribute('id') || '';
    const name = connectorNode.getAttribute('name') || id;
    const type = connectorNode.getAttribute('type') || '';
    const description = connectorNode.querySelector('description')?.textContent?.trim() || '';
    const viewNode = getFirstViewNode(connectorNode);
    const svgId = viewNode?.getAttribute('svgId') || '';

    return {
      id,
      name,
      type,
      description,
      svgId,
    };
  });

  return {
    moduleId,
    title,
    label,
    connectors,
  };
}

/**
 * Returns the geometric center of a single SVG element.
 * Supports <circle>, <rect>, and <path> (including groups containing them).
 */
function getElementCenter(el) {
  if (!el) return null;

  const circle = el.tagName === 'circle' ? el : el.querySelector('circle');
  if (circle) {
    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    if (!isNaN(cx) && !isNaN(cy)) return { cx, cy };
  }

  const rect = el.tagName === 'rect' ? el : el.querySelector('rect');
  if (rect) {
    const x = parseFloat(rect.getAttribute('x')) || 0;
    const y = parseFloat(rect.getAttribute('y')) || 0;
    const w = parseFloat(rect.getAttribute('width')) || 0;
    const h = parseFloat(rect.getAttribute('height')) || 0;
    return { cx: x + w / 2, cy: y + h / 2 };
  }

  const pathEl = el.tagName === 'path' ? el : el.querySelector('path');
  if (pathEl) {
    const d = pathEl.getAttribute('d') || '';
    const coords = [];
    const re = /[Mm]\s*([-\d.]+)[,\s]\s*([-\d.]+)/g;
    let m;
    while ((m = re.exec(d)) !== null) {
      coords.push([parseFloat(m[1]), parseFloat(m[2])]);
    }
    if (coords.length > 0) {
      return {
        cx: coords.reduce((s, c) => s + c[0], 0) / coords.length,
        cy: coords.reduce((s, c) => s + c[1], 0) / coords.length,
      };
    }
  }

  return null;
}

/**
 * Parses a Fritzing breadboard SVG and returns pin positions keyed by svgId.
 *
 * Pass the list of svgIds from the parsed FZP connectors so each pin is looked
 * up by its exact element ID.  This works across all Fritzing parts regardless
 * of their ID naming scheme.
 *
 * Returns { positions: { [svgId]: {cx, cy} }, boardW, boardH }.
 */
export function parseSvgPinPositions(svgRaw, svgIds = []) {
  if (!svgRaw || typeof svgRaw !== 'string') {
    return { positions: {}, boardW: 0, boardH: 0 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgRaw, 'image/svg+xml');

  const svgEl = doc.querySelector('svg');
  const viewBoxParts = (svgEl?.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const boardW = viewBoxParts[2] || 0;
  const boardH = viewBoxParts[3] || 0;

  const positions = {};

  const idsToFind = svgIds.length > 0 ? [...new Set(svgIds.filter(Boolean))] : null;

  if (idsToFind) {
    // Preferred path: look up each connector by its exact svgId from the FZP.
    idsToFind.forEach((svgId) => {
      const el = doc.getElementById(svgId);
      const pos = getElementCenter(el);
      if (pos) positions[svgId] = pos;
    });
  } else {
    // Fallback: scan all elements whose ID matches the common connector pin pattern.
    doc.querySelectorAll('[id]').forEach((el) => {
      const rawId = el.getAttribute('id') || '';
      const match = rawId.match(/^(connector\d+)pin$/);
      if (!match) return;
      const pinKey = `${match[1]}pin`;
      if (pinKey in positions) return; // first occurrence wins
      const pos = getElementCenter(el);
      if (pos) positions[pinKey] = pos;
    });
  }

  return { positions, boardW, boardH };
}

export function makeConnectorLabel(componentName, connector) {
  if (!componentName || !connector) return '';
  if (connector.name) return `${componentName} ${connector.name}`;
  return `${componentName} ${connector.id || 'pin'}`;
}
