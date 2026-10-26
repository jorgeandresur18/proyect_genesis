// Efectos de sonido de la interfaz: el texto que se escribe y la selección de una opción.
import { useStore } from './store';

const url = (file: string) => `${import.meta.env.BASE_URL}audio/sfx/${file}`;

let typing: HTMLAudioElement | null = null;

const volume = () => useStore.getState().settings.sfxVolume;

/** Empieza el sonido de escritura (en bucle). */
export function startTyping(): void {
  const { sfxVolume, typingSound } = useStore.getState().settings;
  if (!typingSound || sfxVolume <= 0) return;
  typing ??= Object.assign(new Audio(url('texto.mp3')), { loop: true, preload: 'auto' });
  typing.volume = sfxVolume * 0.6; // Más bajo que los demás efectos: suena todo el tiempo.
  typing.currentTime = 0;
  // Los navegadores bloquean el audio hasta el primer toque o clic; si pasa, simplemente no suena.
  typing.play().catch(() => {});
}

/** Detiene el sonido de escritura. */
export function stopTyping(): void {
  typing?.pause();
}

/** Sonido al elegir una opción. Cada reproducción es independiente para que no se corten entre sí. */
export function playSelect(): void {
  if (volume() <= 0) return;
  const a = new Audio(url('seleccion.mp3'));
  a.volume = volume();
  a.play().catch(() => {});
}
