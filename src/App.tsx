import { useEffect, useState } from 'react';
import { CHAPTER_END, useStore } from './engine/store';
import { BAD_END, getEnding, scenes } from './engine/story';
import { useStoryEngine } from './engine/useStoryEngine';
import { TRANSITIONS, useSceneTransition } from './engine/useSceneTransition';
import { effectsOf } from './engine/logic';
import { SceneStage } from './components/SceneStage';
import { DialogBox } from './components/DialogBox';
import { DecisionMenu } from './components/DecisionMenu';
import { AboutPanel, EndingsGallery, HistoryPanel, OptionsPanel, SaveLoadPanel } from './components/Panels';
import { TitleBackground } from './components/TitleBackground';
import { SceneMap } from './components/SceneMap';
import { ChapterEnd } from './components/ChapterEnd';
import advertencia from './data/advertencia.json';
import { canFullscreen, enterPlayMode, isTouch, toggleFullscreen } from './engine/mobile';
import { playSelect, unlockAudio } from './engine/sound';
import { playMusic, SILENCE } from './engine/music';
import { config } from './engine/story';

type Overlay = 'history' | 'save' | 'load' | 'map' | 'endings' | 'options' | 'about' | null;

export default function App() {
  const [accepted, setAccepted] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const hasGame = useStore((s) => !!s.game);
  // Título y fin de capítulo: el tema del título. En juego: el tema vigente de la escena. En una pantalla de final: silencio.
  const music = useStore((s) =>
    !s.game || s.game.finished?.startsWith(CHAPTER_END)
      ? config.musica_titulo ?? SILENCE
      : s.game.finished
        ? SILENCE
        : ((s.game.vars._musica as string | null) ?? SILENCE),
  );
  useEffect(() => {
    if (accepted) playMusic(music);
  }, [accepted, music]);

  // Una partida guardada en el navegador puede apuntar a una escena que ya se borró del JSON.
  useEffect(() => {
    const { game, quitToTitle } = useStore.getState();
    if (game && !scenes.has(game.sceneId)) quitToTitle();
  }, []);

  if (!accepted) {
    return (
      <ContentWarning
        onAccept={() => {
          // El toque en «Continuar» habilita el audio del navegador y precarga los efectos.
          unlockAudio();
          // Si hay una partida en curso, se vuelve directo al juego: en celular, en pantalla completa.
          if (useStore.getState().game) void enterPlayMode();
          setAccepted(true);
        }}
      />
    );
  }

  const close = () => setOverlay(null);
  return (
    <div className="app">
      {hasGame ? <Game open={setOverlay} paused={overlay !== null} /> : <TitleScreen open={setOverlay} />}
      {overlay === 'history' && <HistoryPanel onClose={close} />}
      {(overlay === 'save' || overlay === 'load') && <SaveLoadPanel mode={overlay} onClose={close} />}
      {overlay === 'map' && <SceneMap onClose={close} onJump={close} />}
      {overlay === 'endings' && <EndingsGallery onClose={close} />}
      {overlay === 'options' && <OptionsPanel onClose={close} />}
      {overlay === 'about' && <AboutPanel onClose={close} />}
      {hasGame && <RotateHint />}
    </div>
  );
}

/** Celular en vertical durante el juego: se pide girarlo (solo se ve con CSS en esa situación). */
function RotateHint() {
  return (
    <div className="rotate-hint" role="alert">
      <div className="rotate-hint-phone" aria-hidden />
      <p>Gira tu celular para jugar</p>
      <p className="muted">PROYECT GENESIS se juega en horizontal.</p>
    </div>
  );
}

function ContentWarning({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="screen warning">
      <TitleBackground />
      <div className="warning-card">
        <header className="warning-head">
          <span className="warning-badge">{advertencia.etiqueta}</span>
          <div>
            <h1>{advertencia.titulo}</h1>
            <p className="warning-rating">{advertencia.clasificacion}</p>
          </div>
        </header>
        <p className="warning-intro">{advertencia.texto}</p>
        <ul className="warning-themes">
          {advertencia.temas.map((t) => (
            <li key={t.titulo}>
              <strong>{t.titulo}</strong>
              <span>{t.detalle}</span>
            </li>
          ))}
        </ul>
        <p className="warning-note">{advertencia.nota_efectos}</p>
        <p className="warning-note">{advertencia.ficcion}</p>
        <button className="warning-accept" onClick={onAccept}>
          {advertencia.aceptar}
        </button>
      </div>
    </div>
  );
}

function TitleScreen({ open }: { open: (o: Overlay) => void }) {
  const newGame = useStore((s) => s.newGame);
  const error = useStore((s) => s.error);
  return (
    <div className="screen title">
      <TitleBackground />
      <h1 className="title-logo">
        <img src={`${import.meta.env.BASE_URL}marca/logo.webp`} alt="PROYECT GENESIS" draggable={false} />
      </h1>
      <p className="muted">Prototipo</p>
      {error && <p className="error">{error}</p>}
      <nav className="title-menu">
        <button
          onClick={() => {
            void enterPlayMode();
            newGame();
          }}
        >
          Nueva partida
        </button>
        <button onClick={() => open('load')}>Cargar</button>
        <button onClick={() => open('map')}>Mapa de escenas</button>
        <button onClick={() => open('endings')}>Finales</button>
        <button onClick={() => open('options')}>Opciones</button>
        <button onClick={() => open('about')}>Conoce más del proyecto</button>
      </nav>
    </div>
  );
}

function Game({ open, paused }: { open: (o: Overlay) => void; paused: boolean }) {
  const { game, scene, choices, waitingChoice, mode, textDone } = useStoryEngine();
  const { advance, next, choose, setMode, quitToTitle } = useStore.getState();
  const error = useStore((s) => s.error);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceEffects = useStore((s) => s.settings.reduceEffects);
  // Cambio de lugar: fundido a negro. Durante el oscurecimiento se muestra la escena anterior.
  const { shown, phase, color } = useSceneTransition(scene, mode === 'skip');
  const fading = phase === 'out';
  const advanceIfReady = () => {
    if (!fading) next();
  };

  useEffect(() => {
    if (paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        // En el fin de capítulo se elige con los botones.
        if (useStore.getState().game?.finished?.startsWith(CHAPTER_END)) return;
        e.preventDefault();
        if (!fading && !(waitingChoice && textDone)) next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, fading, waitingChoice, textDone, next]);

  // Abrir un panel detiene el autoavance y el salto.
  useEffect(() => {
    if (paused) setMode('normal');
  }, [paused, setMode]);

  if (!game || !scene || !shown) return null;

  if (game.finished) {
    if (game.finished.startsWith(CHAPTER_END)) {
      return (
        <ChapterEnd
          chapter={Number(game.finished.slice(CHAPTER_END.length))}
          onSave={() => open('save')}
          lastScene={
            <SceneStage scene={shown} effects={[]} speakers={[]} lines={game.history.filter((h) => !h.choice)}>
              {null}
            </SceneStage>
          }
        />
      );
    }
    const ending = getEnding(game.finished);
    const bad = ending?.tipo === BAD_END;
    return (
      <div className={`screen ending-card ${bad ? 'ending-bad' : ''}`} onClick={advance}>
        <p className={bad ? 'error' : 'muted'}>{bad ? 'BAD END' : 'FIN'}</p>
        <h1>{ending?.nombre ?? game.finished}</h1>
        <p className="muted">Haz clic para volver al título</p>
      </div>
    );
  }

  const toggle = (m: 'auto' | 'skip') => setMode(mode === m ? 'normal' : m);
  const buttons = (
    <>
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
      {isTouch() && canFullscreen() && <button onClick={() => void toggleFullscreen()}>Pantalla completa</button>}
      <button onClick={quitToTitle}>Título</button>
    </>
  );
  return (
    <SceneStage
      scene={shown}
      effects={reduceEffects ? [] : effectsOf(shown)}
      speakers={game.history.filter((h) => !h.choice).map((h) => h.speaker)}
      lines={game.history.filter((h) => !h.choice)}
    >
      {error && <p className="error stage-error">{error}</p>}
      {mode !== 'normal' && (
        <div className="mode-badge" aria-live="polite">
          {mode === 'auto' ? 'AUTO ▶' : 'SALTANDO ▶▶'}
        </div>
      )}
      {waitingChoice && textDone && !fading && (
        <DecisionMenu
          choices={choices}
          onChoose={(i) => {
            playSelect();
            choose(i);
          }}
        />
      )}
      {/* La línea nueva empieza a escribirse cuando aparece su escena, no detrás del negro. */}
      {!fading && (
        <DialogBox
          key={shown.scene_id}
          dialogue={shown.dialogue}
          aiVowels={!reduceEffects && effectsOf(shown).includes('ai_vowels')}
          onAdvance={advanceIfReady}
        />
      )}
      <div
        className={`scene-fade scene-fade-${phase} scene-fade-${color}`}
        style={{ animationDuration: `${phase === 'out' ? TRANSITIONS[color].out : TRANSITIONS[color].in}ms` }}
        aria-hidden
      />
      {/* Evita que los botones queden enfocados y Espacio los vuelva a pulsar en vez de avanzar. */}
      <div className="toolbar" onMouseDown={(e) => e.preventDefault()}>
        {buttons}
      </div>
      {/* Pantallas chicas: los mismos botones dentro de un menú ☰. */}
      <div className="toolbar-compact" onMouseDown={(e) => e.preventDefault()}>
        <button className={`menu-toggle ${mode !== 'normal' ? 'active' : ''}`} onClick={() => setMenuOpen((o) => !o)} aria-label="Menú">
          ☰
        </button>
        {menuOpen && (
          <div className="menu-popup" onClick={() => setMenuOpen(false)}>
            {buttons}
          </div>
        )}
      </div>
    </SceneStage>
  );
}
