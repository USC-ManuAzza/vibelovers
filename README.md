# 🎮 Minijuegos USC

> Una colección de minijuegos cortos sobre la vida en la Universidade de Santiago de Compostela.

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![HTML5](https://img.shields.io/badge/HTML5-JS-orange)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)
![Minijuegos](https://img.shields.io/badge/minijuegos-3%20jugables-brightgreen)

---

## 📑 Índice

- [Concepto](#-concepto)
- [Minijuegos](#-minijuegos)
- [Cómo jugar](#-cómo-jugar)
- [Controles](#-controles)
- [Stack y arquitectura](#-stack-y-arquitectura)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Equipo](#-equipo)
- [Hoja de ruta](#-hoja-de-ruta)
- [Convenciones de trabajo](#-convenciones-de-trabajo)
- [Licencia y créditos](#-licencia-y-créditos)

---

## 💡 Concepto

**Minijuegos USC** es una colección de minijuegos cortos ambientados en la
**Universidade de Santiago de Compostela**: sus campus, sus facultades, sus
exámenes, sus pizarras y sus pequeños dramas cotidianos.

- **Formato:** minijuegos independientes de 1-3 minutos, unidos por un menú común.
- **Público:** estudiantes, personal y cualquier persona que haya pasado por la USC.
- **Objetivo:** que en menos de un minuto alguien entienda el chiste, juegue y quiera probar otro.
- **Tono:** humor universitario, cariñoso y reconocible. Nada de parodias que señalen a personas reales.

La gracia está en reconocer la situación: el examen que se convierte en jefe final,
el profesor que borra la pizarra justo cuando copias, el código que hay que clasificar
a ritmo de compás.

**Referencias:** *WarioWare* (colección de minijuegos), *Paper Mario* (combate por turnos),
*PaRappa the Rapper* (ritmo).

---

## 🕹️ Minijuegos

| # | Minijuego | Idea en una línea | Mecánica | Estado | Autor/a | Fichero |
|---|-----------|-------------------|----------|--------|---------|---------|
| 1 | **Examen Final** | Enfrentate al examen final convertido en jefe de RPG | Turnos + *timing* (Paper Mario) | Incompleto | Manuel | `ExamenFinal/examen-final.html` |
| 2 | **Pizarra Rápida** | El profesor borra la pizarra: copia la frase antes de que desaparezca | Mecanografía contrarreloj | ✅ Jugable | Manuel | `PizarraRapida/index.html` |
| 3 | **Compila!** | Clasifica elementos de código al ritmo de la música y el programa se escribe solo | Ritmo + 4 columnas (D·F·J·K) | ✅ Jugable | Manuel | `Compila/index.html` |
| 4 | <Nombre> | <Una línea> | <Mecánica> | 💡 Idea | <Nombre> | `<fichero>` |

**Leyenda:** ✅ jugable · 🚧 en progreso · 💡 idea · ❌ descartado

<p align="center">
  <img src="ExamenFinal/assets/logo.svg" alt="Examen Final — batalla de papel" width="440">
</p>

### Resumen de cada minijuego

**Examen Final** — Combate por turnos contra una hoja de examen con ojos. Tienes
vida, energía y concentración. Cada ataque pide un *timing* (bolígrafo), y cada
ataque del rival se bloquea en una ventana de tiempo. El jefe tiene tres fases y
al final te pone nota.

**Pizarra Rápida** — El profesor borra la pizarra mientras copias. Debes escribir
la frase antes de que desaparezca. Tres folios de vida, rachas con multiplicador
y nota final según los aciertos. Las tildes son opcionales.

**Compila!** — Cuatro columnas: palabra clave, símbolo, número y texto. Las fichas
caen a 100 BPM y hay que pulsarlas en su columna justo al cruzar la línea. Cada
acierto escribe un token en el editor de la derecha; cada fallo deja una marca de
error. `Esc` pausa la partida.

### Ficha de minijuego (plantilla)

> Copia este bloque por cada minijuego nuevo.

#### <Nombre del minijuego>

- **Pitch:** <una frase>
- **Ambientación USC:** <campus, facultad, tradición o situación>
- **Mecánica principal:** <el único verbo que define el juego>
- **Duración:** <30 s / 1 min / 3 min>
- **Victoria:** <qué tiene que conseguir el jugador>
- **Derrota:** <cómo se pierde>
- **Controles:** <teclado / ratón / ambos>
- **Estado:** <idea / prototipo / jugable / pulido>
- **Autor/a:** <nombre>
- **Fichero:** `<ruta>`

---

## ▶️ Cómo jugar

### Opción rápida

Abre **`index.html`** en el navegador (doble clic) y elige un minijuego desde la
pantalla de inicio. No requiere instalación ni conexión a internet.

### Servidor local (recomendado)

```bash
# con Python
python -m http.server 8000

# o con Node
npx serve .
```

Después abre <http://localhost:8000>.

### Requisitos

- Navegador moderno (Chrome, Edge, Firefox o Safari).
- Teclado; las columnas y botones también responden a clic o toque.

---

## ⌨️ Controles

**Examen Final**

| Acción | Tecla |
|--------|-------|
| Atacar / bloquear (timing) | `Espacio` o clic |
| Elegir comando | clic en el botón |
| Silenciar | botón 🔊 |

**Pizarra Rápida**

| Acción | Tecla |
|--------|-------|
| Escribir la frase | teclado |
| Soltar el folio | `Esc` |

**Compila!**

| Acción | Tecla |
|--------|-------|
| Columna palabra clave | `D` o `←` |
| Columna símbolo | `F` o `↓` |
| Columna número | `J` o `↑` |
| Columna texto | `K` o `→` |
| Pausa / continuar | `Esc` o botón ⏸ |
| Silenciar | botón 🔊 |

---

## 🛠️ Stack y arquitectura

- **Motor:** HTML5 + CSS3 + JavaScript vanilla (sin dependencias ni build).
- **Render:** DOM y CSS en Examen Final y Pizarra Rápida; `<canvas>` 2D en Compila!
  por la precisión del *timing*.
- **Audio:** WebAudio API, efectos sintetizados en el navegador (sin ficheros de audio).
- **Datos:** sin backend. Todo ocurre en el navegador.
- **Persistencia:** ninguna; cada puntuación es por partida. No se usa `localStorage`.

**Decisiones de diseño**

- Cada minijuego es **autocontenido**: su carpeta se puede abrir y jugar sola.
- Nada de *frameworks*: menos configuración, más tiempo para el contenido.
- Estética de papel/cartón en los juegos de aula y estética de editor oscuro en el de ritmo.

---

## 📂 Estructura del proyecto

```text
.
├─ index.html               # pantalla de inicio (hub de minijuegos)
├─ README.md
├─ Ideas_Juego              # lluvia de ideas del equipo
├─ assets/
│  ├─ favicon.svg           # icono del hub
│  └─ personajes/           # 10 sprites de personajes (PNG con alfa, 1024 px)
├─ ExamenFinal/
│  ├─ examen-final.html     # minijuego 1
│  ├─ styles.css
│  ├─ game.js
│  └─ assets/
│     ├─ favicon.svg
│     └─ logo.svg
├─ PizarraRapida/
│  ├─ index.html            # minijuego 2
│  ├─ styles.css
│  └─ game.js
├─ Compila/
│  ├─ index.html            # minijuego 3
│  ├─ styles.css
│  └─ game.js
├─ flappy-bird.html         # prototipo de referencia
└─ <Minijuego>/
   ├─ index.html            # minijuegos siguientes
   ├─ styles.css
   └─ game.js
```

### Añadir un minijuego al hub

En `index.html` hay una lista `JUEGOS` con una plantilla comentada. Para añadir uno:

1. Crea la carpeta del minijuego (por ejemplo `MiJuego/`) con su HTML, CSS y JS.
2. Copia el bloque de plantilla de `JUEGOS` y rellena título, descripción, género y autor.
3. Pon `estado: 'jugable'` y la ruta en `ruta: 'MiJuego/index.html'`.

Los minijuegos que aún no existen se muestran como tarjetas «En construcción»
(`estado: 'construccion'`), sin enlace.

---

## 👥 Equipo

| Nombre | Rol | Minijuegos | GitHub |
|--------|-----|-----------|--------|
| Manuel | Autor · programación y diseño | Examen Final · Pizarra Rápida · Compila! | [@USC-ManuAzza](https://github.com/USC-ManuAzza) |

**Agradecimientos:** Laura, por la idea del proyecto (una colección de minijuegos ambientados en la USC).

---

## 🗺️ Hoja de ruta

- [x] Elegir concepto: colección de minijuegos sobre la USC
- [x] Minijuego 1: Examen Final (combate por turnos)
- [x] Minijuego 2: Pizarra Rápida (mecanografía)
- [x] Minijuego 3: Compila! (ritmo)
- [x] Menú común que enlace todos los minijuegos (`index.html`)
- [x] Pausa con `Esc` en Compila!
- [x] Créditos y agradecimientos en el hub
- [ ] Minijuego 4: <nombre>
- [ ] Pausa con `Esc` en los demás minijuegos
- [ ] Integrar los sprites de `assets/personajes/` en algún minijuego
- [ ] Unificar estilos, controles y sonido
- [ ] Récords en `localStorage`
- [ ] Versión móvil pulida
- [ ] Vídeo de demo (60-90 s)

### Checklist de entrega

- [x] Los tres minijuegos se abren sin errores
- [x] Controles explicados en pantalla
- [x] Sin *assets* externos que fallen sin internet
- [x] Créditos y licencia
- [ ] Demo ensayada (2 minutos)
- [ ] Capturas en el README

---

## 🤝 Convenciones de trabajo

- **Ramas:** `main` siempre jugable. Trabajo en `feat/<minijuego>` o `fix/<tema>`.
- **Commits:** en imperativo y cortos — `Añade minijuego de la tuna`, `Corrige el timing del bloqueo`.
- **Un minijuego = una carpeta** con `index.html`, `styles.css` y `game.js`.
  Evitad tocar la carpeta de otra persona sin avisar.
- **Añadir al hub:** una entrada en `JUEGOS` dentro de `index.html`.
- **Antes de subir:** abrir el minijuego en el navegador y comprobar que no hay errores en consola.

---

## 📜 Licencia y créditos

- **Código:** MIT.
- **Arte y sonido:** propio. Todo se genera con CSS, SVG y WebAudio; no hay *assets* de terceros.
- **Sprites de personajes:** material propio del equipo, en `assets/personajes/`.
- **Marcas:** proyecto no oficial, sin relación con la Universidade de Santiago de Compostela.
- **Agradecimientos:** Laura, por la idea del proyecto.
