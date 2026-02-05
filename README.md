# Cosquín Rock 2026 — Grilla de Horarios

Una aplicación web estática y optimizada para organizar tu agenda personalizada del **Cosquín Rock 2026** (14 y 15 de febrero).

## 🎸 Características

- **Grilla interactiva** con escenarios (eje X) y horas (eje Y) — ambas pegajosas en scroll
- **Selección de artistas** — tocá para agregar a tu agenda personal
- **Compartir agenda** — genera un enlace unique y compartilo por WhatsApp, Twitter, o cópialo al portapapeles
- **Exportar a calendario**:
  - 📅 Google Calendar (abre cada evento)
  - 📥 Archivo `.ics` para Outlook, Apple Calendar, etc.
- **Modo lectura** — revisa agendas compartidas en modo solo lectura
- **Optimizado para bajo ancho de banda** — <250 KB total, sin fuentes externas
- **Diseño responsive** — mobile-first, funciona en cualquier dispositivo

## 🚀 Levantar el Proyecto

### Requisitos previos
- Node.js 16+ instalado
- `pnpm` instalado (`npm install -g pnpm`)

### Instalación y desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/[usuario]/cosquin-rock-lineup.git
cd cosquin-rock-lineup

# Instalar dependencias
pnpm install

# Levantar el servidor de desarrollo
pnpm dev
# Abre http://localhost:4321/ en tu navegador
```

### Compilar para producción

```bash
pnpm build
# Genera el sitio estático en ./dist/
```

### Previsualizar la build

```bash
pnpm preview
```

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   ├── types.ts           # Interfaces TypeScript (eventos, horarios)
│   └── data.ts            # Parsing de datos, normalización de horarios
├── components/
│   └── TimetableApp.tsx   # React island (grilla interactiva)
├── styles/
│   └── global.css         # Tema oscuro, colores por escenario
└── pages/
    └── index.astro        # Página principal (SSR header/footer + React)

public/
├── logo.webp              # Logo del Cosquín Rock
└── [assets estáticos]

data.json                  # Base de datos de artistas y horarios
```

## 🛠️ Stack Tecnológico

- **Astro** 5.x — Static site generation, zero-JS-by-default
- **React** 19.x — UI interactiva (hydration en `client:load`)
- **TypeScript** — Type safety
- **CSS puro** — Sin frameworks, optimizado para rendimiento

## 📊 Performance

- **Tamaño total (gzipped)**:
  - HTML: ~7.8 KB
  - Astro bootstrap: ~3 KB
  - React component: ~3.4 KB
  - React runtime: ~58.5 KB
  - **Total JS enviado al cliente: ~65 KB** ✨

- No se cargan fuentes externas (system fonts only)
- Soporta navegadores sin JavaScript (header, footer, disclaimers renderizados en servidor)

## 🔧 Cómo usar la aplicación

1. **Selecciona artistas** — Toca cualquier bloque de artista para agregarlo a tu agenda
2. **Cambia de día** — Usa los botones "Día 1" y "Día 2" para ver ambos escenarios
3. **Comparte tu agenda**:
   - 🔗 **Copiar enlace** — Copia el URL de tu agenda
   - 💬 **WhatsApp** — Envía a tus amigos
   - 🐦 **Twitter** — Postea tu agenda
   - 📅 **Google Calendar** — Añade eventos a tu calendario
   - 📥 **Descargar .ics** — Importa a tu gestor de calendarios
4. **Revisa tu agenda** — Todos los artistas seleccionados aparecen abajo en orden cronológico

## 🔄 Manejo de estado

- **URL Query Params**: La agenda se guarda en `?ids=...&view=shared`
- **Persistencia**: Recarga la página y tu agenda se mantiene (vía URL)
- **Modo lectura**: Comparte un enlace con `view=shared` para que otros vean tu agenda en modo read-only

## 📝 Datos

El archivo `data.json` contiene todos los artistas, escenarios y horarios. Incluye:
- `artist` — Nombre del artista
- `day` / `dia` — Día del festival (1 o 2)
- `stage` — Escenario (Norte, Sur, Montaña, etc.)
- `startAt` — Hora de inicio (ISO 8601, UTC)
- `endAt` — Hora de fin (ISO 8601, UTC)

**Nota**: Los tiempos se convierten automáticamente a hora Argentina (UTC-3) y se normalizan para render en la grilla.

## 🌍 Accesibilidad

- Totalmente navegable por teclado
- ARIA labels en todos los controles
- Contraste de colores en modo oscuro accesible
- Soporte para lectores de pantalla

## 📜 Licencia

Este proyecto es una herramienta comunitaria **no oficial** del Cosquín Rock.

Datos y conceptos del festival: [Cosquín Rock Oficial](https://cosquinrock.net/)

## 🤝 Contribuciones

¿Encontraste un bug o tienes una idea? ¡Las PRs son bienvenidas!

```bash
# Crear una rama para tu feature
git checkout -b feature/tu-idea

# Haz tus cambios, commitea y pushea
git push origin feature/tu-idea

# Abre un Pull Request
```

## 📧 Contacto

Desarrollado con 🎸 para la comunidad del Cosquín Rock.

---

**Disclaimer**: Este no es el sitio oficial del Cosquín Rock. Visita [cosquinrock.net](https://cosquinrock.net/) para información oficial del festival.
