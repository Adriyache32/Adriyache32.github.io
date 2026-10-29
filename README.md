# Adriyache32.github.io 🌐

> Landing page del servidor de Minecraft **Nervalia** (comunidad hispanohablante, survival, economia, eventos).

## 🎮 Servidor Nervalia

| Info | Detalle |
|------|---------|
| **IP** | `nervalia.net` |
| **Versión** | 1.21.x |
| **Tipo** | Survival + Economía + Eventos |
| **Comunidad** | 500+ jugadores activos |
| **Discord** | [discord.gg/nervalia](https://discord.gg/nervalia) |

## 🛠️ Tech Stack

- **HTML5 / CSS3 / Vanilla JS** — Sin build step, sin frameworks
- **GitHub Pages** — Hosting gratuito, HTTPS automático
- **GitHub Actions** — Deploy automático en push a main
- **Responsive** — Mobile-first, funciona en cualquier dispositivo
- **PWA Ready** — Manifest + Service Worker (opcional)

## 🚀 Deploy

Automático via `.github/workflows/deploy.yml`:
```yaml
# Push a main → GitHub Actions → GitHub Pages
# URL: https://adriyache32.github.io
```

## 📁 Estructura

```
Adriyache32.github.io/
├── index.html           # Landing principal
├── assets/
│   ├── images/          # Capturas, logo, favicon
│   ├── styles.css       # Estilos principales
│   └── script.js        # Interactividad ligera
├── .github/workflows/
│   └── deploy.yml       # GitHub Pages deploy
└── README.md
```

## 🎨 Personalización

```css
/* assets/styles.css - Variables de tema */
:root {
  --mc-green: #5fe39a;
  --mc-dark: #0f0e17;
  --mc-panel: #17151f;
  --mc-accent: #c8f55a;
}
```

## 🤝 Contribuir

1. Fork → Rama `feature/mejora`
2. Edita `index.html` / `assets/`
3. Test local: `python3 -m http.server 8000`
4. PR → Auto-deploy en merge

## 📄 Licencia

MIT — Libre uso para comunidades Minecraft.

---

**¿Juegas en Nervalia? ¡Visítanos! 🎮** → `nervalia.net`
