import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Blend, BoxSelect, Circle, Copy, Cpu, Download, Eye, EyeOff, Filter,
  Layers3, MonitorPlay, MousePointer2, Plus, RefreshCw, Save, Scissors,
  Square, Trash2, Unplug, WandSparkles, Wifi, WifiOff, Puzzle,
} from 'lucide-react';
import {
  addCaptureFilter, addCaptureMask, createCaptureProfile, deleteCaptureFilter,
  deleteCaptureMask, deleteCaptureProfile, listCaptureProfiles, saveCaptureSource,
  updateCaptureMask, updateCaptureProfile,
} from './slotCaptureService';
import { FILTER_DEFAULTS, makeFilter, makeMask, MASK_DEFAULTS, QUALITY_PRESETS } from './slotCaptureModel';
import { sendCaptureCommand } from './slotCaptureBridge';
import './SlotCaptureManager.css';

const MASK_LABELS = { rectangle: 'Retângulo', ellipse: 'Elipse', polygon: 'Polígono', freehand: 'Desenho livre', image: 'Imagem', luminance: 'Luminância', chroma: 'Chroma key', gradient: 'Gradiente' };
const FILTER_LABELS = { brightness: 'Brilho', contrast: 'Contraste', saturation: 'Saturação', gamma: 'Gama', exposure: 'Exposição', temperature: 'Temperatura', tint: 'Matiz', hue: 'Rotação de cor', sharpen: 'Nitidez', blur: 'Desfoque', pixelate: 'Pixelizar', vignette: 'Vinheta', glow: 'Brilho exterior', bloom: 'Bloom', opacity: 'Opacidade', chroma: 'Chroma key', luminance: 'Luminância' };

function statusTone(value) {
  return ['connected', 'active'].includes(value) ? 'good' : ['stale', 'hidden'].includes(value) ? 'warn' : 'bad';
}

function LocalPreview({ agent, profile }) {
  const previewUrl = agent?.connected && agent?.previewBaseUrl && profile
    ? `${agent.previewBaseUrl.replace(/\/$/, '')}/${profile.id}?token=${encodeURIComponent(agent.sessionToken || '')}`
    : '';
  return (
    <div className="sc-preview">
      {previewUrl ? (
        <iframe src={previewUrl} title={`Pré-visualização local de ${profile.name}`} allow="autoplay" />
      ) : (
        <div className="sc-preview__offline">
          <Unplug size={38} />
          <strong>Pré-visualização local indisponível</strong>
          <span>Inicie o agente StreamersCenter. Nenhum vídeo é simulado ou enviado para a nuvem.</span>
        </div>
      )}
      {profile?.slot_capture_masks?.map((mask) => mask.enabled && ['rectangle', 'ellipse'].includes(mask.mask_type) ? (
        <div
          key={mask.id}
          className={`sc-preview__mask sc-preview__mask--${mask.mask_type}`}
          style={{
            left: `${(mask.config.x ?? ((mask.config.cx || 0.5) - (mask.config.rx || 0.4))) * 100}%`,
            top: `${(mask.config.y ?? ((mask.config.cy || 0.5) - (mask.config.ry || 0.4))) * 100}%`,
            width: `${(mask.config.width ?? ((mask.config.rx || 0.4) * 2)) * 100}%`,
            height: `${(mask.config.height ?? ((mask.config.ry || 0.4) * 2)) * 100}%`,
          }}
        />
      ) : null)}
    </div>
  );
}

export default function SlotCaptureManager() {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activePanel, setActivePanel] = useState('source');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agent, setAgent] = useState({ connected: false, extensionDetected: null });

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId) || profiles[0] || null, [profiles, selectedId]);
  const source = selected?.slot_capture_sources?.[0] || null;
  const output = selected?.slot_capture_outputs?.[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError('');
      const rows = await listCaptureProfiles();
      setProfiles(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar as capturas. A migração da base de dados pode ainda não estar aplicada.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAgent = useCallback(async () => {
    try {
      const response = await sendCaptureCommand('status');
      setAgent({ ...(response.agent || { connected: false }), extensionDetected: true });
      if (response.selection && selected) {
        const alreadySaved = source?.element_fingerprint === response.selection.fingerprint;
        if (!alreadySaved) setMessage('Existe uma nova região selecionada na extensão. Use “Associar seleção”.');
      }
    } catch (bridgeError) {
      setAgent({ connected: false, extensionDetected: false, error: bridgeError.message });
    }
  }, [selected, source?.element_fingerprint]);

  useEffect(() => { load(); refreshAgent(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(refreshAgent, 5000);
    return () => window.clearInterval(timer);
  }, [refreshAgent]);

  const mutate = async (operation, success) => {
    setSaving(true);
    setError('');
    try {
      await operation();
      setMessage(success);
      await load();
      window.setTimeout(() => setMessage(''), 2800);
    } catch (mutationError) {
      setError(mutationError.message || 'A alteração falhou.');
    } finally {
      setSaving(false);
    }
  };

  const createProfile = () => mutate(async () => {
    const profile = await createCaptureProfile(`Captura ${profiles.length + 1}`);
    setSelectedId(profile.id);
  }, 'Captura criada.');

  const selectInBrowser = async () => {
    setError('');
    try {
      await sendCaptureCommand('start-selector');
      setMessage('Passe o rato sobre o jogo no separador do casino e clique para confirmar.');
    } catch (selectError) {
      setError(selectError.message);
    }
  };

  const attachSelection = async () => {
    if (!selected) return;
    try {
      const status = await sendCaptureCommand('status');
      if (!status.selection) throw new Error('Selecione primeiro uma região através da extensão.');
      await mutate(async () => {
        await saveCaptureSource(selected, status.selection);
        await sendCaptureCommand('agent-command', {
          command: 'bind-profile',
          payload: { profileId: selected.id, captureId: status.selection.captureId, outputWidth: selected.output_width, outputHeight: selected.output_height, fps: selected.output_fps },
        });
      }, 'Região associada à captura e enviada ao agente local.');
    } catch (attachError) {
      setError(attachError.message);
    }
  };

  const patchProfile = (patch) => selected && mutate(() => updateCaptureProfile(selected.id, patch), 'Definições guardadas.');
  const addMask = (type) => selected && mutate(() => addCaptureMask(selected, makeMask(type, selected.slot_capture_masks?.length || 0)), 'Máscara adicionada.');
  const addFilter = (type) => selected && mutate(() => addCaptureFilter(selected, makeFilter(type, selected.slot_capture_filters?.length || 0)), 'Filtro adicionado.');

  return (
    <main className="sc-page">
      <header className="sc-header">
        <div>
          <span className="sc-eyebrow">Captura local para OBS</span>
          <h1>Slot Capture</h1>
          <p>Capture apenas o jogo selecionado. O vídeo permanece neste computador.</p>
        </div>
        <div className={`sc-agent sc-agent--${agent.connected ? 'online' : 'offline'}`}>
          {agent.connected ? <Wifi size={18} /> : agent.extensionDetected ? <Puzzle size={18} /> : <WifiOff size={18} />}
          <div><strong>{agent.connected ? 'Agente ligado' : agent.extensionDetected ? 'Extensão detetada' : 'Extensão não detetada'}</strong><small>{agent.connected ? `v${agent.version || '-'}` : agent.extensionDetected ? agent.error || 'Inicie o agente local' : 'Instale a extensão e recarregue esta página'}</small></div>
          <button type="button" onClick={refreshAgent} title="Atualizar estado"><RefreshCw size={15} /></button>
        </div>
      </header>

      {agent.extensionDetected === false && (
        <section className="sc-extension-setup" aria-labelledby="slot-capture-extension-title">
          <div className="sc-extension-setup__icon"><Puzzle size={28} /></div>
          <div className="sc-extension-setup__content">
            <span className="sc-eyebrow">Configuração necessária</span>
            <h2 id="slot-capture-extension-title">Instalar a extensão StreamersCenter</h2>
            <p>O instalador Windows prepara o agente local e extrai a extensão. O Chrome ou Edge exige apenas uma confirmação manual para carregar a pasta.</p>
            <ol>
              <li>Descarregue e execute o instalador Windows.</li>
              <li>No instalador, abra <code>chrome://extensions</code> ou <code>edge://extensions</code>.</li>
              <li>Ative <strong>Modo de programador</strong>, carregue a pasta preparada e copie o ID.</li>
              <li>Cole o ID no instalador, conclua e recarregue esta página.</li>
            </ol>
          </div>
          <div className="sc-extension-setup__actions">
            <a className="sc-primary" href="/downloads/StreamersCenterSlotCaptureSetup.exe" download><Download size={16} /> Instalador Windows (.exe)</a>
            <a href="/downloads/streamerscenter-slot-capture-extension.zip" download><Download size={15} /> Apenas extensão (.zip)</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(navigator.userAgent.includes('Edg') ? 'edge://extensions' : 'chrome://extensions').then(() => setMessage('Endereço das extensões copiado. Cole-o na barra de endereço.'))}><Copy size={15} /> Copiar endereço</button>
            <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Já instalei — recarregar</button>
          </div>
        </section>
      )}

      {error && <div className="sc-alert sc-alert--error">{error}</div>}
      {message && <div className="sc-alert sc-alert--success">{message}</div>}

      <section className="sc-workspace">
        <aside className="sc-sidebar">
          <div className="sc-sidebar__head"><div><span>Capturas</span><small>{profiles.length} configuradas</small></div><button type="button" onClick={createProfile} disabled={saving}><Plus size={16} /></button></div>
          <div className="sc-captures">
            {loading ? <div className="sc-skeleton" /> : profiles.map((profile, index) => {
              const profileSource = profile.slot_capture_sources?.[0];
              return (
                <button key={profile.id} type="button" className={`sc-capture ${selected?.id === profile.id ? 'is-active' : ''}`} onClick={() => setSelectedId(profile.id)}>
                  <span className={`sc-dot sc-dot--${statusTone(profileSource?.last_status)}`} />
                  <div><strong>{profile.name}</strong><small>{profileSource?.page_domain || 'Sem origem associada'}</small></div>
                  <b>{index + 1}</b>
                </button>
              );
            })}
          </div>
          {selected && <button type="button" className="sc-danger-link" onClick={() => mutate(() => deleteCaptureProfile(selected.id), 'Captura eliminada.')}><Trash2 size={14} /> Eliminar captura</button>}
        </aside>

        <section className="sc-stage">
          <div className="sc-stage__toolbar">
            <button type="button"><MousePointer2 size={15} /> Selecionar</button>
            <button type="button"><BoxSelect size={15} /> Transformar</button>
            <span />
            <button type="button" onClick={selectInBrowser}><Scissors size={15} /> Selecionar slot no browser</button>
          </div>
          <LocalPreview agent={agent} profile={selected} />
          <footer className="sc-statusbar">
            <span><Activity size={14} /> {agent.fps || 0} FPS</span>
            <span>{agent.latencyMs == null ? 'Latência —' : `${agent.latencyMs} ms`}</span>
            <span><Cpu size={14} /> GPU {agent.gpuUsage == null ? '—' : `${agent.gpuUsage}%`}</span>
            <span>{source ? `${selected.output_width}×${selected.output_height}` : 'Sem fonte'}</span>
          </footer>
        </section>

        <aside className="sc-inspector">
          <nav className="sc-tabs">
            {[['source', MonitorPlay, 'Fonte'], ['masks', Layers3, 'Máscaras'], ['filters', Filter, 'Filtros'], ['output', Blend, 'Saída']].map(([id, Icon, label]) => (
              <button key={id} type="button" className={activePanel === id ? 'is-active' : ''} onClick={() => setActivePanel(id)}><Icon size={15} /> {label}</button>
            ))}
          </nav>
          {!selected ? <div className="sc-empty">Crie uma captura para começar.</div> : (
            <div className="sc-inspector__body">
              {activePanel === 'source' && <>
                <h2>Propriedades da captura</h2>
                <label><span>Nome</span><input value={selected.name} onChange={(event) => setProfiles((rows) => rows.map((row) => row.id === selected.id ? { ...row, name: event.target.value } : row))} onBlur={(event) => patchProfile({ name: event.target.value.trim() || 'Captura' })} /></label>
                <div className="sc-source-card"><div><strong>{source?.page_title || 'Sem região selecionada'}</strong><small>{source?.page_domain || 'Use a extensão no separador do casino.'}</small></div><span className={`sc-pill sc-pill--${statusTone(source?.last_status)}`}>{source?.last_status || 'desligado'}</span></div>
                <button type="button" className="sc-primary" onClick={attachSelection}><Save size={15} /> Associar seleção mais recente</button>
                <label><span>Predefinição</span><select value={selected.quality_preset} onChange={(event) => patchProfile({ quality_preset: event.target.value })}>{Object.entries(QUALITY_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
                <div className="sc-two"><label><span>Largura</span><input type="number" min="160" max="7680" value={selected.output_width} onChange={(event) => setProfiles((rows) => rows.map((row) => row.id === selected.id ? { ...row, output_width: Number(event.target.value) } : row))} onBlur={(event) => patchProfile({ output_width: Number(event.target.value) })} /></label><label><span>Altura</span><input type="number" min="90" max="4320" value={selected.output_height} onChange={(event) => setProfiles((rows) => rows.map((row) => row.id === selected.id ? { ...row, output_height: Number(event.target.value) } : row))} onBlur={(event) => patchProfile({ output_height: Number(event.target.value) })} /></label></div>
                <label><span>FPS</span><select value={selected.output_fps} onChange={(event) => patchProfile({ output_fps: Number(event.target.value) })}>{[15,24,25,30,50,60].map((fps) => <option key={fps}>{fps}</option>)}</select></label>
              </>}
              {activePanel === 'masks' && <>
                <div className="sc-panel-title"><div><h2>Máscaras</h2><p>Coordenadas normalizadas acompanham o redimensionamento.</p></div></div>
                <div className="sc-add-grid">{Object.keys(MASK_DEFAULTS).map((type) => <button key={type} type="button" onClick={() => addMask(type)}><Square size={13} /> {MASK_LABELS[type]}</button>)}</div>
                <div className="sc-stack">{selected.slot_capture_masks?.sort((a,b) => a.sort_order-b.sort_order).map((mask) => <div className="sc-stack-row" key={mask.id}><button type="button" onClick={() => mutate(() => updateCaptureMask(mask.id, { enabled: !mask.enabled }), 'Máscara atualizada.')}>{mask.enabled ? <Eye size={15} /> : <EyeOff size={15} />}</button><div><strong>{mask.name}</strong><small>{MASK_LABELS[mask.mask_type]} · {mask.operation}</small></div><button type="button" onClick={() => mutate(() => deleteCaptureMask(mask.id), 'Máscara eliminada.')}><Trash2 size={14} /></button></div>)}</div>
              </>}
              {activePanel === 'filters' && <>
                <h2>Filtros GPU</h2><p className="sc-note">Filtros desligados são omitidos pelo agente.</p>
                <div className="sc-add-grid">{Object.keys(FILTER_DEFAULTS).map((type) => <button key={type} type="button" onClick={() => addFilter(type)}><WandSparkles size={13} /> {FILTER_LABELS[type]}</button>)}</div>
                <div className="sc-stack">{selected.slot_capture_filters?.sort((a,b) => a.sort_order-b.sort_order).map((filter) => <div className="sc-stack-row" key={filter.id}><WandSparkles size={15} /><div><strong>{FILTER_LABELS[filter.filter_type]}</strong><small>{filter.enabled ? 'Ativo' : 'Desligado'}</small></div><button type="button" onClick={() => mutate(() => deleteCaptureFilter(filter.id), 'Filtro eliminado.')}><Trash2 size={14} /></button></div>)}</div>
              </>}
              {activePanel === 'output' && <>
                <h2>Saída OBS independente</h2>
                {output ? <div className="sc-output"><span>Identificador da fonte</span><code>{output.output_key}</code><button type="button" onClick={() => navigator.clipboard.writeText(output.output_key)}><Copy size={15} /> Copiar</button>{agent.obsBaseUrl && <button type="button" onClick={() => navigator.clipboard.writeText(`${agent.obsBaseUrl.replace(/\/$/, '')}/${selected.id}?token=${encodeURIComponent(agent.sessionToken || '')}`)}><Copy size={15} /> Copiar URL local OBS</button>}</div> : <div className="sc-empty">Saída ainda não criada.</div>}
                <div className="sc-callout"><MonitorPlay size={20} /><div><strong>Fonte nativa recomendada</strong><p>No OBS, adicione “StreamersCenter Slot Capture” e cole este identificador. A rota web só pode usar o transporte local do agente; nunca recebe vídeo da cloud.</p></div></div>
                <label><span>Transição</span><select value={selected.transition?.type || 'crossfade'} onChange={(event) => patchProfile({ transition: { ...selected.transition, type: event.target.value } })}><option value="cut">Corte</option><option value="crossfade">Fundido</option><option value="slide">Deslizar</option><option value="zoom">Zoom</option><option value="glitch">Glitch</option></select></label>
              </>}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
