import { useEffect, useState } from 'react';
import { useStore } from './engine/store';
import { BAD_END, getEnding, scenes } from './engine/story';
import { useStoryEngine } from './engine/useStoryEngine';
import { SceneStage } from './components/SceneStage';
import { DialogBox } from './components/DialogBox';
import { DecisionMenu } from './components/DecisionMenu';
import { EndingsGallery, HistoryPanel, OptionsPanel, SaveLoadPanel } from './components/Panels';
import { SceneMap } from './components/SceneMap';
import advertencia from './data/advertencia.json';

type Overlay = 'history' | 'save' | 'load' | 'map' | 'endings' | 'options' | null;

export default function App() {
  const [accepted, setAccepted] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const hasGame = useStore((s) => !!s.game);

  // Una partida guardada en el navegador puede apuntar a una escena que ya se borró del JSON.
  useEffect(() => {
    const { game, quitToTitle } = useStore.getState();
    if (game && !scenes.has(game.sceneId)) quitToTitle();
  }, []);

  if (!accepted) return <ContentWarning onAccept={() => setAccepted(true)} />;

  const close = () => setOverlay(null);
  return (
    <div className="app">
      {hasGame ? <Game open={setOverlay} paused={overlay !== null} /> : <TitleScreen open={setOverlay} />}
      {overlay === 'history' && <HistoryPanel onClose={close} />}
      {(overlay === 'save' || overlay === 'load') && <SaveLoadPanel mode={overlay} onClose={close} />}
      {overlay === 'map' && <SceneMap onClose={close} onJump={close} />}
      {overlay === 'endings' && <EndingsGallery onClose={close} />}
      {overlay === 'options' && <OptionsPanel onClose={close} />}
    </div>
  );
}

function ContentWarning({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="screen warning">
      <h1>{advertencia.titulo}</h1>
      <p>{advertencia.texto}</p>
      <p className="muted">{advertencia.nota_efectos}</p>
      <button onClick={onAccept}>{advertencia.aceptar}</button>
    </div>
  );
}

function TitleScreen({ open }: { open: (o: Overlay) => void }) {
  const newGame = useStore((s) => s.newGame);
  const error = useStore((s) => s.error);
  return (
    <div className="screen title">
      <h1 className="title-logo">
        <img src={`${import.meta.env.BASE_URL}marca/logo.webp`} alt="PROYECT GENESIS" draggable={false} />
      </h1>
      <p className="muted">Prototipo</p>
      {error && <p className="error">{error}</p>}
      <nav className="title-menu">
        <button onClick={newGame}>Nueva partida</button>
        <button onClick={() => open('load')}>Cargar</button>
        <button onClick={() => open('map')}>Mapa de escenas</button>
        <button onClick={() => open('endings')}>Finales</button>
        <button onClick={() => open('options')}>Opciones</button>
      </nav>
    </div>
  );
}

function Game({ open, paused }: { open: (o: Overlay) => void; paused: boolean }) {
  const { game, scene, choices, waitingChoice, effects, mode, textDone } = useStoryEngine();
  const { advance, next, choose, setMode, quitToTitle } = useStore.getState();
  const error = useStore((s) => s.error);

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!(waitingChoice && textDone)) next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, waitingChoice, textDone, next]);

  // Abrir un panel detiene el autoavance y el salto.
  useEffect(() => {
    if (paused) setMode('normal');
  }, [paused, setMode]);

  if (!game || !scene) return null;

  if (game.finished) {
    const ending = getEnding(game.finished);
    const bad = ending?.tipo === BAD_END;
    const header = bad ? 'BAD END' : ending?.pieza === 'prototipo' ? 'FIN DEL CAPÍTULO' : 'FIN';
    return (
      <div className={`screen ending-card ${bad ? 'ending-bad' : ''}`} onClick={advance}>
        <p className={bad ? 'error' : 'muted'}>{header}</p>
        <h1>{ending?.nombre ?? game.finished}</h1>
        <p className="muted">Haz clic para volver al título</p>
      </div>
    );
  }

  const toggle = (m: 'auto' | 'skip') => setMode(mode === m ? 'normal' : m);
  return (
    <SceneStage scene={scene} effects={effects}>
      {error && <p className="error stage-error">{error}</p>}
      {waitingChoice && textDone && <DecisionMenu choices={choices} onChoose={choose} />}
      <DialogBox
        key={scene.scene_id}
        dialogue={scene.dialogue}
        aiVowels={effects.includes('ai_vowels')}
        onAdvance={next}
      />
      {/* Evita que los botones queden enfocados y Espacio los vuelva a pulsar en vez de avanzar. */}
      <div className="toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button className={mode === 'auto' ? 'active' : ''} onClick={() => toggle('auto')}>
          Auto
        </button>
        <button className={mode === 'skip' ? 'active' : ''} onClick={() => toggle('skip')}>
          Saltar leído
        </button>
        <button onClick={() => open('history')}>Historial</button>
        <button onClick={() => open('save')}>Guardar</button>
        <button onClick={() => open('load')}>Cargar</button>
        <button onClick={() => open('map')}>Mapa</button>
        <button onClick={() => open('options')}>Opciones</button>
        <button onClick={quitToTitle}>Título</button>
      </div>
    </SceneStage>
  );
}
