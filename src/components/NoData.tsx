import { useT } from '../engine/i18n';

/**
 * Lo que no hay todavía (un espacio de guardado vacío, algo de la galería sin desbloquear): interferencia de
 * televisión sin antena y «SIN DATOS». Llena su contenedor, que tiene que estar posicionado.
 */
export function NoData() {
  const t = useT();
  const text = t('guardar.sin_datos');
  return (
    <span className="nodata" aria-hidden>
      <span className="save-thumb-nodata" data-text={text}>
        {text}
      </span>
    </span>
  );
}
