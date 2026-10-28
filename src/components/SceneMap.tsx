import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useStore } from '../engine/store';
import { BAD_END, config, endingName, getEnding, scenes, variables } from '../engine/story';
import { useLang, useT } from '../engine/i18n';
import { buildFlow, type FlowNode } from '../engine/flow';
import { Panel } from './Panels';

const NODE_W = 190;
const NODE_H = 56;
const COL_GAP = 56;
const ROW_GAP = 66;
const PAD = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.2;
// Movimiento mínimo (px) para que un arrastre no cuente como clic en un nodo.
const DRAG_THRESHOLD = 6;

interface View {
  x: number;
  y: number;
  k: number;
}
const clamp = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

// La historia es estática: el diagrama se calcula una sola vez.
const flow = buildFlow(scenes, config.inicio, variables, ROW_GAP);
const width = flow.columns * (NODE_W + COL_GAP) - COL_GAP + PAD * 2;
const height = Math.max(...flow.nodes.map((n) => n.y)) + NODE_H + PAD * 2;
const pos = (n: FlowNode) => ({ x: PAD + n.col * (NODE_W + COL_GAP), y: PAD + n.y });

/**
 * Mapa de decisiones estilo Shiny Days: árbol horizontal con las decisiones, sus opciones y a dónde llevan.
 * Las decisiones vistas se pueden revisitar con las variables de su primera visita.
 * Se arrastra para moverse y se acerca o aleja con la rueda, pellizcando o con los botones.
 */
export function SceneMap({ onClose, onJump }: { onClose: () => void; onJump: () => void }) {
  const snapshots = useStore((s) => s.snapshots);
  const choicesTaken = useStore((s) => s.choicesTaken);
  const endingsSeen = useStore((s) => s.endingsSeen);
  const current = useStore((s) => s.game?.sceneId);
  const jumpTo = useStore((s) => s.jumpTo);
  const t = useT();
  const lang = useLang();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });

  const reached = (n: FlowNode): boolean => {
    switch (n.kind) {
      case 'start':
        return true;
      case 'decision':
        return !!snapshots[n.sceneId!];
      case 'option':
        return !!choicesTaken[n.id];
      case 'ending': {
        const s = scenes.get(n.sceneId!)!;
        return s.ending ? !!endingsSeen[s.ending] : !!snapshots[s.scene_id];
      }
    }
  };
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));

  // Centra la vista en un nodo (la decisión actual o la última alcanzada).
  const focusNode = useCallback((n: FlowNode | undefined, k = 1) => {
    const vp = viewportRef.current;
    if (!vp || !n) return;
    const p = pos(n);
    setView({ k, x: vp.clientWidth / 2 - (p.x + NODE_W / 2) * k, y: vp.clientHeight / 2 - (p.y + NODE_H / 2) * k });
  }, []);
  const focusTarget = () =>
    flow.nodes.find((n) => n.kind === 'decision' && n.sceneId === current) ??
    flow.nodes.filter((n) => n.kind === 'decision' && reached(n)).sort((a, b) => b.col - a.col)[0] ??
    flow.nodes[0];
  const fitAll = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const k = clamp(Math.min(vp.clientWidth / width, vp.clientHeight / height));
    setView({ k, x: (vp.clientWidth - width * k) / 2, y: (vp.clientHeight - height * k) / 2 });
  };
  // Al abrir: centrado en la decisión actual o en la última alcanzada.
  useEffect(() => {
    focusNode(focusTarget());
    // Solo al abrir el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom con centro en un punto de la pantalla (el cursor o el medio del pellizco).
  const zoomAt = (factor: number, cx: number, cy: number) =>
    setView((v) => {
      const k = clamp(v.k * factor);
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });
  const zoomCenter = (factor: number) => {
    const vp = viewportRef.current;
    if (vp) zoomAt(factor, vp.clientWidth / 2, vp.clientHeight / 2);
  };

  // Rueda del mouse (no pasiva, para que la página no se desplace).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  // Arrastrar con un dedo o el mouse; pellizcar con dos dedos.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, pinch: 0 });
  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 1) {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      gesture.current.moved += Math.abs(dx) + Math.abs(dy);
      // Recién al pasar el umbral se toma el puntero: así un toque corto sigue siendo un clic en el nodo.
      if (gesture.current.moved > DRAG_THRESHOLD) {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = viewportRef.current!.getBoundingClientRect();
      if (gesture.current.pinch) zoomAt(dist / gesture.current.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      gesture.current.pinch = dist;
      gesture.current.moved = DRAG_THRESHOLD + 1;
    }
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinch = 0;
  };

  const label = (n: FlowNode): string => {
    if (n.kind === 'start') return t('mapa.inicio');
    if (n.kind === 'ending') {
      const s = scenes.get(n.sceneId!)!;
      if (!s.ending) return reached(n) ? t('mapa.fin_capitulo', { n: s.fin_capitulo ?? '' }) : '???';
      const id = s.ending;
      const e = getEnding(id);
      const prefix = e?.tipo === BAD_END ? t('mapa.bad') : t('mapa.fin');
      return reached(n) ? `${prefix}: ${e ? endingName(e, lang) : id}` : '???';
    }
    if (n.kind === 'decision') return reached(n) ? n.label : '???';
    // Opción: se ve si ya se eligió, o si está tachada en una decisión ya vista.
    if (reached(n) || (n.locked && snapshots[n.sceneId!])) return n.label;
    return '???';
  };

  return (
    <Panel title={t('mapa.titulo')} onClose={onClose} wide>
      <div
        className={`flow-viewport ${gesture.current.moved > DRAG_THRESHOLD ? 'flow-dragging' : ''}`}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flow" style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          <svg className="flow-edges" width={width} height={height}>
            <defs>
              <linearGradient id="flow-taken" x1="0" x2="1">
                <stop offset="0" stopColor="#ff4f7b" />
                <stop offset="1" stopColor="#ff9a6a" />
              </linearGradient>
            </defs>
            {flow.edges.map((e, i) => {
              const a = byId.get(e.from)!;
              const b = byId.get(e.to)!;
              const pa = pos(a);
              const pb = pos(b);
              const x1 = pa.x + NODE_W;
              const y1 = pa.y + NODE_H / 2;
              const x2 = pb.x;
              const y2 = pb.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  className={reached(a) && reached(b) ? 'flow-edge flow-edge-taken' : 'flow-edge'}
                />
              );
            })}
          </svg>
          {flow.nodes.map((n) => {
            const p = pos(n);
            const ok = reached(n);
            const canJump = n.kind === 'decision' && ok;
            const classes = [
              'flow-node',
              `flow-${n.kind}`,
              ok ? 'flow-reached' : 'flow-unknown',
              n.locked ? 'flow-locked' : '',
              n.kind === 'ending' && getEnding(scenes.get(n.sceneId!)!.ending ?? '')?.tipo === BAD_END ? 'flow-bad' : '',
              n.sceneId === current && n.kind === 'decision' ? 'flow-current' : '',
            ].join(' ');
            return (
              <button
                key={n.id}
                className={classes}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                disabled={!canJump}
                title={canJump ? t('mapa.volver') : undefined}
                onClick={() => {
                  // Si fue un arrastre, no es un clic.
                  if (gesture.current.moved > DRAG_THRESHOLD) return;
                  jumpTo(n.sceneId!);
                  onJump();
                }}
              >
                <span>{label(n)}</span>
              </button>
            );
          })}
        </div>
        <div className="flow-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => zoomCenter(1.25)} aria-label={t('mapa.acercar')}>
            +
          </button>
          <span>{Math.round(view.k * 100)} %</span>
          <button onClick={() => zoomCenter(0.8)} aria-label={t('mapa.alejar')}>
            −
          </button>
          <button onClick={fitAll}>{t('mapa.ver_todo')}</button>
          <button onClick={() => focusNode(focusTarget())}>{t('mapa.ir_actual')}</button>
        </div>
      </div>
      <div className="flow-legend">
        <span className="flow-chip flow-chip-decision">{t('mapa.ley_decision')}</span>
        <span className="flow-chip">{t('mapa.ley_opcion')}</span>
        <span className="flow-chip flow-chip-bad">{t('mapa.ley_bad')}</span>
        <span className="flow-chip">{t('mapa.ley_fin')}</span>
        <span className="flow-chip flow-chip-unknown">{t('mapa.ley_desconocido')}</span>
        <span className="muted flow-hint">{t('mapa.ayuda')}</span>
      </div>
    </Panel>
  );
}
