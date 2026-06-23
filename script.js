const SERVER_IP = 'nervalia.mc';
const API_URL = `https://api.mcstatus.io/v2/status/java/${SERVER_IP}`;
const PC_STORAGE_KEY = 'nervalia_pc_id';
const COINS_KEY = 'nervalia_coins';
const LOGROS_KEY = 'nervalia_logros';
const INVENTORY_KEY = 'nervalia_inventory';
const SERVER_DATA_KEY = 'nervalia_server_data';
const CREATOR_PASS = '202530';
const CREATOR_LOG_KEY = 'nervalia_creator_log';
const ACCOUNTS_KEY = 'nervalia_accounts';

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

/* ───── FINGERPRINT ───── */
function getPCFingerprint() {
  const raw = [
    navigator.userAgent, screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language
  ].join('||');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'PC-' + Math.abs(hash).toString(16).toUpperCase();
}

/* ───── LED ───── */
function setLED(state) {
  const groups = [
    ['led-idle', 'led-proc', 'led-ready'],
    ['led-idle2', 'led-proc2', 'led-ready2'],
  ];
  const map = { idle: 0, proc: 1, ready: 2 };
  groups.forEach(ids => {
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('led-active', i === map[state]);
    });
  });
}

/* ───── TYPEWRITER ───── */
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

let typerIndex = 0, charIndex = 0, isDeleting = false, typerFinished = false;

function typeEffect() {
  const el = document.getElementById('typing-line');
  if (!el) return;
  setLED('proc');
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
          setLED('idle');
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

/* ───── AUTH ───── */
function showLoginOrDetect() {
  const stored = localStorage.getItem(PC_STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.fingerprint === getPCFingerprint() && data.authenticated) {
        showPCDetected('Admin');
        return;
      }
    } catch {}
  }
  showTokenInput();
}

function showTokenInput() {
  setLED('idle');
  document.getElementById('login-input-area').classList.remove('hidden');
  document.getElementById('pc-detected').classList.add('hidden');
  setTimeout(() => document.getElementById('token-input')?.focus(), 100);
}

function showPCDetected(username) {
  logCreatorAccess(username);
  setLED('ready');
  document.getElementById('login-input-area').classList.add('hidden');
  document.getElementById('pc-detected').classList.remove('hidden');
  document.getElementById('pc-info').textContent = `PC: ${getPCFingerprint()} | equipo: chanchos MC studios`;
  document.getElementById('pc-username').textContent = username;
  setTimeout(() => showCreatorPanel(username), 2500);
}

async function loginCreator() {
  const pass = document.getElementById('token-input').value.trim();
  const errorEl = document.getElementById('login-error');
  if (!pass) { errorEl.textContent = '[ERROR] Ingresá la contraseña'; return; }
  errorEl.textContent = '[SISTEMA] Verificando...';
  setLED('proc');

  await new Promise(r => setTimeout(r, 800));

  if (pass !== CREATOR_PASS) {
    errorEl.textContent = '[ERROR] Contraseña incorrecta';
    setLED('idle');
    return;
  }

  localStorage.setItem(PC_STORAGE_KEY, JSON.stringify({
    authenticated: true,
    fingerprint: getPCFingerprint(),
    pairedAt: new Date().toISOString()
  }));

  showPCDetected('Miembro del equipo');
}

function showCreatorPanel(username) {
  setLED('ready');
  document.getElementById('creator-login').classList.add('hidden');
  document.getElementById('creator-panel').classList.remove('hidden');
  document.getElementById('creator-name').textContent = username || 'Admin';
}

function logoutCreator() {
  localStorage.removeItem(PC_STORAGE_KEY);
  document.getElementById('creator-panel').classList.add('hidden');
  document.getElementById('creator-login').classList.remove('hidden');
  document.getElementById('login-input-area').classList.add('hidden');
  document.getElementById('pc-detected').classList.add('hidden');
  document.getElementById('token-input').value = '';
  document.getElementById('login-error').textContent = '';
  setLED('idle');
  typerFinished = false; typerIndex = 0; charIndex = 0; isDeleting = false;
  const el = document.getElementById('typing-line');
  if (el) el.textContent = '';
  const cursor = document.querySelector('.cursor');
  if (cursor) cursor.style.display = 'inline-block';
  setTimeout(typeEffect, 500);
}

/* ───── CREATOR ACCESS LOG ───── */
function logCreatorAccess(username) {
  const log = JSON.parse(localStorage.getItem(CREATOR_LOG_KEY)) || [];
  log.push({
    timestamp: new Date().toISOString(),
    fingerprint: getPCFingerprint(),
    username: username || 'Desconocido'
  });
  localStorage.setItem(CREATOR_LOG_KEY, JSON.stringify(log));
}

/* ───── ACCOUNTS & VERIFICATION ───── */
function getAccounts() {
  return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function registerAccount() {
  const email = document.getElementById('reg-email').value.trim();
  const mcUser = document.getElementById('reg-mcuser').value.trim();
  const errorEl = document.getElementById('reg-error');

  if (!email || !mcUser) {
    errorEl.textContent = '[ERROR] Completá todos los campos';
    return;
  }
  if (!email.includes('@')) {
    errorEl.textContent = '[ERROR] Ingresá un email válido';
    return;
  }

  const accounts = getAccounts();
  const fp = getPCFingerprint();
  const existing = accounts.find(a => a.fingerprint === fp);
  if (existing) {
    if (existing.status === 'verified') {
      errorEl.textContent = '[SISTEMA] Ya tenés cuenta verificada en esta PC';
    } else if (existing.status === 'pending') {
      errorEl.textContent = '[SISTEMA] Ya solicitaste verificación. Esperá al equipo.';
    } else {
      errorEl.textContent = '[SISTEMA] Tu cuenta fue rechazada. Contactá al equipo.';
    }
    return;
  }

  accounts.push({
    email,
    minecraftUser: mcUser,
    fingerprint: fp,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  saveAccounts(accounts);
  errorEl.textContent = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-mcuser').value = '';
  showAccountStatus();
  document.getElementById('reg-success').classList.remove('hidden');
  setTimeout(() => document.getElementById('reg-success').classList.add('hidden'), 4000);
}

function showAccountStatus() {
  const container = document.getElementById('account-status');
  if (!container) return;
  const fp = getPCFingerprint();
  const accounts = getAccounts();
  const mine = accounts.find(a => a.fingerprint === fp);

  if (!mine) {
    container.innerHTML = '<div class="line" style="color:#666">No vinculaste tu cuenta todavía.</div>';
    return;
  }

  const statusMap = {
    pending: '<span style="color:#f0c040">⏳ Pendiente</span>',
    verified: '<span style="color:#43b581">✅ Verificada</span>',
    rejected: '<span style="color:#ed4245">❌ Rechazada</span>'
  };

  container.innerHTML = `
    <div class="line"><span class="prompt">└─$</span> <span class="cmd">Email: ${mine.email}</span></div>
    <div class="line"><span class="prompt">└─$</span> <span class="cmd">MC Usuario: ${mine.minecraftUser}</span></div>
    <div class="line"><span class="prompt">└─$</span> <span class="cmd">Estado: ${statusMap[mine.status] || 'Desconocido'}</span></div>
  `;
}

function verifyAccount(fingerprint, action) {
  const accounts = getAccounts();
  const acc = accounts.find(a => a.fingerprint === fingerprint);
  if (!acc) return;
  acc.status = action === 'approve' ? 'verified' : 'rejected';
  saveAccounts(accounts);
  showCreatorTab('verificaciones');
}

/* ───── COINS & LOGROS ───── */
function getCoins() {
  return parseFloat(localStorage.getItem(COINS_KEY)) || 0;
}

function setCoins(n) {
  localStorage.setItem(COINS_KEY, Math.max(0, n));
  updateWallet();
}

function updateWallet() {
  const el = document.getElementById('coin-balance');
  if (el) el.textContent = getCoins().toFixed(1);
}

function claimLogro(el) {
  if (el.classList.contains('completado')) return;
  el.classList.add('completado');
  el.querySelector('.logro-badge').textContent = '✅';
  const coins = getCoins() + 0.5;
  setCoins(coins);
  saveLogroState();
}

function saveLogroState() {
  const state = {};
  document.querySelectorAll('.logro').forEach(el => {
    state[el.dataset.id] = el.classList.contains('completado');
  });
  localStorage.setItem(LOGROS_KEY, JSON.stringify(state));
}

function restoreLogros() {
  const saved = localStorage.getItem(LOGROS_KEY);
  if (!saved) return;
  try {
    const state = JSON.parse(saved);
    document.querySelectorAll('.logro').forEach(el => {
      if (state[el.dataset.id]) {
        el.classList.add('completado');
        el.querySelector('.logro-badge').textContent = '✅';
      }
    });
  } catch {}
}

/* ───── PAYWALL ───── */
let paywallKit = null;
let paywallPrice = 0;

function openPaywall(name, price) {
  paywallKit = name;
  paywallPrice = price;
  document.getElementById('modal-kit-name').textContent = `Kit ${name}`;
  document.getElementById('modal-kit-price').textContent = `${price} 🪙`;
  document.getElementById('modal-balance').textContent = `${getCoins().toFixed(1)} 🪙`;
  document.getElementById('modal-error').classList.add('hidden');
  document.getElementById('paywall-modal').classList.remove('hidden');
}

function closePaywall() {
  document.getElementById('paywall-modal').classList.add('hidden');
}

function confirmPaywall() {
  const balance = getCoins();
  if (balance < paywallPrice) {
    document.getElementById('modal-error').classList.remove('hidden');
    return;
  }

  const accounts = getAccounts();
  const fp = getPCFingerprint();
  const mine = accounts.find(a => a.fingerprint === fp);
  if (!mine || mine.status !== 'verified') {
    alert('❌ Necesitás vincular y verificar tu cuenta Google para canjear. Andá a la sección "Cuenta".');
    return;
  }

  setCoins(balance - paywallPrice);
  let inv = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
  inv.push({ kit: paywallKit, date: new Date().toISOString() });
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  closePaywall();
  alert(`✅ Kit ${paywallKit} canjeado con éxito!`);
}

/* ───── CREATOR TABS ───── */
function showCreatorTab(tab) {
  const content = document.getElementById('creator-tab-content');
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};

  switch (tab) {
    case 'server':
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Info del Server</span></div>
          <div class="editor-field"><span class="label">Título</span><input class="editor-input" id="e-title" value="${sd.title || 'El Server'}"></div>
          <div class="editor-field"><span class="label">Versión</span><input class="editor-input" id="e-version" value="${sd.version || '1.20.4 - 1.21'}"></div>
          <div class="editor-field"><span class="label">Modo</span><input class="editor-input" id="e-mode" value="${sd.mode || 'Survival / Hard'}"></div>
          <div class="editor-field"><span class="label">Slot</span><input class="editor-input" id="e-slot" value="${sd.slot || '20 jugadores'}"></div>
          <div class="editor-field"><span class="label">Plugins</span><input class="editor-input" id="e-plugins" value="${sd.plugins || 'VoiceChat, CoreProtect, WorldEdit'}"></div>
          <div class="editor-field"><span class="label">Discord</span><input class="editor-input" id="e-discord" value="${sd.discord || 'https://discord.gg/nervalia'}"></div>
          <div class="editor-field"><span class="label">Icono URL</span><input class="editor-input" id="e-icon" value="${sd.icon || 'https://api.mcstatus.io/v2/icon/nervalia.mc'}"></div>
          <div class="editor-field" style="align-items:flex-start;padding-top:0.5rem">
            <span class="label">Descripción 1</span>
            <textarea class="editor-textarea" id="e-desc1">${sd.desc1 || 'Server survival privado para amigos y conocidos.'}</textarea>
          </div>
          <div class="editor-field" style="align-items:flex-start;padding-top:0.5rem">
            <span class="label">Descripción 2</span>
            <textarea class="editor-textarea" id="e-desc2">${sd.desc2 || 'Contamos con voice chat de proximidad y mapa dinámico.'}</textarea>
          </div>
          <div class="editor-actions">
            <button class="btn-editor save" onclick="saveServerData()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;

    case 'team': {
      const members = sd.team || [
        { name: 'Eliezer', role: 'Creador', color: '#f0c040' },
        { name: 'Manchitas', role: 'Creador', color: '#f0c040' },
        { name: 'Adriyache32', role: 'Moderador', color: '#4ecdc4' },
        { name: 'Mellado', role: 'Moderador', color: '#4ecdc4' },
      ];
      let teamHtml = members.map((m, i) => `
        <div class="editor-field">
          <span class="label">#${i+1}</span>
          <input class="editor-input" id="tm-name-${i}" value="${m.name}" placeholder="Nombre" style="flex:0.5">
          <input class="editor-input" id="tm-role-${i}" value="${m.role}" placeholder="Rol" style="flex:0.3">
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Gestionar Equipo</span></div>
          ${teamHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addTeamMember()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveTeam()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'kits': {
      const kdata = sd.kits || [
        { name: 'Bronce', price: 5, perks: ['Kit inicial especial', 'Tag coloreado en el chat', 'Acceso a /fly en spawn'] },
        { name: 'Plata', price: 10, perks: ['Todo lo de Bronce', 'Set de herramientas encantadas', 'Home adicional (3 total)', 'Acceso a /enderchest'] },
        { name: 'Oro', price: 20, perks: ['Todo lo de Plata', 'Set de armadura de diamante', '5 Homes adicionales', 'Acceso a /nick', 'Rol exclusivo en Discord'] },
      ];
      let kHtml = kdata.map((k, i) => `
        <div style="border:1px solid rgba(255,255,255,0.05);padding:0.75rem;border-radius:6px;margin-bottom:0.5rem">
          <div class="editor-field"><span class="label">Kit ${i+1}</span>
            <input class="editor-input" id="k-name-${i}" value="${k.name}" placeholder="Nombre" style="flex:0.4">
            <input class="editor-input" id="k-price-${i}" value="${k.price}" placeholder="Precio" style="flex:0.15;font-family:monospace">
          </div>
          <textarea class="editor-textarea" id="k-perks-${i}" style="min-height:50px">${k.perks.join('\n')}</textarea>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Kits</span></div>
          ${kHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addKit()">[ + AGREGAR KIT ]</button>
            <button class="btn-editor save" onclick="saveKits()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'logros': {
      const ldata = sd.logros || [
        { name: 'Minero Inicial', desc: 'Consigue 10 bloques de piedra', icon: '⛏️' },
        { name: 'Leñador Novato', desc: 'Corta 10 árboles', icon: '🌳' },
        { name: 'Primera Base', desc: 'Construye tu primera casa', icon: '🏠' },
        { name: 'Granjero', desc: 'Planta y cosecha 20 cultivos', icon: '🌾' },
        { name: 'Cazador de Dragones', desc: 'Derrota al Ender Dragon', icon: '🐉' },
        { name: 'Explorador del Nether', desc: 'Visita el Nether', icon: '⚔️' },
      ];
      let lHtml = ldata.map((l, i) => `
        <div style="border:1px solid rgba(255,255,255,0.05);padding:0.5rem;border-radius:6px;margin-bottom:0.4rem">
          <div class="editor-field">
            <span class="label">#${i+1}</span>
            <input class="editor-input" id="l-name-${i}" value="${l.name}" style="flex:0.4">
            <input class="editor-input" id="l-desc-${i}" value="${l.desc}" style="flex:0.5">
            <input class="editor-input" id="l-icon-${i}" value="${l.icon}" style="flex:0.1;text-align:center">
          </div>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Logros</span></div>
          ${lHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addLogro()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveLogros()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'reglas': {
      const rdata = sd.reglas || [
        'No Griefing — No destruir construcciones ajenas',
        'No Hacks — Prohibidos clientes modificados',
        'Respeto — Trata a todos con respeto',
        'No Robar — No tomar items ajenos sin permiso',
        'Duplicación — Prohibido duplicar items',
        'Voice Chat — Uso obligatorio de proximidad',
      ];
      let rHtml = rdata.map((r, i) => `
        <div class="editor-field">
          <span class="label">#${i+1}</span>
          <textarea class="editor-textarea" id="r-text-${i}" style="min-height:40px">${r}</textarea>
          <button class="btn-editor danger" onclick="removeRegla(${i})" style="flex:0;padding:0.3rem 0.5rem">✕</button>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Reglas</span></div>
          ${rHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addRegla()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveReglas()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'galeria': {
      const gdata = sd.galeria || [
        { label: 'Base principal', icon: '🏗️' },
        { label: 'Atardecer en spawn', icon: '🌄' },
        { label: 'Castillo medieval', icon: '🏰' },
        { label: 'Base acuática', icon: '🌊' },
        { label: 'Portal del Nether', icon: '🔥' },
        { label: 'End base', icon: '🌌' },
      ];
      let gHtml = gdata.map((g, i) => `
        <div class="editor-field">
          <span class="label">#${i+1}</span>
          <input class="editor-input" id="g-icon-${i}" value="${g.icon}" style="flex:0.1;text-align:center">
          <input class="editor-input" id="g-label-${i}" value="${g.label}" style="flex:0.7">
          <button class="btn-editor danger" onclick="removeGaleria(${i})" style="flex:0;padding:0.3rem 0.5rem">✕</button>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Galería</span></div>
          ${gHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addGaleria()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveGaleria()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'coins': {
      const inv = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || [];
      const invHtml = inv.map(i => `
        <div class="status-line"><span class="label">${i.date.split('T')[0]}</span><span class="value">Kit ${i.kit}</span></div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">🪙 Monedas del Server</span></div>
          <div class="editor-field"><span class="label">Saldo actual</span><span class="value" style="color:#f0c040;font-weight:700">${getCoins().toFixed(1)} 🪙</span></div>
          <div class="editor-field" style="border:none;margin-top:0.5rem">
            <span class="label">Dar monedas</span>
            <input class="editor-input" id="e-coin-amount" type="number" value="10" step="0.5" style="flex:0.2;font-family:monospace">
            <button class="btn-editor save" onclick="giveCoins()">[ DAR ]</button>
          </div>
          <div class="line" style="margin-top:1rem"><span class="prompt">└─$</span> <span class="highlight">Inventario canjeado</span></div>
          ${invHtml || '<div class="line" style="color:#444">No hay canjes registrados</div>'}
        </div>`;
      break;
    }
    case 'mods': {
      const mdata = sd.mods || {
        mods: [
          { name: 'Sodium', desc: 'Optimización de rendimiento', version: '1.20.4', url: '#' },
          { name: 'JourneyMap', desc: 'Mapa minimapa y del mundo', version: '1.20.4', url: '#' },
          { name: 'SimpleVoiceChat', desc: 'Voice chat de proximidad', version: '1.20.4', url: '#' },
          { name: 'Litematica', desc: 'Esquemas de construcción', version: '1.20.4', url: '#' },
        ],
        modpacks: [
          { name: 'Nervalia Pack', desc: 'Modpack oficial del server', version: 'v1.0', url: '#' },
          { name: 'Fabulously Optimized', desc: 'Modpack de optimización', version: 'v5.0', url: '#' },
        ],
        shaders: [
          { name: 'Complementary Shaders', desc: 'Shaders vibrantes y ligeros', version: 'v4.7', url: '#' },
          { name: 'BSL Shaders', desc: 'Shaders realistas', version: 'v8.2', url: '#' },
        ],
        textures: [
          { name: 'Faithful x64', desc: 'Texturas fieles en 64x', version: '1.20.4', url: '#' },
          { name: 'Bare Bones', desc: 'Texturas minimalistas', version: '1.20.4', url: '#' },
        ],
      };
      const categories = ['mods', 'modpacks', 'shaders', 'textures'];
      const catNames = { mods: 'Mods', modpacks: 'Modpacks', shaders: 'Shaders', textures: 'Texture Packs' };
      let modHtml = categories.map(cat => `
        <div style="border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem">
          <div class="editor-field" style="border:none"><span class="label" style="color:#7289da;font-weight:600;text-transform:uppercase;font-size:0.7rem">${catNames[cat]}</span>
            <button class="btn-editor" onclick="addModEntry('${cat}')" style="font-size:0.65rem">[ + ]</button>
          </div>
          ${(mdata[cat] || []).map((item, i) => `
            <div class="editor-field" style="padding:0.3rem 0">
              <input class="editor-input" id="m-${cat}-name-${i}" value="${item.name}" placeholder="Nombre" style="flex:0.2;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-desc-${i}" value="${item.desc}" placeholder="Desc" style="flex:0.3;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-url-${i}" value="${item.url || '#'}" placeholder="CurseForge URL" style="flex:0.3;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-ver-${i}" value="${item.version}" placeholder="Versión" style="flex:0.1;font-size:0.7rem">
              <button class="btn-editor danger" onclick="removeModEntry('${cat}', ${i})" style="flex:0;padding:0.2rem 0.4rem;font-size:0.65rem">✕</button>
            </div>
          `).join('')}
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Mods & Recursos</span></div>
          ${modHtml}
          <div class="editor-actions">
            <button class="btn-editor save" onclick="saveMods()">[ GUARDAR TODO ]</button>
            <span id="e-msg" class="editor-success"></span>
          </div>
        </div>`;
      break;
    }

    case 'registro': {
      const log = JSON.parse(localStorage.getItem(CREATOR_LOG_KEY)) || [];
      const logHtml = log.length === 0
        ? '<div class="line" style="color:#444">Sin registros aún</div>'
        : log.reverse().map(entry => `
          <div class="status-line">
            <span class="label" style="font-size:0.65rem;min-width:auto">${new Date(entry.timestamp).toLocaleString()}</span>
            <span class="value" style="font-size:0.65rem">${entry.fingerprint}</span>
            <span class="value" style="font-size:0.65rem;color:#7289da">${entry.username}</span>
          </div>
        `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Registro de Accesos</span></div>
          <div class="line" style="color:#666;font-size:0.7rem;margin-bottom:0.5rem">Últimos accesos al Modo Creador</div>
          ${logHtml}
        </div>`;
      break;
    }

    case 'verificaciones': {
      const accounts = getAccounts();
      const pending = accounts.filter(a => a.status === 'pending');
      const allOthers = accounts.filter(a => a.status !== 'pending');
      let html = '';
      if (pending.length === 0) {
        html += '<div class="line" style="color:#666">No hay solicitudes pendientes.</div>';
      } else {
        html += '<div class="line" style="color:#f0c040;font-size:0.75rem;margin-bottom:0.5rem">⏳ Pendientes</div>';
        html += pending.map(a => `
          <div style="border:1px solid rgba(255,255,255,0.05);border-radius:6px;padding:0.5rem;margin-bottom:0.4rem;display:flex;align-items:center;gap:0.5rem">
            <div style="flex:1;font-size:0.75rem">
              <div style="color:#c0c0d0">${a.minecraftUser}</div>
              <div style="color:#666;font-size:0.65rem">${a.email}</div>
              <div style="color:#444;font-size:0.6rem">${new Date(a.timestamp).toLocaleString()}</div>
            </div>
            <button class="btn-editor save" onclick="verifyAccount('${a.fingerprint}','approve')" style="font-size:0.65rem;padding:0.2rem 0.5rem">✓</button>
            <button class="btn-editor danger" onclick="verifyAccount('${a.fingerprint}','reject')" style="font-size:0.65rem;padding:0.2rem 0.5rem">✕</button>
          </div>
        `).join('');
      }
      if (allOthers.length > 0) {
        html += '<div class="line" style="color:#666;font-size:0.75rem;margin:1rem 0 0.5rem">Historial</div>';
        html += allOthers.map(a => `
          <div style="border:1px solid rgba(255,255,255,0.03);border-radius:4px;padding:0.4rem 0.5rem;margin-bottom:0.3rem;display:flex;align-items:center;gap:0.5rem;font-size:0.7rem">
            <span style="flex:1;color:#888">${a.minecraftUser}</span>
            <span style="color:#666;font-size:0.6rem">${a.email}</span>
            <span style="color:${a.status === 'verified' ? '#43b581' : '#ed4245'}">${a.status === 'verified' ? '✓' : '✕'}</span>
          </div>
        `).join('');
      }
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Verificaciones de Cuentas</span></div>
          ${html}
        </div>`;
      break;
    }
  }
}

/* ───── SAVE HELPERS ───── */
function getSD() { return JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {}; }

function saveServerData() {
  const sd = getSD();
  sd.title = document.getElementById('e-title')?.value;
  sd.version = document.getElementById('e-version')?.value;
  sd.mode = document.getElementById('e-mode')?.value;
  sd.slot = document.getElementById('e-slot')?.value;
  sd.plugins = document.getElementById('e-plugins')?.value;
  sd.discord = document.getElementById('e-discord')?.value;
  sd.icon = document.getElementById('e-icon')?.value;
  sd.desc1 = document.getElementById('e-desc1')?.value;
  sd.desc2 = document.getElementById('e-desc2')?.value;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyServerData();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyServerData() {
  const sd = getSD();
  const title = document.getElementById('s-title');
  if (title && sd.title) title.textContent = sd.title;

  const specs = document.getElementById('server-specs');
  if (specs && sd.version) {
    const vals = specs.querySelectorAll('.spec-value');
    if (vals[0]) vals[0].textContent = sd.version || '1.20.4 - 1.21';
    if (vals[1]) vals[1].textContent = sd.mode || 'Survival / Hard';
    if (vals[2]) vals[2].textContent = sd.slot || '20 jugadores';
    if (vals[4]) vals[4].textContent = sd.plugins || 'VoiceChat, CoreProtect, WorldEdit';
  }
  const heroImg = document.querySelector('.server-icon img');
  if (heroImg && sd.icon) heroImg.src = sd.icon;

  const d1 = document.getElementById('s-desc1');
  const d2 = document.getElementById('s-desc2');
  if (d1 && sd.desc1) d1.textContent = sd.desc1;
  if (d2 && sd.desc2) d2.textContent = sd.desc2;

  const discordLink = document.querySelector('.contacto-card[href*="discord"]');
  if (discordLink && sd.discord) discordLink.href = sd.discord;
  const heroDiscord = document.querySelector('.hero-buttons .btn-discord');
  if (heroDiscord && sd.discord) heroDiscord.href = sd.discord;
}

function giveCoins() {
  const amount = parseFloat(document.getElementById('e-coin-amount')?.value);
  if (!amount || amount <= 0) return;
  setCoins(getCoins() + amount);
  showCreatorTab('coins');
}

function addTeamMember() {
  const sd = getSD();
  const team = sd.team || [];
  team.push({ name: 'Nuevo', role: 'Miembro', color: '#7289da' });
  sd.team = team;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('team');
}

function saveTeam() {
  const sd = getSD();
  const team = sd.team || [];
  team.forEach((_, i) => {
    const n = document.getElementById(`tm-name-${i}`);
    const r = document.getElementById(`tm-role-${i}`);
    if (n) team[i].name = n.value;
    if (r) team[i].role = r.value;
  });
  sd.team = team;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyTeam();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyTeam() {
  const sd = getSD();
  const team = sd.team;
  const grid = document.getElementById('members-grid');
  if (!team || !grid) return;
  grid.innerHTML = team.map(m => `
    <div class="member">
      <div class="member-avatar" style="background: ${m.color || '#7289da'}">${m.name.charAt(0).toUpperCase()}</div>
      <span>${m.name}</span>
      <span class="member-role">${m.role}</span>
    </div>
  `).join('');
}

function addKit() {
  const sd = getSD();
  const kits = sd.kits || [];
  kits.push({ name: 'Nuevo Kit', price: 5, perks: ['Beneficio 1', 'Beneficio 2'] });
  sd.kits = kits;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('kits');
}

function saveKits() {
  const sd = getSD();
  const kits = sd.kits || [];
  kits.forEach((_, i) => {
    const n = document.getElementById(`k-name-${i}`);
    const p = document.getElementById(`k-price-${i}`);
    const perks = document.getElementById(`k-perks-${i}`);
    if (n) kits[i].name = n.value;
    if (p) kits[i].price = parseFloat(p.value) || 5;
    if (perks) kits[i].perks = perks.value.split('\n').filter(Boolean);
  });
  sd.kits = kits;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyKits();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyKits() {
  const sd = getSD();
  const kits = sd.kits;
  const grid = document.querySelector('#tienda .kits-grid');
  if (!kits || !grid) return;
  grid.innerHTML = kits.map((k, i) => `
    <div class="kit-card${i === 1 ? ' featured' : ''}">
      ${i === 1 ? '<div class="kit-badge">MÁS POPULAR</div>' : ''}
      <div class="kit-tier">${k.name}</div>
      <div class="kit-price">${k.price} 🪙</div>
      <ul class="kit-perks">${k.perks.map(p => `<li>${p}</li>`).join('')}</ul>
      <button class="btn btn-kit" onclick="openPaywall('${k.name}', ${k.price})">Canjear</button>
    </div>
  `).join('');
}

function addLogro() {
  const sd = getSD();
  const logros = sd.logros || [];
  logros.push({ name: 'Nuevo Logro', desc: 'Descripción', icon: '⭐' });
  sd.logros = logros;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('logros');
}

function saveLogros() {
  const sd = getSD();
  const logros = sd.logros || [];
  logros.forEach((_, i) => {
    const n = document.getElementById(`l-name-${i}`);
    const d = document.getElementById(`l-desc-${i}`);
    const icon = document.getElementById(`l-icon-${i}`);
    if (n) logros[i].name = n.value;
    if (d) logros[i].desc = d.value;
    if (icon) logros[i].icon = icon.value;
  });
  sd.logros = logros;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyLogros();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyLogros() {
  const sd = getSD();
  const logros = sd.logros;
  const grid = document.getElementById('logros-grid');
  if (!logros || !grid) return;
  const saved = JSON.parse(localStorage.getItem(LOGROS_KEY)) || {};
  grid.innerHTML = logros.map((l, i) => {
    const id = `logro-${i}`;
    const completed = saved[id];
    return `
      <div class="logro${completed ? ' completado' : ''}" data-id="${id}" onclick="claimLogro(this)">
        <div class="logro-icon">${l.icon}</div>
        <div class="logro-info"><h4>${l.name}</h4><p>${l.desc}</p></div>
        <span class="logro-reward">+0.5 🪙</span>
        <span class="logro-badge">${completed ? '✅' : '❌'}</span>
      </div>
    `;
  }).join('');
}

function addRegla() {
  const sd = getSD();
  const reglas = sd.reglas || [];
  reglas.push('Nueva regla — Descripción');
  sd.reglas = reglas;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('reglas');
}

function removeRegla(index) {
  const sd = getSD();
  sd.reglas = (sd.reglas || []).filter((_, i) => i !== index);
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('reglas');
}

function saveReglas() {
  const sd = getSD();
  const reglas = sd.reglas || [];
  reglas.forEach((_, i) => {
    const el = document.getElementById(`r-text-${i}`);
    if (el) reglas[i] = el.value;
  });
  sd.reglas = reglas;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyReglas();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyReglas() {
  const sd = getSD();
  const reglas = sd.reglas;
  const list = document.querySelector('#reglas .reglas-list');
  if (!reglas || !list) return;
  list.innerHTML = reglas.map((r, i) => {
    const parts = r.split(' — ');
    return `
      <div class="regla">
        <span class="regla-num">${String(i + 1).padStart(2, '0')}</span>
        <div><strong>${parts[0] || r}</strong><p>${parts[1] || ''}</p></div>
      </div>
    `;
  }).join('');
}

function addGaleria() {
  const sd = getSD();
  const galeria = sd.galeria || [];
  galeria.push({ label: 'Nueva imagen', icon: '🖼️' });
  sd.galeria = galeria;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('galeria');
}

function removeGaleria(index) {
  const sd = getSD();
  sd.galeria = (sd.galeria || []).filter((_, i) => i !== index);
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('galeria');
}

function saveGaleria() {
  const sd = getSD();
  const galeria = sd.galeria || [];
  galeria.forEach((_, i) => {
    const icon = document.getElementById(`g-icon-${i}`);
    const label = document.getElementById(`g-label-${i}`);
    if (icon) galeria[i].icon = icon.value;
    if (label) galeria[i].label = label.value;
  });
  sd.galeria = galeria;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyGaleria();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyGaleria() {
  const sd = getSD();
  const galeria = sd.galeria;
  const grid = document.querySelector('#galeria .galeria-grid');
  if (!galeria || !grid) return;
  grid.innerHTML = galeria.map(g => `
    <div class="galeria-item">
      <div class="galeria-placeholder">${g.icon}</div>
      <span>${g.label}</span>
    </div>
  `).join('');
}

/* ───── MODS ───── */
function switchModTab(tab, btn) {
  document.querySelectorAll('.mod-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#mods-content .mods-grid').forEach(g => g.classList.add('hidden'));
  const grid = document.getElementById(`mods-grid-${tab}`);
  if (grid) grid.classList.remove('hidden');
}

function applyMods() {
  const sd = getSD();
  const mdata = sd.mods || {};
  const categories = ['mods', 'modpacks', 'shaders', 'textures'];
  const catNames = { mods: 'Mods', modpacks: 'Modpacks', shaders: 'Shaders', textures: 'Texture Packs' };
  const catIcons = { mods: '📦', modpacks: '📦', shaders: '🌅', textures: '🎨' };

  categories.forEach(cat => {
    const grid = document.getElementById(`mods-grid-${cat}`);
    if (!grid) return;
    const items = mdata[cat] || [];
    if (items.length === 0) {
      grid.innerHTML = '<div style="text-align:center;color:#444;padding:2rem">Sin contenido aún</div>';
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="mod-card">
        <div class="mod-icon">${catIcons[cat]}</div>
        <div class="mod-info">
          <h4>${item.name}</h4>
          <p>${item.desc}<br><a href="${item.url || '#'}" class="mod-cf-link" target="_blank">CurseForge →</a></p>
          <span class="mod-version">${item.version}</span>
        </div>
        <a href="${item.url || '#'}" class="btn-mod-dl" target="_blank">Descargar</a>
      </div>
    `).join('');
  });
}

function toggleFaq(el) {
  el.parentElement.classList.toggle('open');
}

function addModEntry(cat) {
  const sd = getSD();
  if (!sd.mods) sd.mods = {};
  if (!sd.mods[cat]) sd.mods[cat] = [];
  sd.mods[cat].push({ name: 'Nuevo', desc: 'Descripción', version: '1.0', url: '#' });
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('mods');
}

function removeModEntry(cat, index) {
  const sd = getSD();
  if (sd.mods && sd.mods[cat]) {
    sd.mods[cat].splice(index, 1);
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  }
  showCreatorTab('mods');
}

function saveMods() {
  const sd = getSD();
  const categories = ['mods', 'modpacks', 'shaders', 'textures'];
  categories.forEach(cat => {
    const items = sd.mods?.[cat] || [];
    items.forEach((_, i) => {
      const n = document.getElementById(`m-${cat}-name-${i}`);
      const d = document.getElementById(`m-${cat}-desc-${i}`);
      const u = document.getElementById(`m-${cat}-url-${i}`);
      const v = document.getElementById(`m-${cat}-ver-${i}`);
      if (n) items[i].name = n.value;
      if (d) items[i].desc = d.value;
      if (u) items[i].url = u.value;
      if (v) items[i].version = v.value;
    });
  });
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyMods();
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

/* ───── WELCOME ───── */
function dismissWelcome() {
  localStorage.setItem('nervalia_welcomed', 'true');
  document.getElementById('welcome-modal').classList.add('hidden');
}

/* ───── INIT ───── */
document.addEventListener('DOMContentLoaded', () => {
  setLED('idle');
  updateWallet();
  restoreLogros();
  applyServerData();
  applyTeam();
  applyKits();
  applyReglas();
  applyLogros();
  applyGaleria();
  applyMods();
  showAccountStatus();

  if (!localStorage.getItem('nervalia_welcomed')) {
    setTimeout(() => {
      document.getElementById('welcome-modal').classList.remove('hidden');
    }, 600);
  }

  const section = document.getElementById('creator');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !typerFinished) {
        setTimeout(typeEffect, 300);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  if (section) observer.observe(section);
});

checkStatus();
setInterval(checkStatus, 60000);
