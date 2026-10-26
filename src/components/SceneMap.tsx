import { useEffect, useRef } from 'react';
import { useStore } from '../engine/store';
import { BAD_END, config, getEnding, scenes, variables } from '../engine/story';
import { buildFlow, type FlowNode } from '../engine/flow';
import { Panel } from './Panels';

const NODE_W = 180;
const NODE_H = 52;
const COL_GAP = 56;
const ROW_GAP = 66;
const PAD = 24;

// La historia es estática: el diagrama se calcula una sola vez.
const flow = buildFlow(scenes, config.inicio, variables, ROW_GAP);
const width = flow.columns * (NODE_W + COL_GAP) - COL_GAP + PAD * 2;
const height = Math.max(...flow.nodes.map((n) => n.y)) + NODE_H + PAD * 2;
const pos = (n: FlowNode) => ({ x: PAD + n.col * (NODE_W + COL_GAP), y: PAD + n.y });

/**
 * Mapa de decisiones estilo Shiny Days: árbol horizontal con las decisiones, sus opciones y a dónde llevan.
 * Las decisiones vistas se pueden revisitar con las variables de su primera visita.
 */
export function SceneMap({ onClose, onJump }: { onClose: () => void; onJump: () => void }) {
  const snapshots = useStore((s) => s.snapshots);
  const choicesTaken = useStore((s) => s.choicesTaken);
  const endingsSeen = useStore((s) => s.endingsSeen);
  const current = useStore((s) => s.game?.sceneId);
  const jumpTo = useStore((s) => s.jumpTo);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reached = (n: FlowNode): boolean => {
    switch (n.kind) {
      case 'start':
        return true;
      case 'decision':
        return !!snapshots[n.sceneId!];
      case 'option':
        return !!choicesTaken[n.id];
      case 'ending':
        return !!endingsSeen[scenes.get(n.sceneId!)!.ending!];
    }
  };
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));

  // Al abrir, desplaza el mapa hasta la última decisión alcanzada.
  useEffect(() => {
    const last = flow.nodes.filter((n) => n.kind === 'decision' && reached(n)).sort((a, b) => b.col - a.col)[0];
    if (last && scrollRef.current) scrollRef.current.scrollLeft = pos(last).x - 120;
    // Solo al abrir el mapa.
  }, []);

  const label = (n: FlowNode): string => {
    if (n.kind === 'start') return 'Inicio';
    if (n.kind === 'ending') {
      const id = scenes.get(n.sceneId!)!.ending!;
      const prefix = getEnding(id)?.tipo === BAD_END ? 'BAD END' : 'FIN';
      return reached(n) ? `${prefix}: ${getEnding(id)?.nombre ?? id}` : '???';
    }
    if (n.kind === 'decision') return reached(n) ? n.label : '???';
    // Opción: se ve si ya se eligió, o si está tachada en una decisión ya vista.
    if (reached(n) || (n.locked && snapshots[n.sceneId!])) return n.label;
    return '???';
  };

  return (
    <Panel title="Mapa de decisiones" onClose={onClose} wide>
      <div className="flow-scroll" ref={scrollRef}>
        <div className="flow" style={{ width, height }}>
          <svg className="flow-edges" width={width} height={height}>
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
              n.kind === 'ending' && getEnding(scenes.get(n.sceneId!)!.ending!)?.tipo === BAD_END ? 'flow-bad' : '',
              n.sceneId === current && n.kind === 'decision' ? 'flow-current' : '',
            ].join(' ');
            return (
              <button
                key={n.id}
                className={classes}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                disabled={!canJump}
                title={canJump ? 'Volver a esta decisión' : undefined}
                onClick={() => {
                  jumpTo(n.sceneId!);
                  onJump();
                }}
              >
                <span>{label(n)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="muted flow-legend">
        ◆ decisión (clic para volver) · ○ opción · ■ final · ✕ bad end · ??? sin descubrir · <s>tachada</s> opción que el juego no permite
      </p>
    </Panel>
  );
}
