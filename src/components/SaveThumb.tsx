import { assetUrl, isPlaceholder, screenOf } from '../engine/assets';
import { scenes } from '../engine/story';
import { CHAPTER_END } from '../engine/store';
import finCapitulo from '../data/fin_capitulo.json';

// Nombre corto de las pantallas hechas en código, para su miniatura.
const SCREEN_LABELS: Record<string, string> = {
  gravity_ide: 'GRAVITY',
  pc_correo: '✉ Correo',
  celular_mensaje: 'Boringram',
  celular_favorito: 'Boringram',
  celular_foto_nikki: 'Boringram',
  boringram_historia: 'Boringram',
  negro: '',
};

/** Miniatura de una partida guardada: el fondo y los personajes de la escena donde se guardó. */
export function SaveThumb({ sceneId, finished }: { sceneId: string; finished?: string | null }) {
  const scene = scenes.get(sceneId);
  // Guardada en el fin de capítulo: el fondo de esa pantalla.
  if (finished?.startsWith(CHAPTER_END)) {
    const bg = (finCapitulo.fondos as Record<string, string>)[finished.slice(CHAPTER_END.length)];
    return (
      <div className="save-thumb">
        {bg && <img className="save-thumb-bg save-thumb-dim" src={assetUrl(bg)} alt="" draggable={false} />}
        <span className="save-thumb-label">FIN</span>
      </div>
    );
  }
  if (!scene) return <div className="save-thumb" />;
  const bg = scene.background;
  const screen = bg ? screenOf(bg) : null;
  return (
    <div className={`save-thumb ${screen !== null ? `save-thumb-screen save-thumb-${screen}` : ''}`}>
      {bg && screen === null && !isPlaceholder(bg) && <img className="save-thumb-bg" src={assetUrl(bg)} alt="" draggable={false} />}
      {screen !== null && <span className="save-thumb-label">{SCREEN_LABELS[screen] ?? ''}</span>}
      {scene.characters
        .filter((c) => !isPlaceholder(c.sprite))
        .map((c) => (
          <img key={c.id} className={`save-thumb-sprite save-thumb-${c.pos}`} src={assetUrl(c.sprite)} alt="" draggable={false} />
        ))}
    </div>
  );
}
