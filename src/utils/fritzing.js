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

export function makeConnectorLabel(componentName, connector) {
  if (!componentName || !connector) return '';
  if (connector.name) return `${componentName} ${connector.name}`;
  return `${componentName} ${connector.id || 'pin'}`;
}
