import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import './ModalBase.css';
import './HardwareConfigModal.css';
import MpuPinDiagram from './MpuPinDiagram';
import ComponentPinDiagram from './ComponentPinDiagram';
import {
  getCurrentUserHardwareConfig,
  saveCurrentUserHardwareConfig,
  getHardwareCatalog,
  getDefaultHardwareConfig,
  buildConnectionLabel,
} from '../services/hardwareConfig';

function makeInstanceId(componentId) {
  return `${componentId}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderPartPreview(part, className) {
  if (!part) return null;

  if (part.svg_raw) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part.svg_raw) }}
      />
    );
  }

  if (part.svg_url) {
    return <img className={className} src={part.svg_url} alt={part.name} />;
  }

  return null;
}

const HardwareConfigModal = ({ visible, onClose }) => {
  const [catalog, setCatalog] = useState({ mpus: [], components: [], templates: [] });
  const [config, setConfig] = useState(null);
  const [activeMpuPinId, setActiveMpuPinId] = useState(null);
  const [hoveredMpuPinId, setHoveredMpuPinId] = useState(null);
  const [selectedAddComponentId, setSelectedAddComponentId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const catalogData = await getHardwareCatalog(true);
        let savedConfig = null;
        try {
          savedConfig = await getCurrentUserHardwareConfig();
        } catch (userConfigError) {
          console.warn('Unable to load user hardware config, using defaults:', userConfigError);
        }

        if (!active) return;
        setCatalog(catalogData);
        const defaultConfig = getDefaultHardwareConfig(catalogData);
        const nextConfig = savedConfig || defaultConfig;
        const hasSelectedMpu = catalogData.mpus.some((mpu) => mpu.id === nextConfig.selectedMpuId);

        setConfig(hasSelectedMpu ? nextConfig : defaultConfig);
      } catch (err) {
        console.error('Failed to load hardware config:', err);
        if (active) setError('Unable to load hardware settings.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [visible]);

  const selectedMpu = useMemo(
    () => catalog.mpus.find((mpu) => mpu.id === config?.selectedMpuId) || null,
    [catalog.mpus, config?.selectedMpuId],
  );

  const instantiatedComponents = useMemo(() => {
    const instances = config?.components || [];
    return instances
      .map((instance) => {
        const base = catalog.components.find((c) => c.id === instance.componentId);
        if (!base) return null;
        return {
          ...base,
          instanceId: instance.instanceId,
          nickname: instance.nickname || base.name,
        };
      })
      .filter(Boolean);
  }, [catalog.components, config?.components]);

  if (!visible) return null;

  const updateConfig = (updater) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  };

  const handleMpuChange = (newMpuId) => {
    updateConfig((prev) => ({
      ...prev,
      selectedMpuId: newMpuId,
      mappings: {},
    }));
    setActiveMpuPinId(null);
  };

  const handleAddComponent = () => {
    if (!selectedAddComponentId) return;
    const component = catalog.components.find((c) => c.id === selectedAddComponentId);
    if (!component) return;

    updateConfig((prev) => ({
      ...prev,
      components: [
        ...(prev.components || []),
        {
          instanceId: makeInstanceId(component.id),
          componentId: component.id,
          nickname: component.name,
        },
      ],
    }));
  };

  const removeComponent = (instanceId) => {
    updateConfig((prev) => {
      const newMappings = { ...(prev.mappings || {}) };
      Object.keys(newMappings).forEach((mpuPinId) => {
        if (newMappings[mpuPinId]?.instanceId === instanceId) {
          delete newMappings[mpuPinId];
        }
      });

      return {
        ...prev,
        components: (prev.components || []).filter((c) => c.instanceId !== instanceId),
        mappings: newMappings,
      };
    });
  };

  const clearMapping = (mpuPinId) => {
    updateConfig((prev) => {
      const nextMappings = { ...(prev.mappings || {}) };
      delete nextMappings[mpuPinId];
      return { ...prev, mappings: nextMappings };
    });
  };

  const handlePinConnect = (component, pin) => {
    if (!activeMpuPinId) return;

    updateConfig((prev) => ({
      ...prev,
      mappings: {
        ...(prev.mappings || {}),
        [activeMpuPinId]: {
          instanceId: component.instanceId,
          componentPinId: pin.id,
          label: buildConnectionLabel(component, pin),
        },
      },
    }));
    setActiveMpuPinId(null);
  };

  const applyTemplate = () => {
    if (!selectedTemplateId) return;
    const template = catalog.templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;

    const mpuExists = catalog.mpus.some((mpu) => mpu.id === template.selectedMpuId);
    const resolvedMpuId = mpuExists
      ? template.selectedMpuId
      : (config?.selectedMpuId || catalog.mpus[0]?.id);

    if (!mpuExists) {
      console.warn(
        `Template MPU "${template.selectedMpuId}" not found in catalog — keeping current MPU "${resolvedMpuId}".`,
      );
    }

    // Only include components whose componentId exists in the catalog
    const validComponents = (template.components || []).filter((c) => {
      const exists = catalog.components.some((cc) => cc.id === c.componentId);
      if (!exists) console.warn(`Template component "${c.componentId}" not found in catalog — skipping.`);
      return exists;
    });
    const validInstanceIds = new Set(validComponents.map((c) => c.instanceId));

    // Drop mappings that reference removed component instances
    const validMappings = Object.fromEntries(
      Object.entries(template.mappings || {}).filter(([, m]) => validInstanceIds.has(m.instanceId)),
    );

    setConfig({
      selectedMpuId: resolvedMpuId,
      components: validComponents,
      mappings: validMappings,
    });
    setActiveMpuPinId(null);
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setError('');
    try {
      await saveCurrentUserHardwareConfig(config);
      window.dispatchEvent(new Event('hardware-config-updated'));
      onClose?.();
    } catch (err) {
      console.error('Failed to save hardware config:', err);
      setError('Unable to save hardware settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-wide hardware-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hardware-config-header">
          <h2>Hardware Configuration</h2>
          <p>Select an MPU and map its pins to external components.</p>
        </div>

        {loading && <div className="hardware-config-loading">Loading hardware catalog...</div>}
        {error && <div className="hardware-config-error">{error}</div>}

        {!loading && config && (
          <>
            <div className="hardware-config-toolbar">
              <label>
                MPU
                <select value={config.selectedMpuId || ''} onChange={(e) => handleMpuChange(e.target.value)}>
                  {catalog.mpus.map((mpu) => (
                    <option key={mpu.id} value={mpu.id}>
                      {mpu.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Template
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                  <option value="">Choose template...</option>
                  {catalog.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="hardware-config-inline-button" onClick={applyTemplate} disabled={!selectedTemplateId}>
                Apply Template
              </button>
            </div>

            <div className="hardware-config-body">
              <section className="hardware-panel hardware-panel-left">
                <h3>{selectedMpu?.name || 'MPU'}</h3>
                <p className="hardware-helper-text">
                  {activeMpuPinId
                    ? 'Now click a component pin on the right to connect it.'
                    : 'Click a pin label to select it for mapping.'}
                </p>

                {(selectedMpu?.svg_raw || selectedMpu?.svg_url) ? (
                  <MpuPinDiagram
                    svgRaw={selectedMpu.svg_raw}
                    svgUrl={selectedMpu.svg_url}
                    pins={selectedMpu.pins || []}
                    mappings={config.mappings}
                    activePinId={activeMpuPinId}
                    hoveredPinId={hoveredMpuPinId}
                    onPinClick={(pinId) =>
                      setActiveMpuPinId((prev) => (prev === pinId ? null : pinId))
                    }
                    onPinHover={setHoveredMpuPinId}
                    onClearMapping={clearMapping}
                  />
                ) : (
                  <>
                    {renderPartPreview(selectedMpu, 'part-preview')}
                    <div className="mpu-pin-list">
                      {(selectedMpu?.pins || []).map((pin) => {
                        const mapping = config.mappings?.[pin.id];
                        return (
                          <div className="mpu-pin-row" key={pin.id}>
                            <span className="mpu-pin-name">{pin.name}</span>
                            <button
                              className={`mpu-pin-input ${activeMpuPinId === pin.id ? 'active' : ''}`}
                              onClick={() => setActiveMpuPinId(pin.id)}
                              onMouseEnter={() => setHoveredMpuPinId(pin.id)}
                              onMouseLeave={() => setHoveredMpuPinId(null)}
                              title={mapping?.label || 'No mapping yet'}
                            >
                              {mapping?.label || 'Click to map...'}
                            </button>
                            {mapping && (
                              <button className="mpu-clear-button" onClick={() => clearMapping(pin.id)}>
                                Clear
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              <section className="hardware-panel hardware-panel-right">
                <h3>External Components</h3>
                <div className="component-toolbar">
                  <select value={selectedAddComponentId} onChange={(e) => setSelectedAddComponentId(e.target.value)}>
                    <option value="">Add component...</option>
                    {catalog.components.map((component) => (
                      <option key={component.id} value={component.id}>
                        {component.name}
                      </option>
                    ))}
                  </select>
                  <button className="hardware-config-inline-button" onClick={handleAddComponent} disabled={!selectedAddComponentId}>
                    Add
                  </button>
                </div>

                <div className="component-list">
                  {instantiatedComponents.map((component) => {
                    const hasVisualDiagram =
                      (component.svg_raw || component.svg_url) &&
                      component.pins.some((p) => p.svgId);

                    return (
                      <article key={component.instanceId} className="component-card">
                        <div className="component-card-header">
                          <strong>{component.nickname}</strong>
                          <button className="component-remove" onClick={() => removeComponent(component.instanceId)}>
                            Remove
                          </button>
                        </div>

                        {hasVisualDiagram ? (
                          <ComponentPinDiagram
                            svgRaw={component.svg_raw}
                            svgUrl={component.svg_url}
                            pins={component.pins}
                            instanceId={component.instanceId}
                            mappings={config.mappings}
                            activeMpuPinId={activeMpuPinId}
                            hoveredMpuPinId={hoveredMpuPinId}
                            mpuPins={selectedMpu?.pins || []}
                            onPinClick={(pinId) => {
                              const pin = component.pins.find((p) => p.id === pinId);
                              if (pin) handlePinConnect(component, pin);
                            }}
                          />
                        ) : (
                          <>
                            {renderPartPreview(component, 'part-preview')}
                            <div className="component-pin-list">
                              {component.pins.map((pin) => {
                                const shouldBlink = Object.entries(config.mappings || {}).some(
                                  ([mpuPinId, mapping]) =>
                                    mpuPinId === hoveredMpuPinId &&
                                    mapping?.instanceId === component.instanceId &&
                                    mapping?.componentPinId === pin.id,
                                );
                                return (
                                  <button
                                    key={pin.id}
                                    className={`component-pin-button ${shouldBlink ? 'blink' : ''}`}
                                    onClick={() => handlePinConnect(component, pin)}
                                    title={pin.description || pin.name}
                                  >
                                    {pin.name}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}

        <div className="hardware-config-actions">
          <button className="topbar-button" onClick={onClose}>
            Cancel
          </button>
          <button className="topbar-button save" onClick={handleSave} disabled={isSaving || loading || !config}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HardwareConfigModal;
