const SERVER_IP = 'nervalia.mc';
const API_URL = `https://api.mcstatus.io/v2/status/java/${SERVER_IP}`;
const CREATOR_USER = 'Adriyache32';
const PC_STORAGE_KEY = 'nervalia_pc_id';

function toggleMenu() {
  document.getElementById('nav-menu').classList.toggle('open');
}

document.querySelectorAll('nav a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('nav-menu').classList.remove('open');
  });
});

async function checkStatus() {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (data.online) {
      dot.className = 'status-dot online';
      text.textContent = `Online — ${data.players.online}/${data.players.max} jugadores`;
    } else {
      dot.className = 'status-dot offline';
      text.textContent = 'Offline';
    }
  } catch {
    dot.className = 'status-dot offline';
    text.textContent = 'Error al verificar';
  }
}

function copyIP() {
  navigator.clipboard.writeText(SERVER_IP).then(() => {
    const btn = document.querySelector('.copy-btn');
    const original = btn.textContent;
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  });
}

/* ───── PC FINGERPRINT ───── */
function getPCFingerprint() {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language
  ].join('||');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'PC-' + Math.abs(hash).toString(16).toUpperCase();
}

/* ───── TERMINAL TYPEWRITER ───── */
const typerTexts = [
  'echo "verificando terminal..."',
  'whoami',
  'hostnamectl',
  'systemctl status nervalia-creator',
  'scan --fingerprint',
  '[SISTEMA] Detectando hardware...',
  '[SISTEMA] Comparando huella digital...',
  'echo "CONTRASEÑA?"',
  'echo "CONTRASEÑA?"',
  'cat /etc/nervalia/creador.key',
  '[SISTEMA] Señal recibida ✔',
  '[SISTEMA] Amplificando...',
];

let typerIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typerFinished = false;

function typeEffect() {
  const el = document.getElementById('typing-line');
  if (!el) return;

  const currentText = typerTexts[typerIndex];

  if (!isDeleting) {
    el.textContent = currentText.substring(0, charIndex + 1);
    charIndex++;

    if (charIndex === currentText.length) {
      if (typerIndex === typerTexts.length - 1) {
        typerFinished = true;
        setTimeout(() => {
          const cursor = document.querySelector('.cursor');
          if (cursor) cursor.style.display = 'none';
          showLoginOrDetect();
        }, 600);
        return;
      }
      isDeleting = true;
      setTimeout(typeEffect, 800);
      return;
    }
    setTimeout(typeEffect, 25 + Math.random() * 40);
  } else {
    el.textContent = currentText.substring(0, charIndex - 1);
    charIndex--;

    if (charIndex === 0) {
      isDeleting = false;
      typerIndex++;
      setTimeout(typeEffect, 300);
      return;
    }
    setTimeout(typeEffect, 15 + Math.random() * 20);
  }
}

/* ───── PC DETECTION ───── */
function showLoginOrDetect() {
  const storedData = localStorage.getItem(PC_STORAGE_KEY);

  if (storedData) {
    try {
      const data = JSON.parse(storedData);
      const fp = getPCFingerprint();

      if (data.fingerprint === fp && data.token) {
        verifyExistingToken(data.token);
        return;
      }
    } catch {}
  }

  showTokenInput();
}

async function verifyExistingToken(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem(PC_STORAGE_KEY);
      showTokenInput();
      return;
    }

    const user = await res.json();

    if (user.login !== CREATOR_USER) {
      localStorage.removeItem(PC_STORAGE_KEY);
      showTokenInput();
      return;
    }

    showPCDetected(user.login);
  } catch {
    showTokenInput();
  }
}

function showTokenInput() {
  document.getElementById('login-input-area').classList.remove('hidden');
  document.getElementById('pc-detected').classList.add('hidden');
  setTimeout(() => {
    document.getElementById('token-input')?.focus();
  }, 100);
}

function showPCDetected(username) {
  document.getElementById('login-input-area').classList.add('hidden');
  const pcDetected = document.getElementById('pc-detected');
  pcDetected.classList.remove('hidden');
  document.getElementById('pc-info').textContent = `PC: ${getPCFingerprint()} | user: ${username}`;

  setTimeout(() => {
    showCreatorPanel(username);
  }, 2500);
}

/* ───── LOGIN ───── */
async function loginCreator() {
  const token = document.getElementById('token-input').value.trim();
  const errorEl = document.getElementById('login-error');

  if (!token) {
    errorEl.textContent = '[ERROR] Token requerido';
    return;
  }

  errorEl.textContent = '[SISTEMA] Verificando...';

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!res.ok) {
      errorEl.textContent = '[ERROR] Token inválido o expirado';
      return;
    }

    const user = await res.json();

    if (user.login !== CREATOR_USER) {
      errorEl.textContent = '[ERROR] Este token no pertenece al creador';
      return;
    }

    const fp = getPCFingerprint();
    localStorage.setItem(PC_STORAGE_KEY, JSON.stringify({
      token: token,
      fingerprint: fp,
      pairedAt: new Date().toISOString()
    }));

    showPCDetected(user.login);
  } catch {
    errorEl.textContent = '[ERROR] Error de conexión';
  }
}

function showCreatorPanel(username) {
  document.getElementById('creator-login').classList.add('hidden');
  document.getElementById('creator-panel').classList.remove('hidden');
  document.getElementById('creator-name').textContent = username || CREATOR_USER;
}

function logoutCreator() {
  localStorage.removeItem(PC_STORAGE_KEY);
  document.getElementById('creator-panel').classList.add('hidden');
  document.getElementById('creator-login').classList.remove('hidden');
  document.getElementById('login-input-area').classList.add('hidden');
  document.getElementById('pc-detected').classList.add('hidden');
  document.getElementById('token-input').value = '';
  document.getElementById('login-error').textContent = '';

  typerFinished = false;
  typerIndex = 0;
  charIndex = 0;
  isDeleting = false;

  const el = document.getElementById('typing-line');
  if (el) el.textContent = '';
  const cursor = document.querySelector('.cursor');
  if (cursor) cursor.style.display = 'inline-block';

  setTimeout(typeEffect, 500);
}

/* ───── CREATOR TABS ───── */
function showCreatorTab(tab) {
  const content = document.getElementById('creator-tab-content');

  const tabs = {
    'server-control': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Control del Server</span></div>
        <div class="status-line"><span class="label">Estado</span><span class="value" id="ctrl-status">Consultando...</span></div>
        <div class="status-line"><span class="label">IP</span><span class="value">${SERVER_IP}</span></div>
        <div class="status-line"><span class="label">Versión</span><span class="value">1.20.4 - 1.21</span></div>
        <div class="status-line"><span class="label">Jugadores</span><span class="value" id="ctrl-players">-</span></div>
        <div class="tab-actions">
          <button class="btn-term primary" onclick="alert('[SISTEMA] Comando reiniciar enviado')">[ REINICIAR ]</button>
          <button class="btn-term danger" onclick="alert('[SISTEMA] Comando detener enviado')">[ DETENER ]</button>
        </div>
      </div>`,
    'players': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Gestión de Jugadores</span></div>
        <div class="status-line"><span class="label">Online</span><span class="value" id="p-online">-</span></div>
        <div class="status-line"><span class="label">Whitelist</span><span class="value">Activada</span></div>
        <div class="status-line"><span class="label">Baneados</span><span class="value">0</span></div>
        <div class="tab-actions">
          <button class="btn-term primary" onclick="alert('[SISTEMA] Abriendo gestión de whitelist...')">[ GESTIONAR WHITELIST ]</button>
        </div>
      </div>`,
    'backups': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Backups</span></div>
        <div class="status-line"><span class="label">Último backup</span><span class="value">Hoy 03:00 AM</span></div>
        <div class="status-line"><span class="label">Tamaño</span><span class="value">2.4 GB</span></div>
        <div class="status-line"><span class="label">Totales</span><span class="value">14 backups</span></div>
        <div class="tab-actions">
          <button class="btn-term primary" onclick="alert('[SISTEMA] Creando backup...')">[ CREAR BACKUP ]</button>
          <button class="btn-term" onclick="alert('[SISTEMA] Listando backups...')">[ RESTAURAR ]</button>
        </div>
      </div>`,
    'kits-admin': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Kits de Paga</span></div>
        <div class="status-line"><span class="label">Bronce</span><span class="value">$5 USD — Activo</span></div>
        <div class="status-line"><span class="label">Plata</span><span class="value">$10 USD — Activo</span></div>
        <div class="status-line"><span class="label">Oro</span><span class="value">$20 USD — Activo</span></div>
        <div class="tab-actions">
          <button class="btn-term primary" onclick="alert('[SISTEMA] Editor de kits abierto')">[ EDITAR KITS ]</button>
        </div>
      </div>`,
    'logs': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Logs del Server</span></div>
        <div style="margin-top:0.5rem">
          <div class="status-line"><span class="label" style="color:#666">10:23</span><span class="value" style="color:#666">Jugador1 se unió</span></div>
          <div class="status-line"><span class="label" style="color:#666">10:15</span><span class="value" style="color:#666">Auto-backup completado</span></div>
          <div class="status-line"><span class="label" style="color:#666">09:50</span><span class="value" style="color:#666">Jugador2 salió</span></div>
          <div class="status-line"><span class="label" style="color:#666">09:30</span><span class="value" style="color:#666">Server iniciado</span></div>
        </div>
        <div class="tab-actions">
          <button class="btn-term" onclick="alert('[SISTEMA] Mostrando logs completos...')">[ VER TODOS ]</button>
        </div>
      </div>`,
    'settings': `
      <div class="tab-content">
        <div class="line"><span class="prompt">└─$</span> <span class="highlight">Configuración</span></div>
        <div class="status-line"><span class="label">Dificultad</span><span class="value">Hard</span></div>
        <div class="status-line"><span class="label">PVP</span><span class="value">Activado</span></div>
        <div class="status-line"><span class="label">Whitelist</span><span class="value">Activada</span></div>
        <div class="status-line"><span class="label">Bienvenida</span><span class="value">¡Bienvenido a Nervalia!</span></div>
        <div class="tab-actions">
          <button class="btn-term primary" onclick="alert('[SISTEMA] Abriendo configuración avanzada...')">[ CONFIGURACIÓN AVANZADA ]</button>
        </div>
      </div>`
  };

  content.innerHTML = tabs[tab] || '<div class="tab-placeholder"><div class="line"><span class="prompt">└─$</span> <span class="cmd">Módulo no encontrado</span></div></div>';

  if (tab === 'server-control' || tab === 'players') {
    fetch(API_URL).then(r => r.json()).then(data => {
      if (data.online) {
        const el1 = document.getElementById('ctrl-status');
        const el2 = document.getElementById('ctrl-players');
        const el3 = document.getElementById('p-online');
        if (el1) el1.textContent = 'Online';
        if (el2) el2.textContent = `${data.players.online}/${data.players.max}`;
        if (el3) el3.textContent = `${data.players.online}/${data.players.max}`;
      }
    }).catch(() => {});
  }
}

/* ───── INIT ───── */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('creator');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !typerFinished) {
        setTimeout(typeEffect, 300);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);
});

checkStatus();
setInterval(checkStatus, 60000);
