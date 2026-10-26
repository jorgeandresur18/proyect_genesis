// Efectos de sonido de la interfaz: el texto que se escribe y la selección de una opción.
// Usa Web Audio: los bucles son exactos (sin el corte que deja <audio loop>) y se puede repetir solo
// la parte que suena de un archivo, aunque traiga silencio al principio o al final.
import { useStore } from './store';

const url = (file: string) => `${import.meta.env.BASE_URL}audio/sfx/${file}`;
const SILENCE = 0.01; // Amplitud por debajo de la cual se considera silencio.
const TYPING_LEVEL = 0.6; // El sonido del texto, más bajo que los demás: suena todo el tiempo.

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();
const ranges = new WeakMap<AudioBuffer, { start: number; end: number }>();

function context(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function load(file: string): Promise<AudioBuffer> {
  if (!buffers.has(file)) {
    buffers.set(
      file,
      fetch(url(file))
        .then((r) => r.arrayBuffer())
        .then((b) => context().decodeAudioData(b)),
    );
  }
  return buffers.get(file)!;
}

/** Parte del archivo que suena (sin el silencio del principio y del final), en segundos. */
function audibleRange(buf: AudioBuffer): { start: number; end: number } {
  let range = ranges.get(buf);
  if (!range) {
    const loud = (i: number) => {
      for (let c = 0; c < buf.numberOfChannels; c++) if (Math.abs(buf.getChannelData(c)[i]) > SILENCE) return true;
      return false;
    };
    let first = 0;
    let last = buf.length - 1;
    while (first < last && !loud(first)) first++;
    while (last > first && !loud(last)) last--;
    range = { start: first / buf.sampleRate, end: (last + 1) / buf.sampleRate };
    ranges.set(buf, range);
  }
  return range;
}

/** Desbloquea el audio y precarga los efectos. Llamar desde un toque o clic del jugador. */
export function unlockAudio(): void {
  context();
  void load('texto.mp3').catch(() => {});
  void load('seleccion.mp3').catch(() => {});
}

let typing: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let typingRequest = 0;

function stopSource(): void {
  if (!typing || !ctx) return;
  const { source, gain } = typing;
  // Bajada de 30 ms para que no haga «clic» al cortar.
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
  source.stop(ctx.currentTime + 0.03);
  typing = null;
}

/** Empieza el sonido de escritura: repite en bucle la parte que suena hasta que se llame a stopTyping. */
export function startTyping(): void {
  const { sfxVolume, typingSound } = useStore.getState().settings;
  if (!typingSound || sfxVolume <= 0) return;
  const request = ++typingRequest;
  load('texto.mp3')
    .then((buf) => {
      if (request !== typingRequest) return; // El texto ya terminó mientras se cargaba.
      stopSource();
      const c = context();
      const { start, end } = audibleRange(buf);
      const source = c.createBufferSource();
      source.buffer = buf;
      source.loop = true;
      source.loopStart = start;
      source.loopEnd = end;
      const gain = c.createGain();
      gain.gain.value = sfxVolume * TYPING_LEVEL;
      source.connect(gain).connect(c.destination);
      source.start(0, start);
      typing = { source, gain };
    })
    .catch(() => {});
}

/** Detiene el sonido de escritura. */
export function stopTyping(): void {
  typingRequest++;
  stopSource();
}

/** Sonido al elegir una opción. */
export function playSelect(): void {
  const { sfxVolume } = useStore.getState().settings;
  if (sfxVolume <= 0) return;
  load('seleccion.mp3')
    .then((buf) => {
      const c = context();
      const source = c.createBufferSource();
      source.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = sfxVolume;
      source.connect(gain).connect(c.destination);
      source.start();
    })
    .catch(() => {});
}
