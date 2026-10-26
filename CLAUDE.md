# PROYECT GENESIS — Instrucciones para Claude Code

Novela visual indie en código (React + Vite). Género: ciencia ficción psicológica, comedia negra, meta-horror. Obra para adultos (M / PEGI 18). Ambientada en una ciudad sin nombre; español neutro.

## Antes de escribir cualquier cosa

1. Lee `docs/CANON.md`. Es la fuente de verdad de la historia.
2. Al escribir diálogos o textos, lee `docs/TONO.md`.
3. Al tocar finales o rutas, lee `docs/FINALES.md`.
4. Al programar, lee `docs/SPEC.md`.

## Reglas duras

- **No contradigas el canon.** Si un dato está marcado `[PENDIENTE]`, no lo inventes: deja un comentario `TODO(canon): ...` y pregunta al autor.
- **No toques los 2 finales canon ni el juego base** sin una orden explícita. El juego base sigue en desarrollo.
- **Nada de nombres reales** en código, JSON, assets, commits ni interfaz. Usa los marcadores `CREADORA_A`, `CREADORA_B` e `INFLUENCER_C`. Única excepción: el nombre del autor en los créditos (`src/data/creditos.json`).
- **Sin contenido sexual explícito** y nunca con parecidos de personas reales. La sexualidad es sugerida.
- **La historia vive en JSON**, nunca dentro de los componentes de React.
- **Greyboxing:** sin sprites, imágenes ni audio finales hasta la fase de arte. Usa placeholders (`PLACEHOLDER:nombre`).
- **No agregues mecánicas** (inventario, minijuegos, combate) sin que el autor lo pida.
- **Commits pequeños.** Antes de cada commit corre la prueba automática de rutas (`npm run test:routes`).
- Si el autor corrige algo del canon, actualiza `docs/CANON.md` en el mismo cambio.

## Stack

React + Vite, JavaScript/TypeScript a elección del autor, estado global con Zustand o Context, persistencia en `localStorage`, GitHub para control de versiones.

## Estructura del repositorio

```
/
  CLAUDE.md
  docs/            CANON.md, TONO.md, FINALES.md, SPEC.md
  src/
    components/    DialogBox, DecisionMenu, SceneStage
    engine/        useStoryEngine, gestor de estado, guardado
    data/
      chapters/    cap01.json ... cap06.json, cap07a.json, cap07b.json
      expansions/  genesis_pp/, rikkaquest/, genesis_sharp/
      finales/     canon_1.json, canon_2.json, alt_1.json ...
  tests/           prueba automática de rutas
```

## Comandos

```
npm create vite@latest genesis-vn -- --template react
npm run dev
npm run test:routes
```

## Cuando dudes

Pregunta antes de decidir cualquier cosa de historia. Preferir una pregunta corta a una invención.
