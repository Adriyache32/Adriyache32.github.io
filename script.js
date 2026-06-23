const SERVER_IP = 'nervalia.mc';
const API_URL = `https://api.mcstatus.io/v2/status/java/${SERVER_IP}`;
const CREATOR_USER = 'Adriyache32';

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

async function loginCreator() {
  const token = document.getElementById('token-input').value.trim();
  const errorEl = document.getElementById('login-error');

  if (!token) {
    errorEl.textContent = 'Ingresa tu token de GitHub';
    return;
  }

  errorEl.textContent = 'Verificando...';

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` }
    });

    if (!res.ok) {
      errorEl.textContent = 'Token inválido o expirado';
      return;
    }

    const user = await res.json();

    if (user.login !== CREATOR_USER) {
      errorEl.textContent = 'Este token no pertenece al creador';
      return;
    }

    sessionStorage.setItem('creator_token', token);
    sessionStorage.setItem('creator_user', user.login);
    showCreatorPanel(user);
  } catch {
    errorEl.textContent = 'Error de conexión';
  }
}

function showCreatorPanel(user) {
  document.getElementById('creator-login').classList.add('hidden');
  document.getElementById('creator-panel').classList.remove('hidden');
  document.getElementById('creator-name').textContent = user.login || CREATOR_USER;
}

function logoutCreator() {
  sessionStorage.removeItem('creator_token');
  sessionStorage.removeItem('creator_user');
  document.getElementById('creator-panel').classList.add('hidden');
  document.getElementById('creator-login').classList.remove('hidden');
  document.getElementById('token-input').value = '';
  document.getElementById('login-error').textContent = '';
}

function showCreatorTab(tab) {
  const content = document.getElementById('creator-tab-content');
  const token = sessionStorage.getItem('creator_token');

  const tabs = {
    'server-control': `
      <div class="tab-content">
        <h4>🖥️ Control del Server</h4>
        <div class="status-item"><span class="label">Estado</span><span class="value" id="ctrl-status">Cargando...</span></div>
        <div class="status-item"><span class="label">IP</span><span class="value">${SERVER_IP}</span></div>
        <div class="status-item"><span class="label">Versión</span><span class="value">1.20.4 - 1.21</span></div>
        <div class="status-item"><span class="label">Jugadores</span><span class="value" id="ctrl-players">-</span></div>
        <div style="margin-top: 1.5rem; display:flex; gap:1rem">
          <button class="btn btn-discord" onclick="alert('Comando enviado al server')">Reiniciar</button>
          <button class="btn btn-kit" onclick="alert('Comando enviado al server')">Detener</button>
        </div>
      </div>`,
    'players': `
      <div class="tab-content">
        <h4>👥 Gestión de Jugadores</h4>
        <p>Lista de jugadores con whitelist y estado actual.</p>
        <div class="status-item"><span class="label">Jugadores online</span><span class="value" id="p-online">-</span></div>
        <div class="status-item"><span class="label">Whitelist</span><span class="value">Activada</span></div>
        <div class="status-item"><span class="label">Baneados</span><span class="value">0</span></div>
        <div style="margin-top: 1.5rem">
          <button class="btn btn-discord" onclick="alert('Panel de whitelist - abre consola')">Gestionar Whitelist</button>
        </div>
      </div>`,
    'backups': `
      <div class="tab-content">
        <h4>💾 Backups</h4>
        <p>Gestiona las copias de seguridad del mundo.</p>
        <div class="status-item"><span class="label">Último backup</span><span class="value">Hoy 03:00 AM</span></div>
        <div class="status-item"><span class="label">Tamaño</span><span class="value">2.4 GB</span></div>
        <div class="status-item"><span class="label">Backups totales</span><span class="value">14</span></div>
        <div style="margin-top: 1.5rem; display:flex; gap:1rem">
          <button class="btn btn-discord" onclick="alert('Creando backup...')">Crear Backup</button>
          <button class="btn btn-kit" onclick="alert('Mostrando lista de backups...')">Restaurar</button>
        </div>
      </div>`,
    'kits-admin': `
      <div class="tab-content">
        <h4>📦 Administrar Kits</h4>
        <p>Configura los kits de paga del servidor.</p>
        <div class="status-item"><span class="label">Bronce</span><span class="value">$5 USD — Activo</span></div>
        <div class="status-item"><span class="label">Plata</span><span class="value">$10 USD — Activo</span></div>
        <div class="status-item"><span class="label">Oro</span><span class="value">$20 USD — Activo</span></div>
        <div style="margin-top: 1.5rem">
          <button class="btn btn-discord" onclick="alert('Editor de kits abierto')">Editar Kits</button>
        </div>
      </div>`,
    'logs': `
      <div class="tab-content">
        <h4>📋 Logs del Server</h4>
        <p>Actividad reciente del servidor.</p>
        <div class="status-item"><span class="label">10:23</span><span class="value" style="color:#888">Jugador1 se unió</span></div>
        <div class="status-item"><span class="label">10:15</span><span class="value" style="color:#888">Auto-backup completado</span></div>
        <div class="status-item"><span class="label">09:50</span><span class="value" style="color:#888">Jugador2 salió</span></div>
        <div class="status-item"><span class="label">09:30</span><span class="value" style="color:#888">Server iniciado</span></div>
        <div style="margin-top: 1.5rem">
          <button class="btn btn-kit" onclick="alert('Logs completos en consola')">Ver todos</button>
        </div>
      </div>`,
    'settings': `
      <div class="tab-content">
        <h4>⚙️ Configuración</h4>
        <p>Ajustes generales del servidor.</p>
        <div class="status-item"><span class="label">Dificultad</span><span class="value">Hard</span></div>
        <div class="status-item"><span class="label">PVP</span><span class="value">Activado</span></div>
        <div class="status-item"><span class="label">Whitelist</span><span class="value">Activada</span></div>
        <div class="status-item"><span class="label">Mensaje de bienvenida</span><span class="value">¡Bienvenido a Nervalia!</span></div>
        <div style="margin-top: 1.5rem">
          <button class="btn btn-discord" onclick="alert('Abrir configuración avanzada...')">Configuración Avanzada</button>
        </div>
      </div>`
  };

  content.innerHTML = tabs[tab] || '<div class="tab-placeholder"><p>Sección no encontrada</p></div>';

  if (tab === 'server-control' || tab === 'players') {
    fetch(API_URL).then(r => r.json()).then(data => {
      if (data.online) {
        const ctrlStatus = document.getElementById('ctrl-status');
        const ctrlPlayers = document.getElementById('ctrl-players');
        const pOnline = document.getElementById('p-online');
        if (ctrlStatus) ctrlStatus.textContent = 'Online';
        if (ctrlPlayers) ctrlPlayers.textContent = `${data.players.online}/${data.players.max}`;
        if (pOnline) pOnline.textContent = `${data.players.online}/${data.players.max}`;
      }
    }).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = sessionStorage.getItem('creator_token');
  if (savedToken) {
    fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${savedToken}` }
    }).then(r => r.json()).then(user => {
      if (user.login === CREATOR_USER) {
        showCreatorPanel(user);
      }
    }).catch(() => {});
  }
});

checkStatus();
setInterval(checkStatus, 60000);
