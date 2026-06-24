function getServerIP() {
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};
  return sd.serverIP || 'nervalia.mc';
}
function getAPIURL() { return `https://api.mcstatus.io/v2/status/java/${getServerIP()}`; }
const PC_STORAGE_KEY = 'nervalia_pc_id';
const COINS_KEY = 'nervalia_coins';
const LOGROS_KEY = 'nervalia_logros';
const INVENTORY_KEY = 'nervalia_inventory';
const SERVER_DATA_KEY = 'nervalia_server_data';
const CREATOR_PASS = '202530';
const CREATOR_LOG_KEY = 'nervalia_creator_log';
const ACCOUNTS_KEY = 'nervalia_accounts';
const VISIT_LOG_KEY = 'nervalia_visit_log';
const ACTION_LOG_KEY = 'nervalia_action_log';
let unsavedChanges = false;
let unsavedDot = null;

function setUnsaved() {
  unsavedChanges = true;
  if (!unsavedDot) unsavedDot = document.getElementById('unsaved-indicator');
  if (unsavedDot) unsavedDot.style.display = 'inline';
}

function markSaved() {
  unsavedChanges = false;
  if (!unsavedDot) unsavedDot = document.getElementById('unsaved-indicator');
  if (unsavedDot) unsavedDot.style.display = 'none';
}

window.addEventListener('beforeunload', e => {
  if (unsavedChanges) {
    e.preventDefault();
    e.returnValue = 'Tenés cambios sin guardar en el Modo Creador.';
  }
});

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
    const res = await fetch(getAPIURL());
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
  navigator.clipboard.writeText(getServerIP()).then(() => {
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

/* ───── VISIT & ACTION LOG ───── */
function logVisit() {
  const log = JSON.parse(localStorage.getItem(VISIT_LOG_KEY)) || [];
  const fp = getPCFingerprint();
  const existing = log.find(e => e.fingerprint === fp && new Date(e.timestamp).toDateString() === new Date().toDateString());
  if (existing) return;
  log.push({
    type: 'visit',
    fingerprint: fp,
    userAgent: navigator.userAgent.substring(0, 60),
    timestamp: new Date().toISOString()
  });
  if (log.length > 500) log.splice(0, log.length - 500);
  localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(log));
}

function logCreatorAction(action) {
  const log = JSON.parse(localStorage.getItem(ACTION_LOG_KEY)) || [];
  log.push({
    type: 'action',
    action,
    fingerprint: getPCFingerprint(),
    timestamp: new Date().toISOString()
  });
  if (log.length > 200) log.splice(0, log.length - 200);
  localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(log));
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

function approveLogro(index) {
  const requests = JSON.parse(localStorage.getItem('nervalia_logro_requests')) || [];
  if (!requests[index]) return;
  requests[index].status = 'approved';
  localStorage.setItem('nervalia_logro_requests', JSON.stringify(requests));
  const r = requests[index];
  const state = JSON.parse(localStorage.getItem(LOGROS_KEY)) || {};
  state[r.logroId] = true;
  localStorage.setItem(LOGROS_KEY, JSON.stringify(state));
  const coins = getCoins() + 0.5;
  setCoins(coins);
  showCreatorTab('logros-admin');
}

function rejectLogro(index) {
  const requests = JSON.parse(localStorage.getItem('nervalia_logro_requests')) || [];
  if (!requests[index]) return;
  requests[index].status = 'rejected';
  localStorage.setItem('nervalia_logro_requests', JSON.stringify(requests));
  showCreatorTab('logros-admin');
}

function approveStaffForm(index) {
  const forms = JSON.parse(localStorage.getItem('nervalia_staff_forms')) || [];
  if (!forms[index]) return;
  forms[index].status = 'approved';
  localStorage.setItem('nervalia_staff_forms', JSON.stringify(forms));
  showCreatorTab('staff-forms');
}

function rejectStaffForm(index) {
  const forms = JSON.parse(localStorage.getItem('nervalia_staff_forms')) || [];
  if (!forms[index]) return;
  forms[index].status = 'rejected';
  localStorage.setItem('nervalia_staff_forms', JSON.stringify(forms));
  showCreatorTab('staff-forms');
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

function openLogroRequest(id, name, btn) {
  const acc = getAccounts().find(a => a.fingerprint === getPCFingerprint());
  if (!acc || acc.status !== 'verified') {
    alert('❌ Necesitás tener una cuenta verificada para solicitar logros. Andá a la sección "Cuenta".');
    return;
  }
  document.getElementById('logro-modal-name').textContent = name;
  document.getElementById('logro-modal-name').dataset.logroId = id;
  document.getElementById('logro-nick').value = acc.minecraftUser;
  document.getElementById('logro-desc').value = '';
  document.getElementById('logro-url').value = '';
  document.getElementById('logro-modal-error').textContent = '';
  document.getElementById('logro-modal').classList.remove('hidden');
}

function closeLogroModal() {
  document.getElementById('logro-modal').classList.add('hidden');
}

function submitLogroRequest() {
  const nick = document.getElementById('logro-nick').value.trim();
  const desc = document.getElementById('logro-desc').value.trim();
  const url = document.getElementById('logro-url').value.trim();
  const name = document.getElementById('logro-modal-name').textContent;
  const id = document.getElementById('logro-modal-name').dataset.logroId;
  const errorEl = document.getElementById('logro-modal-error');

  if (!nick || !desc || !url) {
    errorEl.textContent = '[ERROR] Completá todos los campos';
    return;
  }

  const requests = JSON.parse(localStorage.getItem('nervalia_logro_requests')) || [];
  const existing = requests.find(r => r.logroId === id && r.fingerprint === getPCFingerprint());
  if (existing) {
    errorEl.textContent = '[SISTEMA] Ya enviaste solicitud para este logro. Esperá la revisión.';
    return;
  }

  requests.push({
    logroId: id,
    logroName: name,
    nick,
    desc,
    screenshotUrl: url,
    fingerprint: getPCFingerprint(),
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  localStorage.setItem('nervalia_logro_requests', JSON.stringify(requests));
  closeLogroModal();
  alert('✅ Solicitud enviada. El staff revisará tu prueba.');
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
        const btn = el.querySelector('.btn-logro-solicitar');
        if (btn) btn.style.display = 'none';
      }
    });
  } catch {}
}

function submitModForm() {
  const fields = ['mod-nick','mod-email','mod-edad','mod-tiempo','mod-porque','mod-experiencia','mod-horas','mod-idiomas','mod-mic','mod-grief'];
  const data = {};
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      document.getElementById('mod-msg').textContent = '[ERROR] Completá todos los campos';
      document.getElementById('mod-msg').style.color = '#ed4245';
      return;
    }
    data[id] = el.value.trim();
  }
  const forms = JSON.parse(localStorage.getItem('nervalia_staff_forms')) || [];
  forms.push({ type: 'moderador', data, fingerprint: getPCFingerprint(), timestamp: new Date().toISOString(), status: 'pending' });
  localStorage.setItem('nervalia_staff_forms', JSON.stringify(forms));
  document.getElementById('mod-msg').textContent = '✅ Solicitud enviada. El equipo la revisará.';
  document.getElementById('mod-msg').style.color = '#43b581';
  fields.forEach(id => document.getElementById(id).value = '');
}

function submitFounderForm() {
  const fields = ['fd-nick','fd-email','fd-edad','fd-pais','fd-tiempo','fd-porque','fd-liderazgo','fd-aporte','fd-costos','fd-plugins','fd-horas','fd-linkedin','fd-conflictos','fd-referencia'];
  const data = {};
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      document.getElementById('fd-msg').textContent = '[ERROR] Completá todos los campos';
      document.getElementById('fd-msg').style.color = '#ed4245';
      return;
    }
    data[id] = el.value.trim();
  }
  const forms = JSON.parse(localStorage.getItem('nervalia_staff_forms')) || [];
  forms.push({ type: 'fundador', data, fingerprint: getPCFingerprint(), timestamp: new Date().toISOString(), status: 'pending' });
  localStorage.setItem('nervalia_staff_forms', JSON.stringify(forms));
  document.getElementById('fd-msg').textContent = '✅ Solicitud enviada. El equipo la revisará.';
  document.getElementById('fd-msg').style.color = '#43b581';
  fields.forEach(id => document.getElementById(id).value = '');
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
  const sd = getSD();
  const isMemb = (sd.membresias || []).find(m => m.name === paywallKit);
  if (isMemb) {
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify({ type: paywallKit, lastClaim: '' }));
  }
  closePaywall();
  alert(`✅ ${isMemb ? 'Membresía' : 'Kit'} ${paywallKit} canjeado con éxito!`);
  if (isMemb) applyMembresias();
}

/* ───── CREATOR TABS ───── */
function showCreatorTab(tab) {
  logCreatorAction('abrió módulo: ' + tab);
  const content = document.getElementById('creator-tab-content');
  const sd = getSD();

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
          <div class="editor-field"><span class="label">IP Server</span><input class="editor-input" id="e-ip" value="${sd.serverIP || 'nervalia.mc'}"></div>
          <div class="editor-field"><span class="label">Discord</span><input class="editor-input" id="e-discord" value="${sd.discord || 'https://discord.gg/nervalia'}"></div>
          <div class="editor-field"><span class="label">Icono URL</span><input class="editor-input" id="e-icon" value="${sd.icon || 'https://api.mcstatus.io/v2/icon/nervalia.mc'}"></div>
          <div class="editor-field"><span class="label">Estado</span>
            <select class="editor-input" id="e-mode-status" style="flex:0.4">
              ${['Activo','En construcción','Trabajando','Mantenimiento','Cerrado','Apagado'].map(m =>
                `<option value="${m}"${sd.modeStatus === m ? ' selected' : ''}>${m}</option>`
              ).join('')}
            </select>
          </div>
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
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
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
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
          </div>
        </div>`;
      break;
    }

    case 'kits': {
      const kdata = sd.kits || [
        { name: 'Cobre', price: 0, badge: '🎁 GRATIS', perks: ['🪖 Armadura: Casco de cuero, Peto de cuero, Pantalones de cuero, Botas de cuero', '⛏️ Herramientas: Pico de madera, Hacha de madera, Espada de madera, Pala de madera', '🍞 Comida: 10 panes, 5 manzanas', '📦 Items: 16 antorchas, 1 Cama marrón', '🏷️ Tag coloreado en el chat'] },
        { name: 'Bronce', price: 5, badge: '🟢 INICIAL', perks: ['🪖 Armadura: Casco de cota de malla, Peto de cota de malla, Pantalones de cota de malla, Botas de cota de malla', '⛏️ Herramientas: Pico de piedra, Hacha de piedra, Espada de piedra, Pala de piedra', '🍞 Comida: 20 filetes de res', '📦 Items: 32 antorchas, 1 Cama naranja, 1 Mesa de trabajo', '🏠 Home adicional (2 total)'] },
        { name: 'Plata', price: 10, badge: '🔥 POPULAR', perks: ['🪖 Armadura: Casco de hierro, Peto de hierro, Pantalones de hierro, Botas de hierro', '⛏️ Herramientas: Pico de hierro, Hacha de hierro, Espada de hierro, Pala de hierro', '🍞 Comida: 15 chuletas de cerdo cocidas', '📦 Items: 24 antorchas, 1 Cama gris, 1 Mesa de encantamientos', '🔮 Acceso a /enderchest'] },
        { name: 'Oro', price: 20, badge: '⭐ RECOMENDADO', perks: ['🪖 Armadura: Casco de oro, Peto de oro, Pantalones de oro, Botas de oro', '⛏️ Herramientas: Pico de oro (Eficiencia II), Hacha de oro (Eficiencia II), Espada de oro, Pala de oro (Eficiencia II)', '🍞 Comida: 30 filetes de res, 10 pasteles de calabaza', '📦 Items: 48 antorchas, 1 Cama amarilla, 1 Yunque, 3 Libros', '💰 5 monedas del server'] },
        { name: 'Diamante', price: 40, badge: '💎 VIP', perks: ['🪖 Armadura: Casco de diamante, Peto de diamante, Pantalones de diamante, Botas de diamante', '⛏️ Herramientas: Pico de diamante (Fortuna III), Hacha de diamante (Eficiencia III), Espada de diamante (Filo III), Pala de diamante (Eficiencia III)', '🍞 Comida: 40 filetes de res, 20 pasteles de calabaza', '📦 Items: 64 antorchas, 1 Cama celeste, 1 Cofre de ender, 5 Obsidiana, 1 Perla de ender'] },
        { name: 'Esmeralda', price: 80, badge: '', perks: ['🪖 Armadura: Casco de diamante (Protección II), Peto de diamante (Protección II), Pantalones de diamante (Protección II), Botas de diamante (Protección II)', '⛏️ Herramientas: Pico de diamante (Fortuna III, Eficiencia III), Hacha de diamante (Eficiencia III, Filo III), Espada de diamante (Filo III, Saqueo II), Pala de diamante (Eficiencia III)', '🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 8 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama verde, 1 Cofre de ender, 16 Obsidiana, 5 Perlas de ender, 1 Huevo de dragón'] },
        { name: 'Rubi', price: 160, badge: '🆕 NUEVO', perks: ['🪖 Armadura: Casco de diamante (Protección III), Peto de diamante (Protección III), Pantalones de diamante (Protección III), Botas de diamante (Protección III)', '⛏️ Herramientas: Pico de diamante (Fortuna IV, Eficiencia IV), Hacha de diamante (Eficiencia IV, Filo IV), Espada de diamante (Filo IV, Saqueo II), Pala de diamante (Eficiencia IV)', '🍞 Comida: 50 filetes de res, 20 pasteles de calabaza, 10 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama roja, 1 Cofre de ender, 10 Obsidiana, 3 Perlas de ender'] },
        { name: 'Netherite', price: 320, badge: '🆕 NUEVO', perks: ['🪖 Armadura: Casco de netherite, Peto de netherite, Pantalones de netherite, Botas de netherite', '⛏️ Herramientas: Pico de netherite (Fortuna V), Hacha de netherite (Eficiencia V), Espada de netherite (Filo V), Pala de netherite (Eficiencia V)', '🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 32 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 32 Obsidiana, 10 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad'] },
        { name: 'Super Netherite', price: 640, badge: '👑 SUPREMO', perks: ['🪖 Armadura: Casco de netherite (Protección V, Casco de acuático), Peto de netherite (Protección V), Pantalones de netherite (Protección V, Caída de pluma IV), Botas de netherite (Protección V, Caída de pluma IV, Agilidad acuática)', '⛏️ Herramientas: Pico de netherite (Fortuna V, Eficiencia V, Irrompibilidad III), Hacha de netherite (Eficiencia V, Filo V, Irrompibilidad III), Espada de netherite (Filo V, Aspecto ígneo II, Saqueo III, Barrido III, Irrompibilidad III), Pala de netherite (Eficiencia V, Irrompibilidad III), Azada de netherite (Eficiencia V, Irrompibilidad III)', '🍞 Comida: 64 chuletas de res, 32 pasteles de calabaza, 64 manzanas doradas notches', '📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 64 Obsidiana, 16 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad, 1 Élitatra (Reparación III, Protección IV), 1 Escudo (Reparación III), 1 Ballesta (Multidisparo, Perforación IV, Velocidad de cargado III)', '💰 50 monedas del server'] },
      ];
      let kHtml = kdata.map((k, i) => `
        <div style="border:1px solid rgba(255,255,255,0.05);padding:0.75rem;border-radius:6px;margin-bottom:0.5rem">
          <div class="editor-field"><span class="label">Kit ${i+1}</span>
            <input class="editor-input" id="k-name-${i}" value="${k.name}" placeholder="Nombre" style="flex:0.3">
            <input class="editor-input" id="k-price-${i}" value="${k.price}" placeholder="Precio" style="flex:0.1;font-family:monospace">
            <input class="editor-input" id="k-badge-${i}" value="${k.badge || ''}" placeholder="Badge (ej: ⭐ RECOMENDADO)" style="flex:0.35;font-size:0.7rem">
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
            <button class="btn-editor" onclick="refreshKits()">[ 🔄 ACTUALIZAR ]</button>
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
          </div>
        </div>`;
      break;
    }

    case 'logros': {
      const ldata = sd.logros || generateDefaultLogros();
      let lHtml = ldata.map((l, i) => `
        <div style="border:1px solid rgba(255,255,255,0.05);padding:0.5rem;border-radius:6px;margin-bottom:0.4rem">
          <div class="editor-field">
            <span class="label">#${i+1}</span>
            <input class="editor-input" id="l-name-${i}" value="${l.name}" style="flex:0.3">
            <input class="editor-input" id="l-desc-${i}" value="${l.desc}" style="flex:0.5">
            <input class="editor-input" id="l-icon-${i}" value="${l.icon}" style="flex:0.08;text-align:center">
            <select class="editor-input" id="l-tier-${i}" style="flex:0.08;font-size:0.65rem">
              ${[1,2,3,4,5,6].map(t => `<option value="${t}"${(l.tier||1)===t?' selected':''}>N${t}</option>`).join('')}
            </select>
            <input class="editor-input" id="l-reward-${i}" value="${l.reward || 0.5}" style="flex:0.1;font-family:monospace">
          </div>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Logros</span></div>
          <div style="color:#888;font-size:0.65rem;margin-bottom:0.5rem">Cada logro tiene un <b>Nivel</b> (1-6) y una <b>Recompensa</b> en 🪙. A mayor nivel, más difícil y más da.</div>
          ${lHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addLogro()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveLogros()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
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
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
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
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
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
    case 'membresias': {
      const mdata = sd.membresias || [
        { name: 'Semanal', price: 30, dailyCoins: 1, badge: '', perks: ['Tag especial en el chat', '1 home adicional'] },
        { name: 'Mensual', price: 80, dailyCoins: 3, badge: '🔥 POPULAR', perks: ['Tag especial + color', '3 homes adicionales', 'Rol exclusivo en Discord'] },
        { name: 'Vitalicio', price: 300, dailyCoins: 5, badge: '👑 VIP', perks: ['Tag especial + color + brillo', '5 homes adicionales', 'Rol VIP en Discord', '+50 monedas iniciales'] },
      ];
      let mHtml = mdata.map((m, i) => `
        <div style="border:1px solid rgba(255,255,255,0.05);padding:0.75rem;border-radius:6px;margin-bottom:0.5rem">
          <div class="editor-field"><span class="label">#${i+1}</span>
            <input class="editor-input" id="memb-name-${i}" value="${m.name}" placeholder="Nombre" style="flex:0.25">
            <input class="editor-input" id="memb-price-${i}" value="${m.price}" placeholder="Precio" style="flex:0.1;font-family:monospace">
            <input class="editor-input" id="memb-daily-${i}" value="${m.dailyCoins}" placeholder="Monedas/día" style="flex:0.12;font-family:monospace">
            <input class="editor-input" id="memb-badge-${i}" value="${m.badge || ''}" placeholder="Badge" style="flex:0.25;font-size:0.7rem">
          </div>
          <textarea class="editor-textarea" id="memb-perks-${i}" style="min-height:40px">${(m.perks || []).join('\n')}</textarea>
          <button class="btn-editor danger" onclick="removeMembresia(${i})" style="font-size:0.65rem;margin-top:0.3rem">✕ Eliminar</button>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Editar Membresías</span></div>
          ${mHtml}
          <div class="editor-actions">
            <button class="btn-editor" onclick="addMembresia()">[ + AGREGAR ]</button>
            <button class="btn-editor save" onclick="saveMembresias()">[ GUARDAR ]</button>
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
          </div>
        </div>`;
      break;
    }
    case 'mods': {
      const mdata = sd.mods || {
        mods: [
          { name: 'Sodium', desc: 'Optimización de rendimiento', url: '#', image: '' },
          { name: 'JourneyMap', desc: 'Mapa minimapa y del mundo', url: '#', image: '' },
          { name: 'SimpleVoiceChat', desc: 'Voice chat de proximidad', url: '#', image: '' },
          { name: 'Litematica', desc: 'Esquemas de construcción', url: '#', image: '' },
        ],
        modpacks: [
          { name: 'Nervalia Pack', desc: 'Modpack oficial del server', url: '#', image: '' },
          { name: 'Fabulously Optimized', desc: 'Modpack de optimización', url: '#', image: '' },
        ],
        shaders: [
          { name: 'Complementary Shaders', desc: 'Shaders vibrantes y ligeros', url: '#', image: '' },
          { name: 'BSL Shaders', desc: 'Shaders realistas', url: '#', image: '' },
        ],
        textures: [
          { name: 'Faithful x64', desc: 'Texturas fieles en 64x', url: '#', image: '' },
          { name: 'Bare Bones', desc: 'Texturas minimalistas', url: '#', image: '' },
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
              <input class="editor-input" id="m-${cat}-name-${i}" value="${item.name}" placeholder="Nombre" style="flex:0.15;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-desc-${i}" value="${item.desc}" placeholder="Desc" style="flex:0.25;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-url-${i}" value="${item.url || '#'}" placeholder="CurseForge URL" style="flex:0.25;font-size:0.7rem">
              <input class="editor-input" id="m-${cat}-img-${i}" value="${item.image || ''}" placeholder="Imagen URL" style="flex:0.2;font-size:0.7rem">
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
            <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
          </div>
        </div>`;
      break;
    }

    case 'registro': {
      const visits = JSON.parse(localStorage.getItem(VISIT_LOG_KEY)) || [];
      const actions = JSON.parse(localStorage.getItem(ACTION_LOG_KEY)) || [];
      const creatorLog = JSON.parse(localStorage.getItem(CREATOR_LOG_KEY)) || [];

      let all = [
        ...visits.map(v => ({ ...v, _type: 'visit', _label: '🌐 Visita' })),
        ...creatorLog.map(c => ({ ...c, _type: 'creator', _label: '🔐 Modo Creador', action: 'accedió al panel', username: c.username })),
        ...actions.map(a => ({ ...a, _type: 'action', _label: '⚡ Acción' })),
      ];
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (all.length > 100) all = all.slice(0, 100);

      const logHtml = all.length === 0
        ? '<div class="line" style="color:#444">Sin registros aún</div>'
        : all.map(entry => `
          <div class="status-line" style="padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.02)">
            <span style="font-size:0.6rem;color:#444;min-width:120px;display:inline-block">${new Date(entry.timestamp).toLocaleString()}</span>
            <span style="font-size:0.6rem;color:#555;min-width:80px;display:inline-block">${entry._label}</span>
            <span style="font-size:0.6rem;color:#888">${entry.action || entry.username || 'Visitante'}</span>
            <span style="font-size:0.55rem;color:#444;margin-left:0.5rem">${entry.fingerprint ? entry.fingerprint.substring(0, 10)+'…' : ''}</span>
          </div>
        `).join('');

      const stats = `
        <div style="display:flex;gap:1rem;margin-bottom:0.75rem;font-size:0.65rem;color:#666">
          <span>🌐 Visitas: <strong style="color:#c0c0d0">${visits.length}</strong></span>
          <span>🔐 Accesos Creator: <strong style="color:#c0c0d0">${creatorLog.length}</strong></span>
          <span>⚡ Acciones: <strong style="color:#c0c0d0">${actions.length}</strong></span>
        </div>
      `;

      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">Registro Completo</span></div>
          ${stats}
          <div class="line" style="color:#666;font-size:0.7rem;margin-bottom:0.5rem">Últimos eventos (máx 100)</div>
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

    case 'logros-admin': {
      const requests = JSON.parse(localStorage.getItem('nervalia_logro_requests')) || [];
      const pendingR = requests.filter(r => r.status === 'pending');
      const doneR = requests.filter(r => r.status !== 'pending');
      let lhtml = '';
      if (pendingR.length === 0) {
        lhtml += '<div class="line" style="color:#666">No hay solicitudes de logros pendientes.</div>';
      } else {
        lhtml += '<div class="line" style="color:#f0c040;font-size:0.75rem;margin-bottom:0.5rem">⏳ Solicitudes pendientes</div>';
        lhtml += pendingR.map((r, i) => `
          <div style="border:1px solid rgba(255,255,255,0.05);border-radius:6px;padding:0.5rem;margin-bottom:0.4rem;font-size:0.75rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">
              <span style="color:#f0c040;font-weight:600">${r.logroName}</span>
              <span style="color:#888">— ${r.nick}</span>
            </div>
            <div style="color:#666;font-size:0.65rem;margin-bottom:0.3rem">${r.desc}</div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <a href="${r.screenshotUrl}" target="_blank" style="color:#7289da;font-size:0.65rem">🔗 Ver captura</a>
              <span style="color:#444;font-size:0.6rem">${new Date(r.timestamp).toLocaleString()}</span>
            </div>
            <div style="margin-top:0.4rem;display:flex;gap:0.4rem">
              <button class="btn-editor save" onclick="approveLogro('${i}')" style="font-size:0.65rem;padding:0.2rem 0.5rem">✓ Aprobar</button>
              <button class="btn-editor danger" onclick="rejectLogro('${i}')" style="font-size:0.65rem;padding:0.2rem 0.5rem">✕ Rechazar</button>
            </div>
          </div>
        `).join('');
      }
      if (doneR.length > 0) {
        lhtml += '<div class="line" style="color:#666;font-size:0.75rem;margin:1rem 0 0.5rem">Historial</div>';
        lhtml += doneR.map(r => `
          <div style="border:1px solid rgba(255,255,255,0.03);border-radius:4px;padding:0.3rem 0.5rem;margin-bottom:0.2rem;display:flex;align-items:center;gap:0.5rem;font-size:0.65rem">
            <span style="color:#888;flex:1">${r.logroName} — ${r.nick}</span>
            <span style="color:${r.status === 'approved' ? '#43b581' : '#ed4245'}">${r.status === 'approved' ? '✓' : '✕'}</span>
          </div>
        `).join('');
      }
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">📋 Solicitudes de Logros</span></div>
          ${lhtml}
        </div>`;
      break;
    }

    case 'staff-forms': {
      const modLabels = {
        'mod-nick': 'Nick Minecraft', 'mod-email': 'Email', 'mod-edad': 'Edad',
        'mod-tiempo': 'Tiempo en el server', 'mod-porque': 'Motivos',
        'mod-experiencia': 'Experiencia previa', 'mod-horas': 'Horas/día',
        'mod-idiomas': 'Idiomas', 'mod-mic': '¿Micrófono?', 'mod-grief': '¿Cómo resolver grief?'
      };
      const fdLabels = {
        'fd-nick': 'Nick Minecraft', 'fd-email': 'Email', 'fd-edad': 'Edad',
        'fd-pais': 'País / Zona horaria', 'fd-tiempo': 'Tiempo en el server',
        'fd-porque': 'Motivos', 'fd-liderazgo': 'Experiencia liderando',
        'fd-aporte': '¿Qué aportaría?', 'fd-costos': '¿Ayudar con costos?',
        'fd-plugins': 'Experiencia plugins', 'fd-horas': 'Horas semanales',
        'fd-linkedin': 'LinkedIn / GitHub', 'fd-conflictos': '¿Cómo maneja conflictos?',
        'fd-referencia': 'Referencia'
      };
      const forms = JSON.parse(localStorage.getItem('nervalia_staff_forms')) || [];
      const pendingF = forms.filter(f => f.status === 'pending');
      const doneF = forms.filter(f => f.status !== 'pending');
      let fhtml = '';
      if (pendingF.length === 0) {
        fhtml += '<div class="line" style="color:#666">No hay solicitudes de staff pendientes.</div>';
      } else {
        pendingF.forEach((f, i) => {
          const labels = f.type === 'moderador' ? modLabels : fdLabels;
          const label = f.type === 'moderador' ? '🛡️ Moderador' : '👑 Fundador';
          const entries = Object.entries(f.data).map(([k, v]) =>
            `<div style="display:flex;gap:0.5rem;padding:0.2rem 0;border-bottom:1px solid rgba(255,255,255,0.03)">
              <span style="color:#666;min-width:130px;font-size:0.65rem">${labels[k] || k}:</span>
              <span style="color:#c0c0d0;font-size:0.65rem">${v}</span>
            </div>`
          ).join('');
          fhtml += `
            <div style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem;background:rgba(255,255,255,0.02)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;padding-bottom:0.5rem;border-bottom:1px solid rgba(255,255,255,0.06)">
                <div>
                  <span style="color:#f0c040;font-weight:700;font-size:0.8rem">${label}</span>
                  <span style="color:#888;font-size:0.7rem;margin-left:0.5rem">${f.data['mod-nick'] || f.data['fd-nick'] || '?'}</span>
                </div>
                <span style="color:#444;font-size:0.6rem">${new Date(f.timestamp).toLocaleString()}</span>
              </div>
              ${entries}
              <div style="margin-top:0.5rem;display:flex;gap:0.4rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.06)">
                <button class="btn-editor save" onclick="approveStaffForm(${i})" style="font-size:0.7rem;padding:0.3rem 0.8rem">✓ Aprobar</button>
                <button class="btn-editor danger" onclick="rejectStaffForm(${i})" style="font-size:0.7rem;padding:0.3rem 0.8rem">✕ Rechazar</button>
              </div>
            </div>`;
        });
      }
      if (doneF.length > 0) {
        fhtml += '<div class="line" style="color:#666;font-size:0.75rem;margin:1rem 0 0.5rem">Historial</div>';
        fhtml += doneF.map(f => `
          <div style="font-size:0.65rem;color:#555;padding:0.3rem 0;display:flex;gap:0.5rem;border-bottom:1px solid rgba(255,255,255,0.02)">
            <span>${f.type === 'moderador' ? '🛡️' : '👑'}</span>
            <span style="color:#888;flex:1">${f.data['mod-nick'] || f.data['fd-nick'] || '?'}</span>
            <span style="color:#444">${new Date(f.timestamp).toLocaleString()}</span>
            <span style="color:${f.status === 'approved' ? '#43b581' : '#ed4245'}">${f.status === 'approved' ? '✅ Aprobado' : '❌ Rechazado'}</span>
          </div>
        `).join('');
      }
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">📋 Solicitudes de Staff</span></div>
          ${fhtml}
        </div>`;
      break;
    }
    case 'ai-terminal': {
      const sysCtx = buildAIContext();
      content.innerHTML = `
        <div class="tab-content">
          <div class="line"><span class="prompt">└─$</span> <span class="highlight">🤖 AI Terminal</span></div>
          <div class="line" style="color:#888;font-size:0.7rem;margin-bottom:0.5rem">Escribí en lenguaje natural lo que querés cambiar:</div>
          <div class="ai-chat" id="ai-chat" style="background:#06060e;border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:0.75rem;max-height:300px;overflow-y:auto;margin-bottom:0.5rem;font-size:0.75rem">
            <div class="ai-msg ai-bot" style="margin-bottom:0.5rem;color:#888">🤖 Conozco toda la config del server. Decime qué modificar. Escribí "ayuda" para ver comandos.<br><span style="font-size:0.65rem;color:#555">${sysCtx}</span></div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <input id="ai-input" class="editor-input" placeholder="Escribí tu orden..." style="flex:1;font-size:0.75rem" onkeydown="if(event.key==='Enter')sendAICommand()">
            <button class="btn-editor save" onclick="sendAICommand()" style="font-size:0.7rem">[ ENVIAR ]</button>
          </div>
          <div class="line" style="margin-top:0.5rem;font-size:0.65rem;color:#444">Los cambios se aplican automáticamente a la web.</div>
        </div>`;
      break;
    }
  }
}

/* ───── AI TERMINAL ───── */
function sendAICommand() {
  const input = document.getElementById('ai-input');
  const chat = document.getElementById('ai-chat');
  if (!input || !chat || !input.value.trim()) return;

  const cmd = input.value.trim();
  input.value = '';
  addAIMessage('user', cmd);
  processAICommand(cmd);
}

function addAIMessage(role, text) {
  const chat = document.getElementById('ai-chat');
  if (!chat) return;
  const div = document.createElement('div');
  div.className = `ai-msg ai-${role}`;
  div.style.marginBottom = '0.5rem';
  div.style.padding = '0.3rem 0.5rem';
  div.style.borderRadius = '6px';
  div.style.fontSize = '0.75rem';
  if (role === 'user') {
    div.style.color = '#7289da';
    div.style.textAlign = 'right';
    div.style.background = 'rgba(114,137,254,0.08)';
    div.textContent = `👤 ${text}`;
  } else {
    div.style.color = '#c0c0d0';
    div.style.background = 'rgba(255,255,255,0.02)';
    div.textContent = `🤖 ${text}`;
  }
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function buildAIContext() {
  const sd = getSD();
  const kits = (sd.kits || []).map(k => `${k.name} (${k.price}🪙)`).join(', ');
  const mems = (sd.membresias || []).map(m => `${m.name} (${m.price}🪙, ${m.dailyCoins}🪙/día)`).join(', ');
  return `📋 Título: "${sd.title}" | IP: ${sd.serverIP} | Versión: ${sd.version} | Modo: ${sd.mode} | Discord: ${sd.discord}
📦 Kits: ${kits || 'ninguno'}
👑 Membresías: ${mems || 'ninguna'}`;
}

function processAICommand(cmd) {
  const sd = getSD();

  function norm(t) { return t.toLowerCase().replace(/[¿?¡!,.;:]/g, '').trim(); }

  function after(words) {
    const n = norm(cmd);
    for (const w of Array.isArray(words) ? words : [words]) {
      const idx = n.indexOf(w);
      if (idx !== -1) return n.slice(idx + w.length).trim().replace(/^(a\s+)/, '').replace(/^["']|["']$/g, '').trim();
    }
    return null;
  }

  function has(words) {
    const n = norm(cmd);
    for (const w of Array.isArray(words) ? words : [words]) {
      if (n.includes(w)) return true;
    }
    return false;
  }

  function findItem(list, name) {
    const nn = norm(name);
    return list.find(i => norm(i.name) === nn || norm(i.name).includes(nn) || nn.includes(norm(i.name)));
  }

  function extractPriceAndDaily(text) {
    const nums = text.match(/\d+/g);
    if (!nums) return [null, null];
    if (nums.length >= 2) return [parseInt(nums[0]), parseInt(nums[1])];
    return [parseInt(nums[0]), null];
  }

  // ── HELP ──
  if (has(['ayuda', 'help', 'que puedes hacer', 'que podes hacer', 'comandos', 'que haces', 'funciona'])) {
    addAIMessage('bot', `Podés decirme cosas como:
• "cambia el título a ..." — cambiá el título del server
• "pone la ip ..." — cambiá la IP
• "discord ..." — cambiá el Discord
• "versión ..." — cambiá la versión
• "icono ..." — cambiá la imagen del server
• "descripción 1 ..." o "descripción 2 ..."
• "modo ..." — cambiá el modo de juego
• "creá un kit NOMBRE precio N" — nuevo kit
• "agregá un kit NOMBRE con precio N"
• "borrá el kit NOMBRE" / "eliminá el kit NOMBRE"
• "NOMBRE que cueste N" / "NOMBRE pase a N" — cambiar precio
• "ponéle badge a NOMBRE TEXTO" / "NOMBRE badge TEXTO"
• "agregá el beneficio TEXTO a NOMBRE"
• "creá una membresía NOMBRE precio N monedas N"
• "eliminá la membresía NOMBRE"
• "sacále los comandos a las membresías"
• "mostrame la config" — resumen actual
• "qué hay" / "cómo está la web"`);
    return;
  }

  // ── SHOW CONFIG ──
  if (has(['mostrame', 'config', 'como esta la web', 'como esta', 'que hay', 'que tengo', 'resumen', 'que datos'])) {
    addAIMessage('bot', buildAIContext());
    return;
  }

  // ── DETECTAR INTENCIÓN GENÉRICA DE CAMBIO ──
  const changing = has(['cambia', 'cambie', 'cambio', 'pone', 'poné', 'poner', 'actualiza', 'actualice', 'modifica', 'modifique', 'edita', 'edite']);

  // ── TITLE ──
  if (has(['titulo', 'título']) && (changing || has(['a', 'nuevo', 'nuev']) || after(['titulo', 'título']))) {
    const val = after(['titulo', 'título']);
    if (val) { sd.title = val; saveAndReload('Título', sd.title); return; }
  }

  // ── IP ──
  if ((has(['ip', 'server ip']) && (changing || has(['a']) || after(['ip', 'server ip'])))) {
    const val = after(['server ip', 'ip']);
    if (val) { sd.serverIP = val; saveAndReload('IP', sd.serverIP); return; }
  }

  // ── DISCORD ──
  if (has(['discord']) && (changing || after(['discord']))) {
    const val = after(['discord']);
    if (val) { sd.discord = val; saveAndReload('Discord', sd.discord); return; }
  }

  // ── VERSION ──
  if (has(['version', 'versión']) && (changing || after(['version', 'versión']))) {
    const val = after(['version', 'versión']);
    if (val) { sd.version = val; saveAndReload('Versión', sd.version); return; }
  }

  // ── ICON ──
  if (has(['icono', 'icon']) && (changing || after(['icono', 'icon']))) {
    const val = after(['icono', 'icon']);
    if (val) { sd.icon = val; saveAndReload('Icono'); return; }
  }

  // ── DESCRIPTION ──
  if (has(['desc', 'descripcion', 'descripción', 'desc 1', 'desc1', 'desc 2', 'desc2'])) {
    const is2 = has(['desc 2', 'desc2', 'descripcion 2', 'descripción 2']);
    const key = is2 ? 'desc2' : 'desc1';
    let val = after(is2 ? ['descripcion 2', 'descripción 2', 'desc 2', 'desc2'] : ['descripcion', 'descripción', 'desc 1', 'desc1', 'desc']);
    if (val) { sd[key] = val; saveAndReload(is2 ? 'Descripción 2' : 'Descripción 1'); return; }
  }

  // ── MODE ──
  if (has(['modo', 'mode', 'gamemode', 'modo de juego']) && (changing || after(['modo de juego', 'modo', 'mode']))) {
    const val = after(['modo de juego', 'modo', 'mode']);
    if (val) { sd.mode = val; saveAndReload('Modo', sd.mode); return; }
  }

  // ── DELETE KIT ──
  if (has(['borra', 'borre', 'borrar', 'elimina', 'elimine', 'eliminar', 'saca', 'saque', 'sacale', 'quitale', 'quita', 'quite'])) {
    const nm = after(['borra', 'borre', 'borrar', 'elimina', 'elimine', 'eliminar', 'saca', 'saque', 'sacale', 'quitale', 'quita', 'quite', 'kit']);
    if (nm && has(['kit', 'membres', 'membresia', 'membresía'])) {
      const isMemb = has(['membres', 'membresia', 'membresía']);
      const list = isMemb ? sd.membresias : sd.kits;
      const key = isMemb ? 'membresias' : 'kits';
      if (list) {
        const item = findItem(list, nm);
        if (item) {
          sd[key] = list.filter(i => i !== item);
          saveToLS(sd);
          (isMemb ? applyMembresias : applyKits)();
          addAIMessage('bot', `✅ ${isMemb ? 'Membresía' : 'Kit'} "${item.name}" eliminada.`);
          return;
        }
      }
      addAIMessage('bot', `❌ No encontré ${isMemb ? 'una membresía' : 'un kit'} "${nm}"`);
      return;
    }
  }

  // ── ADD KIT ──
  if (has(['crea', 'creá', 'agrega', 'agregá', 'añade', 'nuev']) && has(['kit'])) {
    const rest = after(['crea', 'creá', 'agrega', 'agregá', 'añade', 'nuev', 'kit', 'un', 'una']);
    if (rest) {
      const [price] = extractPriceAndDaily(rest);
      const name = rest.replace(/\s*(con\s+)?precio\s*\d+\s*(🪙)?\s*monedas?.*/i, '').trim().replace(/^(el\s+)?(kit\s+)?/i, '').trim();
      if (name && price) {
        if (!sd.kits) sd.kits = [];
        sd.kits.push({ name: name.charAt(0).toUpperCase() + name.slice(1), price, badge: '', perks: ['Beneficio 1', 'Beneficio 2'] });
        saveToLS(sd); applyKits();
        addAIMessage('bot', `✅ Kit "${name}" creado (${price}🪙)`);
        return;
      }
    }
  }

  // ── ADD MEMBRESIA ──
  if (has(['crea', 'creá', 'agrega', 'agregá', 'añade', 'nuev']) && has(['membres', 'membresia', 'membresía'])) {
    const rest = after(['crea', 'creá', 'agrega', 'agregá', 'añade', 'nuev', 'membresia', 'membresía', 'membres', 'una', 'un']);
    if (rest) {
      const [price, daily] = extractPriceAndDaily(rest);
      const name = rest.replace(/\s*(con\s+)?precio\s*\d+.*/i, '').trim().replace(/^(la\s+)?(membres[ií]a\s+)?/i, '').trim();
      if (name && price) {
        if (!sd.membresias) sd.membresias = [];
        sd.membresias.push({ name: name.charAt(0).toUpperCase() + name.slice(1), price, dailyCoins: daily || 1, badge: '', perks: ['Beneficio 1', 'Beneficio 2'] });
        saveToLS(sd); applyMembresias();
        addAIMessage('bot', `✅ Membresía "${name}" creada (${price}🪙, ${daily || 1}🪙/día)`);
        return;
      }
    }
  }

  // ── CHANGE PRICE (kit o membresia) ──
  {
    const nums = cmd.match(/\d+/g);
    if (nums && nums.length >= 1) {
      const potentialPrice = parseInt(nums[nums.length - 1]);
      const n = norm(cmd).replace(/\s*\d+\s*$/g, '').replace(/^(cambia|pone|poné|modifica|actualiza|edita|pase|cueste|valga|precio)\s*(a\s+)?(el\s+)?(precio\s+)?(del\s+)?(kit\s+)?(la\s+)?(membres[ií]a\s+)?/i, '').trim();
      if (n && potentialPrice > 0 && potentialPrice < 10000) {
        const kit = findItem(sd.kits || [], n);
        if (kit) { kit.price = potentialPrice; saveToLS(sd); applyKits(); addAIMessage('bot', `✅ Precio de "${kit.name}" → ${potentialPrice}🪙`); return; }
        const memb = findItem(sd.membresias || [], n);
        if (memb) { memb.price = potentialPrice; saveToLS(sd); applyMembresias(); addAIMessage('bot', `✅ Precio de "${memb.name}" → ${potentialPrice}🪙`); return; }
      }
    }
  }

  // ── BADGE ──
  if (has(['badge'])) {
    const rest = cmd.replace(/^(ponle|ponéle|ponele|pon|poner|agrega|agregá|sacale|quitale|quita|saca)\s*(le\s+)?(un\s+)?(badge\s+)?(a\s+)?/i, '');
    const parts = rest.split(/\s+(?:con|de|es)\s+/i);
    let name = '', badge = '';
    if (parts.length >= 2) { name = norm(parts[1]).replace(/^["']|["']$/g, ''); badge = parts[0].replace(/^["']|["']$/g, '').trim(); }
    else { name = norm(parts[0].replace(/^["']|["']$/g, '')); }
    if (name && sd.kits) {
      const kit = findItem(sd.kits, name);
      if (kit) { kit.badge = badge || '⭐'; saveToLS(sd); applyKits(); addAIMessage('bot', `✅ Badge "${kit.badge}" en "${kit.name}"`); return; }
    }
  }

  // ── PERK —─
  if (has(['perk', 'beneficio', 'perks', 'beneficios'])) {
    const rest = after(['perk', 'perks', 'beneficio', 'beneficios', 'agrega', 'agregá', 'añade', 'pon', 'poné']);
    if (rest) {
      const parts = rest.split(/\s+(?:a|en|al|para)\s+/i);
      if (parts.length >= 2) {
        const perkText = parts[0].replace(/^["']|["']$/g, '').trim();
        const targetName = norm(parts[1]).replace(/^["']|["']$/g, '');
        const kit = findItem(sd.kits || [], targetName);
        const memb = findItem(sd.membresias || [], targetName);
        if (kit) {
          if (!kit.perks) kit.perks = [];
          kit.perks.push(perkText);
          saveToLS(sd); applyKits();
          addAIMessage('bot', `✅ Perk agregado a "${kit.name}"`);
          return;
        }
        if (memb) {
          if (!memb.perks) memb.perks = [];
          memb.perks.push(perkText);
          saveToLS(sd); applyMembresias();
          addAIMessage('bot', `✅ Beneficio agregado a "${memb.name}"`);
          return;
        }
      }
    }
  }

  // ── QUITAR COMANDOS DE MEMBRESIAS ──
  if (has(['comando', 'comandos']) && has(['membres', 'membresia', 'membresía', 'quita', 'quitale', 'saca', 'sacale', 'borra', 'elimina'])) {
    if (sd.membresias) {
      sd.membresias.forEach(m => { m.perks = m.perks.filter(p => !p.match(/\/\w+/)); });
      saveToLS(sd); applyMembresias();
      addAIMessage('bot', '✅ Comandos quitados de todas las membresías');
      return;
    }
  }

  // ── SETTINGS GENÉRICOS (cambiar cosa por valor) ──
  {
    const n = norm(cmd).replace(/^(cambia|cambie|cambio|pone|poné|poner|modifica|edita|actualiza)\s*(el\s+|la\s+|lo\s+)?/i, '').trim();
    const parts = n.split(/\s+(?:a|por|para|con\s+valor|a\s+ser|que\s+sea)\s+/i);
    if (parts.length >= 2) {
      const field = norm(parts[0]);
      const val = parts.slice(1).join(' ').trim().replace(/^["']|["']$/g, '');
      if (field.includes('titulo') || field.includes('título')) { sd.title = val; saveAndReload('Título', sd.title); return; }
      if (field.includes('ip')) { sd.serverIP = val; saveAndReload('IP', sd.serverIP); return; }
      if (field.includes('discord')) { sd.discord = val; saveAndReload('Discord', sd.discord); return; }
      if (field.includes('version') || field.includes('versión')) { sd.version = val; saveAndReload('Versión', sd.version); return; }
      if (field.includes('icono') || field.includes('icon')) { sd.icon = val; saveAndReload('Icono'); return; }
      if (field.includes('modo') || field.includes('mode')) { sd.mode = val; saveAndReload('Modo', sd.mode); return; }
      if (field.includes('desc') && field.includes('1')) { sd.desc1 = val; saveAndReload('Descripción 1'); return; }
      if (field.includes('desc') && field.includes('2')) { sd.desc2 = val; saveAndReload('Descripción 2'); return; }
    }
  }

  // ── ÚLTIMO RECURSO: si tiene "cambia" o "pone" + algo + valor ──
  if (changing) {
    const rest = norm(cmd).replace(/^(cambia|cambie|cambio|pone|poné|poner|modifica|edita|actualiza)\s*(el\s+|la\s+|lo\s+)?/i, '').trim();
    if (rest) {
      // Buscar "X a Y" pattern
      const xy = rest.match(/^(.+?)\s+(?:a|por|para)\s+(.+)$/i);
      if (xy) {
        const field = norm(xy[1]).replace(/^(el\s+|la\s+|lo\s+)?/i, '').trim();
        const val = xy[2].replace(/^["']|["']$/g, '').trim();
        if (/titulo|título/.test(field)) { sd.title = val; saveAndReload('Título', sd.title); return; }
        if (/^ip/.test(field)) { sd.serverIP = val; saveAndReload('IP', sd.serverIP); return; }
        if (/discord/.test(field)) { sd.discord = val; saveAndReload('Discord', sd.discord); return; }
        if (/vers/.test(field)) { sd.version = val; saveAndReload('Versión', sd.version); return; }
        if (/icon/.test(field)) { sd.icon = val; saveAndReload('Icono'); return; }
        if (/modo|mode/.test(field)) { sd.mode = val; saveAndReload('Modo', sd.mode); return; }
        if (/desc.*1|descripcion.*1/.test(field)) { sd.desc1 = val; saveAndReload('Descripción 1'); return; }
        if (/desc.*2|descripcion.*2/.test(field)) { sd.desc2 = val; saveAndReload('Descripción 2'); return; }
      }
    }
  }

  addAIMessage('bot', '❌ No entendí. Decilo de otra forma o escribí "ayuda" para ver ejemplos.');

  function saveToLS(sd2) {
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd2));
  }

  function saveAndReload(label, val) {
    saveToLS(sd);
    applyServerData();
    addAIMessage('bot', `✅ ${label}${val ? ' cambiado a "' + val + '"' : ' actualizado'}`);
  }
}
function exportConfig() {
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};
  const json = JSON.stringify(sd, null, 2);
  const content = document.getElementById('creator-tab-content');
  content.innerHTML = `
    <div class="tab-content">
      <div class="line"><span class="prompt">└─$</span> <span class="highlight">📤 Exportar Configuración</span></div>
      <div style="color:#888;font-size:0.7rem;margin-bottom:0.5rem">Copiá este JSON y pasámelo para que lo publique para todos.</div>
      <textarea id="config-export" style="width:100%;min-height:300px;background:#0a0a12;color:#c0c0d0;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:0.75rem;font-family:monospace;font-size:0.7rem;resize:vertical" readonly>${json.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      <div class="editor-actions">
        <button class="btn-editor save" onclick="copyConfig()" style="font-size:0.7rem">📋 Copiar al portapapeles</button>
        <button class="btn-editor" onclick="showCreatorTab('server')" style="font-size:0.7rem">← Volver</button>
        <span id="e-msg" class="editor-success"></span><span id="unsaved-indicator" class="unsaved-dot" style="display:none;color:#e74c3c;font-size:0.65rem;margin-left:0.5rem">⚠️ Sin guardar</span>
      </div>
    </div>`;
}
function copyConfig() {
  const ta = document.getElementById('config-export');
  if (!ta) return;
  ta.select();
  ta.setSelectionRange(0, 999999);
  navigator.clipboard.writeText(ta.value).then(() => {
    const msg = document.getElementById('e-msg');
    if (msg) { msg.textContent = '✓ Copiado'; setTimeout(() => msg.textContent = '', 2000); }
  });
}

/* ───── SAVE HELPERS ───── */
function getSD() { return JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {}; }

function saveServerData() {
  logCreatorAction('guardó Server');
  const sd = getSD();
  sd.title = document.getElementById('e-title')?.value;
  sd.serverIP = document.getElementById('e-ip')?.value;
  sd.version = document.getElementById('e-version')?.value;
  sd.mode = document.getElementById('e-mode')?.value;
  sd.slot = document.getElementById('e-slot')?.value;
  sd.plugins = document.getElementById('e-plugins')?.value;
  sd.discord = document.getElementById('e-discord')?.value;
  sd.icon = document.getElementById('e-icon')?.value;
  sd.modeStatus = document.getElementById('e-mode-status')?.value;
  sd.desc1 = document.getElementById('e-desc1')?.value;
  sd.desc2 = document.getElementById('e-desc2')?.value;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyServerData();
  const msg = document.getElementById('e-msg');
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
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
  const ipEl = document.getElementById('server-ip');
  if (ipEl && sd.serverIP) ipEl.textContent = sd.serverIP;

  const heroImg = document.querySelector('.server-icon img');
  if (heroImg && sd.icon) heroImg.src = sd.icon;
  else if (heroImg && sd.serverIP) heroImg.src = `https://api.mcstatus.io/v2/icon/${sd.serverIP}`;

  const modeDot = document.getElementById('mode-dot');
  const modeText = document.getElementById('mode-text');
  const modeEl = document.getElementById('server-mode');
  if (modeDot && modeText && modeEl && sd.modeStatus) {
    modeDot.className = 'mode-dot ' + sd.modeStatus.toLowerCase().replace(/\s+/g, '-');
    modeText.textContent = sd.modeStatus;
    modeEl.style.display = 'flex';
  } else if (modeEl) {
    modeEl.style.display = 'none';
  }

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
  logCreatorAction('guardó Equipo');
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
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
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
  kits.push({ name: 'Nuevo Kit', price: 5, badge: '', perks: ['🪖 Armadura:', '⛏️ Herramientas:', '🍞 Comida:', '📦 Items:'] });
  sd.kits = kits;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('kits');
}

function refreshKits() {
  migrateKits();
  migrateMembresias();
  showCreatorTab('kits');
  const msg = document.getElementById('e-msg');
  if (msg) { msg.textContent = '✓ Perks actualizados'; setTimeout(() => msg.textContent = '', 2000); }
}

function saveKits() {
  logCreatorAction('guardó Kits');
  const sd = getSD();
  const kits = sd.kits || [];
  kits.forEach((_, i) => {
    const n = document.getElementById(`k-name-${i}`);
    const p = document.getElementById(`k-price-${i}`);
    const b = document.getElementById(`k-badge-${i}`);
    const perks = document.getElementById(`k-perks-${i}`);
    if (n) kits[i].name = n.value;
    if (p) kits[i].price = parseFloat(p.value) || 5;
    if (b) kits[i].badge = b.value;
    if (perks) kits[i].perks = perks.value.split('\n').filter(Boolean);
  });
  sd.kits = kits;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyKits();
  const msg = document.getElementById('e-msg');
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyKits() {
  const sd = getSD();
  const kits = sd.kits;
  const grid = document.querySelector('#tienda .kits-grid');
  if (!kits || !grid) return;
  grid.innerHTML = kits.map((k, i) => `
    <div class="kit-card${k.badge ? ' featured' : ''}">
      ${k.badge ? `<div class="kit-badge">${k.badge}</div>` : ''}
      <div class="kit-tier">${k.name}</div>
      <div class="kit-price">${k.price === 0 ? 'GRATIS' : k.price + ' 🪙'}</div>
      <ul class="kit-perks">${k.perks.map(p => `<li>${p}</li>`).join('')}</ul>
      <button class="btn btn-kit" onclick="openPaywall('${k.name}', ${k.price})">${k.price === 0 ? 'Obtener' : 'Canjear'}</button>
    </div>
  `).join('');
}

/* ───── MEMBRESÍAS ───── */
const MEMBERSHIP_KEY = 'nervalia_membership';

function applyMembresias() {
  const sd = getSD();
  const mems = sd.membresias;
  const grid = document.getElementById('membresias-grid');
  if (!mems || !grid) return;
  const active = JSON.parse(localStorage.getItem(MEMBERSHIP_KEY)) || {};
  const today = new Date().toDateString();
  const canClaim = active.type && active.lastClaim !== today;
  grid.innerHTML = mems.map((m, i) => `
    <div class="kit-card${m.badge ? ' featured' : ''}">
      ${m.badge ? `<div class="kit-badge">${m.badge}</div>` : ''}
      <div class="kit-tier">${m.name}</div>
      <div class="kit-price">${m.price} 🪙</div>
      <ul class="kit-perks">
        ${m.perks.map(p => `<li>${p}</li>`).join('')}
        <li>💰 ${m.dailyCoins} monedas por día</li>
      </ul>
      ${active.type === m.name
        ? `<button class="btn btn-kit" onclick="claimDaily()" style="background:#2d7d46;margin-bottom:0.3rem">${canClaim ? '📥 Reclamar diarias' : '✅ Ya reclamaste hoy'}</button>
           <div style="font-size:0.65rem;color:#888">Activa</div>`
        : `<button class="btn btn-kit" onclick="openPaywall('${m.name}', ${m.price})">Comprar</button>`}
    </div>
  `).join('');
}

function claimDaily() {
  const active = JSON.parse(localStorage.getItem(MEMBERSHIP_KEY)) || {};
  if (!active.type) return alert('No tenés ninguna membresía activa.');
  const today = new Date().toDateString();
  if (active.lastClaim === today) return alert('Ya reclamaste tus monedas hoy.');
  const sd = getSD();
  const mems = sd.membresias || [];
  const m = mems.find(x => x.name === active.type);
  if (!m) return alert('Error: membresía no encontrada.');
  setCoins(getCoins() + m.dailyCoins);
  active.lastClaim = today;
  localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(active));
  applyMembresias();
  alert(`✅ Reclamaste ${m.dailyCoins} 🪙 diarias. Volvé mañana por más.`);
}

function addMembresia() {
  const sd = getSD();
  const mems = sd.membresias || [];
  mems.push({ name: 'Nueva Membresía', price: 50, dailyCoins: 2, badge: '', perks: ['Beneficio 1', 'Beneficio 2'] });
  sd.membresias = mems;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('membresias');
}

function saveMembresias() {
  logCreatorAction('guardó Membresías');
  const sd = getSD();
  const mems = sd.membresias || [];
  mems.forEach((_, i) => {
    const n = document.getElementById(`memb-name-${i}`);
    const p = document.getElementById(`memb-price-${i}`);
    const d = document.getElementById(`memb-daily-${i}`);
    const b = document.getElementById(`memb-badge-${i}`);
    const perks = document.getElementById(`memb-perks-${i}`);
    if (n) mems[i].name = n.value;
    if (p) mems[i].price = parseFloat(p.value) || 0;
    if (d) mems[i].dailyCoins = parseFloat(d.value) || 0;
    if (b) mems[i].badge = b.value;
    if (perks) mems[i].perks = perks.value.split('\n').filter(Boolean);
  });
  sd.membresias = mems;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyMembresias();
  const msg = document.getElementById('e-msg');
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function removeMembresia(index) {
  const sd = getSD();
  sd.membresias = (sd.membresias || []).filter((_, i) => i !== index);
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('membresias');
}

function addLogro() {
  const sd = getSD();
  const logros = sd.logros || [];
  logros.push({ name: 'Nuevo Logro', desc: 'Descripción', icon: '⭐', tier: 1, reward: 0.5 });
  sd.logros = logros;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  showCreatorTab('logros');
}

function saveLogros() {
  logCreatorAction('guardó Logros');
  const sd = getSD();
  const logros = sd.logros || [];
  logros.forEach((_, i) => {
    const n = document.getElementById(`l-name-${i}`);
    const d = document.getElementById(`l-desc-${i}`);
    const icon = document.getElementById(`l-icon-${i}`);
    const tier = document.getElementById(`l-tier-${i}`);
    const reward = document.getElementById(`l-reward-${i}`);
    if (n) logros[i].name = n.value;
    if (d) logros[i].desc = d.value;
    if (icon) logros[i].icon = icon.value;
    if (tier) logros[i].tier = parseInt(tier.value) || 1;
    if (reward) logros[i].reward = parseFloat(reward.value) || 0.5;
  });
  sd.logros = logros;
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyLogros();
  const msg = document.getElementById('e-msg');
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

function applyLogros() {
  const sd = getSD();
  const logros = sd.logros;
  const grid = document.getElementById('logros-grid');
  if (!logros || !grid) return;
  const saved = JSON.parse(localStorage.getItem(LOGROS_KEY)) || {};

  const tierNames = {
    1: '★ Nivel 1 — Fácil',
    2: '★★ Nivel 2 — Normal',
    3: '★★★ Nivel 3 — Intermedio',
    4: '★★★★ Nivel 4 — Difícil',
    5: '★★★★★ Nivel 5 — Experto',
    6: '★★★★★★ Nivel 6 — Leyenda',
  };
  const tierRewards = { 1: 0.25, 2: 0.5, 3: 1, 4: 2, 5: 3, 6: 5 };
  const tierColors = ['', '#888', '#4fc3f7', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc'];

  const grouped = {};
  logros.forEach(l => {
    const t = l.tier || 1;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(l);
  });

  let html = '';
  for (let t = 1; t <= 6; t++) {
    const items = grouped[t];
    if (!items || items.length === 0) continue;
    const done = items.filter(l => saved[`logro-${logros.indexOf(l)}`]).length;
    const total = items.length;
    const isFirst = false;
    html += `
      <div class="tier-section" style="margin-bottom:1rem">
        <div class="tier-header" onclick="toggleTier(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${tierColors[t]};user-select:none">
          <div>
            <span style="font-size:0.8rem;font-weight:600;color:#c0c0d0">${tierNames[t]}</span>
            <span style="font-size:0.65rem;color:#666;display:block">${done}/${total} · ${tierRewards[t] || 0.5}🪙 c/u</span>
          </div>
          <span style="font-size:0.7rem;color:#444">▶ ${done}/${total}</span>
        </div>
        <div class="tier-body" style="display:none;flex-direction:column;gap:0.35rem;margin-top:0.4rem">
        ${items.map(l => {
          const id = `logro-${logros.indexOf(l)}`;
          const completed = saved[id];
          return `
            <div class="logro${completed ? ' completado' : ''}" data-id="${id}" style="display:flex;align-items:center;gap:0.6rem;padding:0.35rem 0.6rem;border-radius:6px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.04)">
              <span style="font-size:1rem">${l.icon}</span>
              <div style="flex:1;min-width:0"><h4 style="font-size:0.75rem;color:#c0c0d0;margin:0">${l.name}</h4><p style="font-size:0.6rem;color:#666;margin:0">${l.desc}</p></div>
              <span style="font-size:0.65rem;color:#f0c040;white-space:nowrap">+${l.reward || tierRewards[t] || 0.5}🪙</span>
              <span style="font-size:0.75rem">${completed ? '✅' : '❌'}</span>
              ${completed ? '' : `<button class="btn-logro-solicitar" onclick="openLogroRequest('${id}','${l.name}',this)" style="font-size:0.55rem;padding:0.15rem 0.4rem;border-radius:4px;background:rgba(114,137,254,0.15);border:1px solid rgba(114,137,254,0.2);color:#7289da;cursor:pointer">Solicitar</button>`}
            </div>
          `;
        }).join('')}
        </div>
      </div>`;
  }

  grid.innerHTML = html || '<div style="text-align:center;color:#444;padding:2rem;font-size:0.8rem">No hay logros disponibles todavía.</div>';
}

function toggleTier(header) {
  const body = header.nextElementSibling;
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'flex';
  const arrow = header.querySelector('span:last-child');
  if (arrow) arrow.textContent = arrow.textContent.replace('▶', '▼').replace('▼', '▶');
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
  logCreatorAction('guardó Reglas');
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
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
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
  logCreatorAction('guardó Galería');
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
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
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
        ${item.image
          ? `<img class="mod-img" src="${item.image}" alt="${item.name}" loading="lazy">`
          : `<div class="mod-img-placeholder">📦</div>`}
        <div class="mod-info">
          <h4>${item.name}</h4>
          <div class="mod-desc">${item.desc}</div>
          <a href="${item.url || '#'}" class="mod-cf-link" target="_blank">CurseForge →</a>
        </div>
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
  sd.mods[cat].push({ name: 'Nuevo', desc: 'Descripción', url: '#', image: '' });
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
  logCreatorAction('guardó Mods');
  const sd = getSD();
  const categories = ['mods', 'modpacks', 'shaders', 'textures'];
  categories.forEach(cat => {
    const items = sd.mods?.[cat] || [];
    items.forEach((_, i) => {
      const n = document.getElementById(`m-${cat}-name-${i}`);
      const d = document.getElementById(`m-${cat}-desc-${i}`);
      const u = document.getElementById(`m-${cat}-url-${i}`);
      const img = document.getElementById(`m-${cat}-img-${i}`);
      if (n) items[i].name = n.value;
      if (d) items[i].desc = d.value;
      if (u) items[i].url = u.value;
      if (img) items[i].image = img.value;
    });
  });
  localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  applyMods();
  const msg = document.getElementById('e-msg');
  if (msg) { markSaved(); msg.textContent = '✓ Guardado'; setTimeout(() => msg.textContent = '', 2000); }
}

/* ───── AI SOPORTE ───── */
const aiResponses = {
  ip: ['nervalia.mc', 'la ip es nervalia.mc', 'conectate a nervalia.mc'],
  whitelist: ['pedila en nuestro discord', 'solicitala en el discord del server', 'solo por discord se gestiona la whitelist'],
  version: ['1.20.4 - 1.21', 'cualquier version entre 1.20.4 y 1.21 funciona'],
  monedas: ['completando logros', 'cada logro aprobado da 0.5 de moneda', 'solicita un logro con prueba y recibi monedas'],
  logro: ['solicitalo con una captura de pantalla', 'anda a la seccion logros y apreta solicitar', 'necesitas cuenta verificada y una imagen de prueba'],
  grief: ['no se tolera', 'todo se revierte con coreprotect', 'el responsable es baneado'],
  mod: ['postulate en el faq', 'completa el formulario de moderador en el faq', 'seccion faq, formulario de moderador'],
  fundador: ['formulario exclusivo en el faq', 'completa el formulario de fundador en el faq', 'proceso estricto, revisa el faq'],
  clan: ['contacta al equipo por discord', 'necesitas nombre y miembros del clan', 'habla con el staff en discord'],
  discord: ['https://discord.gg/nervalia', 'en la seccion contacto esta el link', 'unite a nuestro discord'],
  tienda: ['anda a la seccion tienda', 'cambia tus monedas por kits', 'bronce 5, plata 10, oro 20'],
  voice: ['simple voice chat obligatorio', 'descarga el mod en la seccion mods', 'voice chat de proximidad'],
  shader: ['complementary, bsl', 'descargalos de la seccion mods', 'carpeta shaderpacks'],
  cuenta: ['vincula tu google en la seccion cuenta', 'un miembro del equipo verifica', 'necesitas cuenta verificada para canjear'],
  version: ['1.20.4 a 1.21', 'cualquiera entre esas versiones funciona'],
  creador: ['acceso restringido al equipo', 'contraseña compartida del staff'],
};

const aiGreetings = ['hola', 'buenas', 'buen dia', 'buen día', 'buenas tardes', 'buenas noches', 'buenos dias', 'buenos días', 'hello', 'hi', 'hey', 'saludos', 'que tal', 'qué tal', 'como estas', 'cómo estás', 'como andas', 'cómo andás'];
const aiBlocked = ['tonta', 'tonto', 'estupida', 'estupido', 'idiota', 'puta', 'puto', 'pendejo', 'pendeja', 'basura', 'mierda', 'culo', 'ctm', 'qlo', 'weon', 'weona', 'tonta', 'burro', 'burra', 'imbecil', 'mmg', 'hp', 'hijueputa', 'malparido', 'marica', 'gay', 'tonto', 'perra', 'zorra'];

let aiOffended = false;
let aiWarnings = 0;
let aiGreeted = false;

function addAIMsg(text, type) {
  const chat = document.getElementById('faq-ai-chat');
  const msg = document.createElement('div');
  msg.className = 'faq-ai-msg ' + type;
  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function sendAIMessage() {
  const input = document.getElementById('faq-ai-input');
  const text = input.value.trim();
  if (!text) return;

  if (aiOffended) {
    addAIMsg('⛔ Ya me cansé. No voy a responder más. Si necesitas ayuda, contactá al staff por Discord. (recargá la página si querés intentar de nuevo)', 'ia');
    input.value = '';
    return;
  }

  addAIMsg(text, 'user');
  input.value = '';

  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (!aiGreeted) {
    const isGreeting = aiGreetings.some(g => lower.includes(g));
    if (!isGreeting) {
      addAIMsg('😤 Primero saludá. No soy un bot cualquiera. Hola, buenas, algo... arrancá bien.', 'ia');
      return;
    }
    aiGreeted = true;
    addAIMsg('👋 Bien. Decime tu consulta y vamos al grano.', 'ia');
    return;
  }

  const isInsult = aiBlocked.some(w => lower.includes(w));
  const spamming = lower.length < 3 || /^(.{1,2})\1{2,}$/.test(lower) || /^(j[aeiou]|h[aeiou]){3,}$/.test(lower);

  if (isInsult || spamming) {
    aiWarnings++;
    if (aiWarnings >= 3) {
      aiOffended = true;
      addAIMsg('⛔ Se detectaron múltiples infracciones. Dejé de responder. Contactá al staff por Discord. (recargá la página si querés intentar de nuevo)', 'ia');
      return;
    }
    const warns = ['⚠️ No uses ese lenguaje. Consultá con respeto o no respondo.', '⚠️ Última advertencia. Una más y dejo de responder del todo.'];
    addAIMsg(warns[aiWarnings - 1], 'ia');
    return;
  }

  let response = null;
  for (const [key, answers] of Object.entries(aiResponses)) {
    if (lower.includes(key)) {
      response = answers[Math.floor(Math.random() * answers.length)];
      break;
    }
  }

  if (!response) {
    const multiWordChecks = [
      ['como entro', 'ip'],
      ['como consigo monedas', 'monedas'],
      ['como ser moderador', 'mod'],
      ['como ser fundador', 'fundador'],
      ['crear clan', 'clan'],
      ['crear equipo', 'clan'],
      ['que version', 'version'],
      ['como conecto', 'ip'],
    ];
    for (const [phrase, tag] of multiWordChecks) {
      if (lower.includes(phrase)) {
        if (tag && aiResponses[tag]) {
          response = aiResponses[tag][Math.floor(Math.random() * aiResponses[tag].length)];
        }
        break;
      }
    }
  }

  if (!response) {
    response = 'No tengo información sobre eso. Consultá el FAQ o contactá al staff por Discord.';
  }

  addAIMsg(response, 'ia');
}

setTimeout(() => {
  const aiInput = document.getElementById('faq-ai-input');
  if (aiInput) aiInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAIMessage(); });
}, 500);

/* ───── COFFEE ───── */
let coffeeRejected = false;

function openCoffee() {
  if (coffeeRejected) {
    document.getElementById('coffee-face').textContent = '😭';
    document.getElementById('coffee-text').innerHTML = '¿Ahora querés?<br><span style="color:#666;font-size:0.8rem">Me rompiste el corazón... 😭💔</span>';
    document.getElementById('coffee-buttons').innerHTML = '<button class="btn btn-map" onclick="closeCoffee()">Bueno... 😢</button>';
  } else {
    document.getElementById('coffee-face').textContent = '🥺';
    document.getElementById('coffee-text').innerHTML = '¿Me invitas un cafecito?<br><span style="color:#666;font-size:0.8rem">Por favorrr 🥺👆</span>';
    document.getElementById('coffee-buttons').innerHTML = `
      <button class="btn btn-discord" onclick="coffeeYes()">¡Sí! ☕</button>
      <button class="btn btn-map" onclick="coffeeNo()">No 😤</button>
    `;
  }
  document.getElementById('coffee-modal').classList.remove('hidden');
}

function closeCoffee() {
  document.getElementById('coffee-modal').classList.add('hidden');
}

function coffeeYes() {
  closeCoffee();
  window.location.href = 'https://cafecito.app/Adriyache32';
}

function coffeeNo() {
  coffeeRejected = true;
  document.getElementById('coffee-face').textContent = '😭';
  document.getElementById('coffee-text').innerHTML = '¿En serio?<br><span style="color:#666;font-size:0.8rem">Me dejaste llorando... 😭💔</span>';
  document.getElementById('coffee-buttons').innerHTML = '<button class="btn btn-discord" onclick="coffeeYes()">¡Ta bueno, dale! ☕</button>';
}

/* ───── WELCOME ───── */
function dismissWelcome() {
  localStorage.setItem('nervalia_welcomed', 'true');
  document.getElementById('welcome-modal').classList.add('hidden');
}

/* ───── MIGRATION ───── */
function migrateKits() {
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};
  const kits = sd.kits;
  if (!kits) return;
  let changed = false;
  const perkMap = {
    'cobre': ['🪖 Armadura: Casco de cuero, Peto de cuero, Pantalones de cuero, Botas de cuero', '⛏️ Herramientas: Pico de madera, Hacha de madera, Espada de madera, Pala de madera', '🍞 Comida: 10 panes, 5 manzanas', '📦 Items: 16 antorchas, 1 Cama marrón', '🏷️ Tag coloreado en el chat'],
    'bronce': ['🪖 Armadura: Casco de cota de malla, Peto de cota de malla, Pantalones de cota de malla, Botas de cota de malla', '⛏️ Herramientas: Pico de piedra, Hacha de piedra, Espada de piedra, Pala de piedra', '🍞 Comida: 20 filetes de res', '📦 Items: 32 antorchas, 1 Cama naranja, 1 Mesa de trabajo', '🏠 Home adicional (2 total)'],
    'plata': ['🪖 Armadura: Casco de hierro, Peto de hierro, Pantalones de hierro, Botas de hierro', '⛏️ Herramientas: Pico de hierro, Hacha de hierro, Espada de hierro, Pala de hierro', '🍞 Comida: 15 chuletas de cerdo cocidas', '📦 Items: 24 antorchas, 1 Cama gris, 1 Mesa de encantamientos', '🔮 Acceso a /enderchest'],
    'oro': ['🪖 Armadura: Casco de oro, Peto de oro, Pantalones de oro, Botas de oro', '⛏️ Herramientas: Pico de oro (Eficiencia II), Hacha de oro (Eficiencia II), Espada de oro, Pala de oro (Eficiencia II)', '🍞 Comida: 30 filetes de res, 10 pasteles de calabaza', '📦 Items: 48 antorchas, 1 Cama amarilla, 1 Yunque, 3 Libros', '💰 5 monedas del server'],
    'diamante': ['🪖 Armadura: Casco de diamante, Peto de diamante, Pantalones de diamante, Botas de diamante', '⛏️ Herramientas: Pico de diamante (Fortuna III), Hacha de diamante (Eficiencia III), Espada de diamante (Filo III), Pala de diamante (Eficiencia III)', '🍞 Comida: 40 filetes de res, 20 pasteles de calabaza', '📦 Items: 64 antorchas, 1 Cama celeste, 1 Cofre de ender, 5 Obsidiana, 1 Perla de ender'],
    'rubi': ['🪖 Armadura: Casco de diamante (Protección III), Peto de diamante (Protección III), Pantalones de diamante (Protección III), Botas de diamante (Protección III)', '⛏️ Herramientas: Pico de diamante (Fortuna IV, Eficiencia IV), Hacha de diamante (Eficiencia IV, Filo IV), Espada de diamante (Filo IV, Saqueo II), Pala de diamante (Eficiencia IV)', '🍞 Comida: 50 filetes de res, 20 pasteles de calabaza, 10 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama roja, 1 Cofre de ender, 10 Obsidiana, 3 Perlas de ender'],
    'esmeralda': ['🪖 Armadura: Casco de diamante (Protección II), Peto de diamante (Protección II), Pantalones de diamante (Protección II), Botas de diamante (Protección II)', '⛏️ Herramientas: Pico de diamante (Fortuna III, Eficiencia III), Hacha de diamante (Eficiencia III, Filo III), Espada de diamante (Filo III, Saqueo II), Pala de diamante (Eficiencia III)', '🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 8 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama verde, 1 Cofre de ender, 16 Obsidiana, 5 Perlas de ender, 1 Huevo de dragón'],
    'netherite': ['🪖 Armadura: Casco de netherite, Peto de netherite, Pantalones de netherite, Botas de netherite', '⛏️ Herramientas: Pico de netherite (Fortuna V), Hacha de netherite (Eficiencia V), Espada de netherite (Filo V), Pala de netherite (Eficiencia V)', '🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 32 manzanas doradas', '📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 32 Obsidiana, 10 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad'],
    'super netherite': ['🪖 Armadura: Casco de netherite (Protección V, Casco de acuático), Peto de netherite (Protección V), Pantalones de netherite (Protección V, Caída de pluma IV), Botas de netherite (Protección V, Caída de pluma IV, Agilidad acuática)', '⛏️ Herramientas: Pico de netherite (Fortuna V, Eficiencia V, Irrompibilidad III), Hacha de netherite (Eficiencia V, Filo V, Irrompibilidad III), Espada de netherite (Filo V, Aspecto ígneo II, Saqueo III, Barrido III, Irrompibilidad III), Pala de netherite (Eficiencia V, Irrompibilidad III), Azada de netherite (Eficiencia V, Irrompibilidad III)', '🍞 Comida: 64 chuletas de res, 32 pasteles de calabaza, 64 manzanas doradas notches', '📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 64 Obsidiana, 16 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad, 1 Élitatra (Reparación III, Protección IV), 1 Escudo (Reparación III), 1 Ballesta (Multidisparo, Perforación IV, Velocidad de cargado III)', '💰 50 monedas del server'],
  };
  const priceMap = { 'cobre': 0 };
  const defaultPerks = ['🪖 Armadura: ...', '⛏️ Herramientas: ...', '🍞 Comida: ...', '📦 Items: ...'];
  kits.forEach(k => {
    const key = k.name.toLowerCase().trim();
    const pk = perkMap[key];
    if (pk) {
      k.perks = pk;
      changed = true;
    }
    if (priceMap[key] !== undefined) {
      k.price = priceMap[key];
      changed = true;
    }
  });
  kits.forEach(k => {
    if (k.recommended && !k.badge) {
      k.badge = '⭐ RECOMENDADO';
      delete k.recommended;
      changed = true;
    }
    if (k.recommended === false && !k.badge) {
      delete k.recommended;
    }
  });
  if (changed) {
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  }
}

function migrateMembresias() {
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};
  if (!sd.membresias || !Array.isArray(sd.membresias) || sd.membresias.length === 0) {
    sd.membresias = [
      { name: 'Semanal', price: 30, dailyCoins: 1, badge: '', perks: ['Tag especial en el chat', '1 home adicional'] },
      { name: 'Mensual', price: 80, dailyCoins: 3, badge: '🔥 POPULAR', perks: ['Tag especial + color', '3 homes adicionales', 'Rol exclusivo en Discord'] },
      { name: 'Vitalicio', price: 300, dailyCoins: 5, badge: '👑 VIP', perks: ['Tag especial + color + brillo', '5 homes adicionales', 'Rol VIP en Discord', '+50 monedas iniciales'] },
    ];
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
  }
}

function generateDefaultLogros() {
  const t1 = [
    { name: 'Minero Inicial', desc: 'Consigue 10 bloques de piedra', icon: '⛏️' },
    { name: 'Leñador Novato', desc: 'Corta 10 árboles', icon: '🌳' },
    { name: 'Recolector', desc: 'Consigue 20 de madera', icon: '🪵' },
    { name: 'Excavador', desc: 'Cava 10 bloques de tierra', icon: '🫘' },
    { name: 'Fabricante', desc: 'Crea tu primer mesa de trabajo', icon: '🪚' },
    { name: 'Horno', desc: 'Funde 10 items en un horno', icon: '🔥' },
    { name: 'Antorcha', desc: 'Crea 10 antorchas', icon: '🔦' },
    { name: 'Cama', desc: 'Fabrica una cama', icon: '🛏️' },
    { name: 'Cofre', desc: 'Crea y coloca un cofre', icon: '📦' },
    { name: 'Ventana', desc: 'Crea 4 vidrios', icon: '🪟' },
    { name: 'Escalera', desc: 'Crea 10 escaleras', icon: '🪜' },
    { name: 'Puerta', desc: 'Crea una puerta de madera', icon: '🚪' },
    { name: 'Valla', desc: 'Crea 6 vallas', icon: '🛡️' },
    { name: 'Losa', desc: 'Crea 10 losas de piedra', icon: '🧱' },
    { name: 'Ladrillo', desc: 'Funde un ladrillo', icon: '🧱' },
    { name: 'Palo', desc: 'Crea 10 palos', icon: '🥢' },
    { name: 'Mesa de Encantamientos', desc: 'Crea una mesa de encantamientos', icon: '📖' },
    { name: 'Yunque', desc: 'Crea un yunque', icon: '🔨' },
    { name: 'Hogar', desc: 'Pone tu cama en una casa', icon: '🏠' },
    { name: 'Cosecha', desc: 'Planta y cosecha 5 trigos', icon: '🌾' },
    { name: 'Papa', desc: 'Planta y cosecha 5 papas', icon: '🥔' },
    { name: 'Zanahoria', desc: 'Planta y cosecha 5 zanahorias', icon: '🥕' },
    { name: 'Melón', desc: 'Cosecha 1 melón', icon: '🍈' },
    { name: 'Calabaza', desc: 'Cosecha 1 calabaza', icon: '🎃' },
    { name: 'Caña de Azúcar', desc: 'Corta 10 cañas de azúcar', icon: '🎋' },
    { name: 'Huevo', desc: 'Consigue 5 huevos de gallina', icon: '🥚' },
    { name: 'Leche', desc: 'Ordeña una vaca', icon: '🥛' },
    { name: 'Carne', desc: 'Consigue 10 filetes de res', icon: '🥩' },
    { name: 'Pollo', desc: 'Cocina 5 pollos', icon: '🍗' },
    { name: 'Pescado', desc: 'Pesca 3 peces', icon: '🐟' },
    { name: 'Explorador', desc: 'Camina 1000 bloques', icon: '👣' },
    { name: 'Colina', desc: 'Sube a la montaña más alta', icon: '⛰️' },
    { name: 'Río', desc: 'Cruza un río', icon: '🌊' },
    { name: 'Bosque', desc: 'Encuentra un bosque', icon: '🌲' },
    { name: 'Oveja', desc: 'Esquila 3 ovejas', icon: '🐑' },
    { name: 'Cerdo', desc: 'Monta un cerdo', icon: '🐷' },
    { name: 'Gato', desc: 'Domestica un gato', icon: '🐱' },
    { name: 'Perro', desc: 'Domestica un lobo', icon: '🐶' },
    { name: 'Pesca', desc: 'Crea una caña de pescar', icon: '🎣' },
    { name: 'Flecha', desc: 'Crea 10 flechas', icon: '🏹' },
    { name: 'Arco', desc: 'Crea un arco', icon: '🏹' },
    { name: 'Espada de Piedra', desc: 'Crea una espada de piedra', icon: '🗡️' },
    { name: 'Pico de Piedra', desc: 'Crea un pico de piedra', icon: '⛏️' },
    { name: 'Hacha de Piedra', desc: 'Crea un hacha de piedra', icon: '🪓' },
    { name: 'Pala de Piedra', desc: 'Crea una pala de piedra', icon: '🫘' },
    { name: 'Azada de Madera', desc: 'Crea una azada de madera', icon: '🌾' },
    { name: 'Carbon', desc: 'Consigue 10 carbones', icon: '🪨' },
    { name: 'Hueso', desc: 'Consigue 5 huesos', icon: '🦴' },
    { name: 'Lana', desc: 'Consigue 10 lanas', icon: '🧶' },
    { name: 'Cuero', desc: 'Consigue 5 cueros', icon: '👜' },
  ];
  const t2 = [
    { name: 'Minero de Hierro', desc: 'Consigue 20 lingotes de hierro', icon: '⛏️' },
    { name: 'Carbonífero', desc: 'Consigue 64 carbón', icon: '🪨' },
    { name: 'Armadura de Hierro', desc: 'Crea un set completo de armadura de hierro', icon: '🪖' },
    { name: 'Herramientas de Hierro', desc: 'Crea pico, hacha, pala y espada de hierro', icon: '🔧' },
    { name: 'Escudo', desc: 'Crea un escudo', icon: '🛡️' },
    { name: 'Encantador', desc: 'Encanta un item por primera vez', icon: '✨' },
    { name: 'Libro Encantado', desc: 'Consigue un libro encantado', icon: '📕' },
    { name: 'Manzana Dorada', desc: 'Crea una manzana dorada', icon: '🍎' },
    { name: 'Poción de Curación', desc: 'Crea una poción de curación', icon: '🧪' },
    { name: 'Poción de Fuerza', desc: 'Crea una poción de fuerza', icon: '💪' },
    { name: 'Poción de Velocidad', desc: 'Crea una poción de velocidad', icon: '🏃' },
    { name: 'Poción de Salto', desc: 'Crea una poción de salto', icon: '🦘' },
    { name: 'Redstone', desc: 'Consigue 20 redstone', icon: '🔴' },
    { name: 'Lámpara', desc: 'Crea una lámpara de redstone', icon: '💡' },
    { name: 'Palanca', desc: 'Crea una palanca', icon: '🕹️' },
    { name: 'Botón', desc: 'Crea un botón de piedra', icon: '🔘' },
    { name: 'Placa de Presión', desc: 'Crea 2 placas de presión', icon: '⚡' },
    { name: 'Puerta de Hierro', desc: 'Crea una puerta de hierro', icon: '🚪' },
    { name: 'Trampilla', desc: 'Crea 2 trampillas', icon: '🪟' },
    { name: 'Carro', desc: 'Crea un carro minero', icon: '🚂' },
    { name: 'Raíl', desc: 'Crea 10 raíles', icon: '🛤️' },
    { name: 'Bote', desc: 'Crea un bote', icon: '🚤' },
    { name: 'Montura', desc: 'Consigue una montura', icon: '🐴' },
    { name: 'Mina', desc: 'Excava 10x10 en una mina', icon: '🕳️' },
    { name: 'Acantilado', desc: 'Encuentra un bioma de acantilados', icon: '🏔️' },
    { name: 'Desierto', desc: 'Encuentra un desierto', icon: '🏜️' },
    { name: 'Taiga', desc: 'Encuentra una taiga', icon: '🌲' },
    { name: 'Playa', desc: 'Encuentra una playa', icon: '🏖️' },
    { name: 'Pantano', desc: 'Encuentra un pantano', icon: '🌿' },
    { name: 'Lago de Lava', desc: 'Encuentra un lago de lava', icon: '🌋' },
    { name: 'Cueva', desc: 'Explora 5 cuevas diferentes', icon: '🕋' },
    { name: 'Aldea', desc: 'Encuentra una aldea', icon: '🏘️' },
    { name: 'Templo', desc: 'Encuentra un templo del desierto', icon: '🗿' },
    { name: 'Pozo', desc: 'Encuentra un pozo en el desierto', icon: '🪣' },
    { name: 'Comerciante', desc: 'Comercia con un aldeano', icon: '💼' },
    { name: 'Mesa de Cartografía', desc: 'Usa una mesa de cartografía', icon: '🗺️' },
    { name: 'Cama de Color', desc: 'Tiñe una cama', icon: '🛏️' },
    { name: 'Bandera', desc: 'Crea una bandera', icon: '🏳️' },
    { name: 'Marco', desc: 'Crea y usa un marco', icon: '🖼️' },
    { name: 'Plato', desc: 'Crea 6 platos', icon: '🍽️' },
    { name: 'Iniciar Sesión', desc: 'Juega por 5 horas totales', icon: '⏰' },
    { name: 'Día 10', desc: 'Sobrevive 10 días', icon: '☀️' },
    { name: 'Cama Roja', desc: 'Duerme 10 noches en cama', icon: '🌙' },
    { name: 'Cocinero', desc: 'Cocina 30 comidas', icon: '🍳' },
    { name: 'Panadero', desc: 'Hornea 20 panes', icon: '🍞' },
    { name: 'Pastel', desc: 'Crea un pastel', icon: '🎂' },
    { name: 'Galleta', desc: 'Hornea 10 galletas', icon: '🍪' },
    { name: 'Sopa', desc: 'Crea una sopa de champiñones', icon: '🍲' },
    { name: 'Piedra Lisa', desc: 'Crea 64 piedra lisa', icon: '🪨' },
    { name: 'Ladrillos de Piedra', desc: 'Crea 64 ladrillos de piedra', icon: '🧱' },
  ];
  const t3 = [
    { name: 'Mina de Diamante', desc: 'Consigue 10 diamantes', icon: '💎' },
    { name: 'Armadura de Diamante', desc: 'Crea un set de armadura de diamante', icon: '🪖' },
    { name: 'Herramientas de Diamante', desc: 'Crea pico, hacha, pala y espada de diamante', icon: '🔧' },
    { name: 'Fortuna', desc: 'Encanta un pico con Fortuna III', icon: '🍀' },
    { name: 'Eficiencia', desc: 'Encanta una herramienta con Eficiencia IV', icon: '⚡' },
    { name: 'Protección', desc: 'Encanta una armadura con Protección IV', icon: '🛡️' },
    { name: 'Filo', desc: 'Encanta una espada con Filo IV', icon: '🗡️' },
    { name: 'Poder', desc: 'Encanta un arco con Poder IV', icon: '🏹' },
    { name: 'Toque de Seda', desc: 'Consigue un encantamiento de Toque de Seda', icon: '🪄' },
    { name: 'Irrompibilidad', desc: 'Encanta un item con Irrompibilidad III', icon: '🔩' },
    { name: 'Observador', desc: 'Crea y usa 4 observadores', icon: '👁️' },
    { name: 'Comparador', desc: 'Crea y usa un comparador', icon: '⚖️' },
    { name: 'Repetidor', desc: 'Crea y usa 3 repetidores', icon: '🔄' },
    { name: 'Pistón', desc: 'Crea 6 pistones', icon: '🤖' },
    { name: 'Pistón Pegajoso', desc: 'Crea 4 pistones pegajosos', icon: '🖐️' },
    { name: 'TNT', desc: 'Crea 10 TNT', icon: '💣' },
    { name: 'Granja Automática', desc: 'Construye una granja de caña automática', icon: '⚙️' },
    { name: 'Ascensor', desc: 'Construye un ascensor de agua', icon: '🛗' },
    { name: 'Puerta Oculta', desc: 'Construye una puerta secreta', icon: '🤫' },
    { name: 'Sistema de Redstone', desc: 'Construye un circuito con 10+ componentes', icon: '🔌' },
    { name: 'Reloj', desc: 'Crea un reloj', icon: '⏱️' },
    { name: 'Brújula', desc: 'Crea una brújula', icon: '🧭' },
    { name: 'Mapa', desc: 'Crea y completa un mapa', icon: '🗺️' },
    { name: 'Balde de Agua', desc: 'Crea 3 baldes', icon: '🪣' },
    { name: 'Tesoro', desc: 'Encuentra un cofre de tesoro enterrado', icon: '💎' },
    { name: 'Ruina Oceánica', desc: 'Explora una ruina oceánica', icon: '🏛️' },
    { name: 'Naufragio', desc: 'Encuentra un naufragio', icon: '🚢' },
    { name: 'Glow Squid', desc: 'Consigue tinta luminosa', icon: '🦑' },
    { name: 'Axolotl', desc: 'Domestica un axolotl', icon: '🦎' },
    { name: 'Llamas', desc: 'Domestica 2 llamas', icon: '🦙' },
    { name: 'Ocelote', desc: 'Domestica un ocelote', icon: '🐆' },
    { name: 'Loro', desc: 'Domestica un loro', icon: '🦜' },
    { name: 'Zorro', desc: 'Domestica un zorro', icon: '🦊' },
    { name: 'Aldeano', desc: 'Protege una aldea de invasión', icon: '🛡️' },
    { name: 'Bibliotecario', desc: 'Comercia con un bibliotecario', icon: '📚' },
    { name: 'Herrero', desc: 'Comercia con un herrero', icon: '🔨' },
    { name: 'Flechero', desc: 'Comercia con un flechero', icon: '🏹' },
    { name: 'Carnicero', desc: 'Comercia con un carnicero', icon: '🥩' },
    { name: 'Granjero', desc: 'Comercia con un granjero 10 veces', icon: '🌾' },
    { name: 'Iniciar Sesión 2', desc: 'Juega 20 horas totales', icon: '⏰' },
    { name: 'Día 25', desc: 'Sobrevive 25 días', icon: '☀️' },
    { name: 'Muerte', desc: 'Muere por primera vez', icon: '💀' },
    { name: 'Vuelta', desc: 'Respawna después de morir', icon: '🔄' },
    { name: 'Anillo', desc: 'Encuentra un anillo de luminiscente', icon: '💍' },
    { name: 'Luminiscente', desc: 'Consigue 10 bloques de luminiscente', icon: '🌟' },
    { name: 'Esponja', desc: 'Consigue una esponja', icon: '🧽' },
    { name: 'Prismarina', desc: 'Consigue 20 prismarina', icon: '🔮' },
    { name: 'Coral', desc: 'Consigue 10 corales diferentes', icon: '🪸' },
    { name: 'Pesca Tesoro', desc: 'Pesca un item encantado', icon: '🎣' },
  ];
  const t4 = [
    { name: 'Netherita', desc: 'Consigue 4 lingotes de netherita', icon: '🖤' },
    { name: 'Armadura de Netherita', desc: 'Crea un set completo de netherita', icon: '🪖' },
    { name: 'Herramientas de Netherita', desc: 'Crea pico, hacha, espada y pala de netherita', icon: '⚔️' },
    { name: 'Espada de Netherita', desc: 'Crea una espada de netherita', icon: '🗡️' },
    { name: 'Portal al Nether', desc: 'Construye y activa un portal al Nether', icon: '🌀' },
    { name: 'Explorador del Nether', desc: 'Camina 500 bloques en el Nether', icon: '👣' },
    { name: 'Fortaleza', desc: 'Encuentra una fortaleza del Nether', icon: '🏰' },
    { name: 'Blaze', desc: 'Mata 10 Blaze', icon: '🔥' },
    { name: 'Wither Skeleton', desc: 'Mata 10 Wither Skeletons', icon: '💀' },
    { name: 'Ghast', desc: 'Mata 5 Ghasts', icon: '👻' },
    { name: 'Lágrima de Ghast', desc: 'Consigue 3 lágrimas de ghast', icon: '💧' },
    { name: 'Piglin', desc: 'Comercia con un Piglin 5 veces', icon: '🐷' },
    { name: 'Gold', desc: 'Consigue 20 oro del Nether', icon: '🪙' },
    { name: 'Cuarzo', desc: 'Consigue 64 cuarzo', icon: '💎' },
    { name: 'Bastión', desc: 'Encuentra un bastión Piglin', icon: '🏛️' },
    { name: 'Poción de Resistencia al Fuego', desc: 'Crea una poción de resistencia al fuego', icon: '🧪' },
    { name: 'Poción de Regeneración', desc: 'Crea una poción de regeneración', icon: '❤️' },
    { name: 'Poción de Daño', desc: 'Crea una poción de daño', icon: '💀' },
    { name: 'Flecha Espectral', desc: 'Crea 10 flechas espectrales', icon: '🏹' },
    { name: 'Poción de Respiración', desc: 'Crea una poción de respiración acuática', icon: '🫁' },
    { name: 'Ojos de Ender', desc: 'Consigue 12 Ojos de Ender', icon: '👁️' },
    { name: 'Portal al End', desc: 'Encuentra y activa el portal al End', icon: '🌀' },
    { name: 'Ender Dragon', desc: 'Derrota al Ender Dragon', icon: '🐉' },
    { name: 'Regreso', desc: 'Regresa del End con vida', icon: '🔄' },
    { name: 'Ciudad del End', desc: 'Encuentra una ciudad del End', icon: '🏰' },
    { name: 'Elitra', desc: 'Consigue un élitras', icon: '🪶' },
    { name: 'Cabeza de Dragon', desc: 'Consigue la cabeza del dragón', icon: '🐉' },
    { name: 'Shulker', desc: 'Mata 5 Shulkers', icon: '📦' },
    { name: 'Cofre de Shulker', desc: 'Consigue un cofre de shulker', icon: '📦' },
    { name: 'Enderman', desc: 'Mata 20 Endermans', icon: '👾' },
    { name: 'Perla de Ender', desc: 'Consigue 16 perlas de ender', icon: '🔮' },
    { name: 'Construye', desc: 'Construye una casa de 10x10', icon: '🏗️' },
    { name: 'Granja de Experiencia', desc: 'Construye una granja de XP', icon: '📈' },
    { name: 'Granja de Aldeanos', desc: 'Construye una granja de aldeanos', icon: '👨‍🌾' },
    { name: 'Almacén', desc: 'Construye un almacén con 20 cofres', icon: '🏪' },
    { name: 'Granja de Mob', desc: 'Construye una granja de mobs', icon: '⚙️' },
    { name: 'Invernadero', desc: 'Construye un invernadero automático', icon: '🌱' },
    { name: 'Fundición', desc: 'Construye una fundición con 8 hornos', icon: '🔥' },
    { name: 'Puerto', desc: 'Construye un puerto con botes', icon: '⚓' },
    { name: 'Iniciar Sesión 3', desc: 'Juega 50 horas totales', icon: '⏰' },
    { name: 'Día 50', desc: 'Sobrevive 50 días', icon: '☀️' },
    { name: 'Viajero', desc: 'Camina 50000 bloques totales', icon: '👣' },
    { name: 'Minero', desc: 'Excava 5000 bloques', icon: '⛏️' },
    { name: 'Constructor', desc: 'Coloca 5000 bloques', icon: '🧱' },
    { name: 'Pescador Experto', desc: 'Pesca 100 veces', icon: '🎣' },
    { name: 'Cazador', desc: 'Mata 500 mobs', icon: '⚔️' },
    { name: 'Amigos', desc: 'Juega con 3 amigos diferentes', icon: '👥' },
    { name: 'Evento', desc: 'Participa en un evento del server', icon: '🎉' },
    { name: 'Logro', desc: 'Completa 50 logros diferentes', icon: '🏅' },
    { name: 'Veterano', desc: 'Juega por 30 días diferentes', icon: '📅' },
  ];
  const t5 = [
    { name: 'Wither', desc: 'Derrota al Wither', icon: '💀' },
    { name: 'Estrella del Nether', desc: 'Consigue una estrella del Nether', icon: '⭐' },
    { name: 'Beacon', desc: 'Construye un beacon', icon: '🔦' },
    { name: 'Beacon Completo', desc: 'Activa un beacon al máximo nivel', icon: '💡' },
    { name: 'Allay', desc: 'Encuentra y libera 2 Allays', icon: '🧚' },
    { name: 'Warden', desc: 'Despierta y sobrevive al Warden', icon: '👹' },
    { name: 'Ancient City', desc: 'Encuentra una Ancient City', icon: '🏛️' },
    { name: 'Swift Sneak', desc: 'Consigue el encantamiento Swift Sneak', icon: '👟' },
    { name: 'Disco', desc: 'Consigue 5 discos de música diferentes', icon: '💿' },
    { name: 'Huevo de Dragón', desc: 'Consigue el huevo de dragón', icon: '🥚' },
    { name: 'Totem', desc: 'Consigue un Totem de Inmortalidad', icon: '🧿' },
    { name: 'Tridente', desc: 'Consigue un tridente', icon: '🔱' },
    { name: 'Conducto', desc: 'Construye y activa un conducto', icon: '🌀' },
    { name: 'Hoguera', desc: 'Coloca 10 hogueras', icon: '🔥' },
    { name: 'Mapa del Tesoro', desc: 'Sigue un mapa del tesoro y encuentra el botín', icon: '🗺️' },
    { name: 'Pesca Legendaria', desc: 'Pesca un libro encantado nivel 30', icon: '📖' },
    { name: 'Comerciante Supremo', desc: 'Comercia 100 veces con aldeanos', icon: '💼' },
    { name: 'Encantamientos Máximos', desc: 'Encanta un item con 5 encantamientos distintos', icon: '✨' },
    { name: 'Poción de Suerte', desc: 'Crea una poción de suerte', icon: '🍀' },
    { name: 'Flecha con Efecto', desc: 'Crea 10 flechas con efecto', icon: '🏹' },
    { name: 'Armadura con Protección', desc: 'Encanta armadura completa con Protección IV', icon: '🛡️' },
    { name: 'Espada Legendaria', desc: 'Encanta espada con Filo V, Saqueo III, Aspecto Ígneo II', icon: '⚔️' },
    { name: 'Pico Legendario', desc: 'Encanta pico con Fortuna III, Eficiencia V, Irrompibilidad III', icon: '⛏️' },
    { name: 'Arco Legendario', desc: 'Encanta arco con Poder V, Punch II, Llama I', icon: '🏹' },
    { name: 'Ballesta', desc: 'Crea y encanta una ballesta', icon: '🎯' },
    { name: 'Pesca en Lava', desc: 'Pesca en lava con caña de pescar', icon: '🌋' },
    { name: 'Granja de Hierro', desc: 'Construye una granja de hierro funcional', icon: '⚙️' },
    { name: 'Granja de Oro', desc: 'Construye una granja de oro en el Nether', icon: '🪙' },
    { name: 'Granja de Enderman', desc: 'Construye una granja de Enderman', icon: '👾' },
    { name: 'Aldea Defendida', desc: 'Defiende una aldea de una invasión', icon: '🛡️' },
    { name: 'Maestro del Comercio', desc: 'Lleva un aldeano a maestro', icon: '👨‍🏫' },
    { name: 'Mansión', desc: 'Encuentra una mansión del bosque', icon: '🏰' },
    { name: 'Monumento Oceánico', desc: 'Explora un monumento oceánico', icon: '🏛️' },
    { name: 'Elder Guardian', desc: 'Mata a un Elder Guardian', icon: '🐟' },
    { name: 'Montaña Nevada', desc: 'Encuentra un bioma de montaña nevada', icon: '🏔️' },
    { name: 'Jungla', desc: 'Encuentra una jungla y su templo', icon: '🌴' },
    { name: 'Sabana', desc: 'Encuentra una aldea en la sabana', icon: '🌅' },
    { name: 'Acantilados de Tiza', desc: 'Encuentra un bioma de tiza', icon: '⛰️' },
    { name: 'Cerezo', desc: 'Encuentra un bioma de cerezos', icon: '🌸' },
    { name: 'Iniciar Sesión 4', desc: 'Juega 100 horas totales', icon: '⏰' },
    { name: 'Día 100', desc: 'Sobrevive 100 días', icon: '☀️' },
    { name: 'Maratón', desc: 'Camina 100000 bloques totales', icon: '👣' },
    { name: 'Minero Experto', desc: 'Excava 10000 bloques', icon: '⛏️' },
    { name: 'Arquitecto', desc: 'Coloca 10000 bloques', icon: '🏗️' },
    { name: 'Cazador Experto', desc: 'Mata 1000 mobs', icon: '⚔️' },
    { name: 'Amigo', desc: 'Juega con 5 amigos diferentes', icon: '👥' },
    { name: 'Streamer', desc: 'Transmite el server en vivo', icon: '📺' },
    { name: 'Guía', desc: 'Ayuda a 3 jugadores nuevos', icon: '🧑‍🏫' },
    { name: 'Logro 100', desc: 'Completa 100 logros diferentes', icon: '🏅' },
    { name: 'Veterano Supremo', desc: 'Juega por 60 días diferentes', icon: '📅' },
  ];
  const t6 = [
    { name: 'Leyenda del Nether', desc: 'Consigue todos los biomas del Nether', icon: '🔥' },
    { name: 'Leyenda del End', desc: 'Explora todas las islas del End', icon: '🌀' },
    { name: 'Maestro del Nether', desc: 'Mata a todos los mobs del Nether', icon: '👹' },
    { name: 'Coleccionista de Discos', desc: 'Consigue todos los discos de música', icon: '💿' },
    { name: 'Armadura Suprema', desc: 'Encanta armadura completa con Protección IV y Feather Falling IV', icon: '🛡️' },
    { name: 'Herramienta Suprema', desc: 'Encanta un pico con 6 encantamientos', icon: '⛏️' },
    { name: 'Guerrero Supremo', desc: 'Derrota a todos los jefes del juego', icon: '⚔️' },
    { name: 'Biblioteca Completa', desc: 'Consigue todos los encantamientos nivel máximo', icon: '📚' },
    { name: 'Poción Suprema', desc: 'Crea todos los tipos de pociones', icon: '🧪' },
    { name: 'Bestiario', desc: 'Mata al menos 1 de cada mob del juego', icon: '📖' },
    { name: 'Explorador Supremo', desc: 'Visita todos los biomas del Overworld', icon: '🌍' },
    { name: 'Comerciante Legendario', desc: 'Lleva 5 aldeanos diferentes a maestro', icon: '👨‍🌾' },
    { name: 'Granjero Supremo', desc: 'Cultiva todos los cultivos del juego', icon: '🌾' },
    { name: 'Minero Legendario', desc: 'Consigue 64 de cada mineral', icon: '⛏️' },
    { name: 'Constructor Supremo', desc: 'Construye una base de 50x50', icon: '🏰' },
    { name: 'Redstone Master', desc: 'Construye una máquina compleja con 50+ componentes', icon: '🔌' },
    { name: 'Elytra', desc: 'Vuela 10000 bloques con élitras', icon: '🪶' },
    { name: 'Velocidad', desc: 'Alcanza velocidad máxima con élitras y fuegos artificiales', icon: '💨' },
    { name: 'Pesca Suprema', desc: 'Pesca 500 veces', icon: '🎣' },
    { name: 'Asesino de Dragones', desc: 'Derrota al Ender Dragon 5 veces', icon: '🐉' },
    { name: 'Matador de Wither', desc: 'Derrota al Wither 3 veces', icon: '💀' },
    { name: 'Tesoro Supremo', desc: 'Encuentra 10 cofres de tesoro', icon: '💎' },
    { name: 'Iniciar Sesión 5', desc: 'Juega 250 horas totales', icon: '⏰' },
    { name: 'Día 365', desc: 'Sobrevive un año entero', icon: '📅' },
    { name: 'Logro Completo', desc: 'Completa 200 logros diferentes', icon: '🏆' },
    { name: 'Maestro de la Muerte', desc: 'Muere de 10 formas diferentes', icon: '💀' },
    { name: 'Mapa Completo', desc: 'Completa un mapa de área 4/4', icon: '🗺️' },
    { name: 'Aldea Suprema', desc: 'Protege 3 aldeas diferentes de invasiones', icon: '🛡️' },
    { name: 'Marino', desc: 'Explora un monumento oceánico completo', icon: '🌊' },
    { name: 'Conducto Máximo', desc: 'Activa un conducto con 42 prismarina', icon: '🌀' },
    { name: 'Navegante', desc: 'Navega 5000 bloques en bote', icon: '🚤' },
    { name: 'Montaraz', desc: 'Recorre 5000 bloques en carro minero', icon: '🚂' },
    { name: 'Caballero', desc: 'Recorre 5000 bloques a caballo', icon: '🐴' },
    { name: 'Célebre', desc: 'Consigue 10 amigos en el server', icon: '👥' },
    { name: 'Eventos', desc: 'Participa en 10 eventos del server', icon: '🎉' },
    { name: 'Donador', desc: 'Ayuda a mejorar el server', icon: '💝' },
    { name: 'Staff', desc: 'Conviértete en moderador del server', icon: '🛡️' },
    { name: 'Fundador', desc: 'Ayuda a fundar algo en el server', icon: '👑' },
    { name: 'Membresía', desc: 'Consigue una membresía', icon: '💳' },
    { name: 'Kit Premium', desc: 'Canjea un kit de nivel 4+', icon: '📦' },
    { name: 'Monedas', desc: 'Acumula 500 monedas totales', icon: '🪙' },
    { name: 'Gastador', desc: 'Gasta 200 monedas en kits', icon: '💰' },
    { name: 'Ahorrador', desc: 'Ahorra 100 monedas sin gastar', icon: '🏦' },
    { name: 'Logro Final', desc: 'Completa TODOS los logros', icon: '👑' },
    { name: 'Leyenda Viva', desc: 'Sé reconocido como leyenda del server', icon: '🌟' },
    { name: 'Inmortal', desc: 'Juega por más de 500 horas', icon: '♾️' },
    { name: 'Día 500', desc: 'Sobrevive 500 días', icon: '☀️' },
    { name: 'Campeón', desc: 'Gana un torneo del server', icon: '🏆' },
    { name: 'Creador', desc: 'Aporta una idea implementada en el server', icon: '💡' },
    { name: 'Historia', desc: 'Sé parte de la historia del server', icon: '📜' },
  ];
  function make(l, t) { return l.map((x, i) => ({ ...x, tier: t, reward: [0.25, 0.5, 1, 2, 3, 5][t - 1] })); }
  return [...make(t1,1), ...make(t2,2), ...make(t3,3), ...make(t4,4), ...make(t5,5), ...make(t6,6)];
}

function migrateLogros() {
  const sd = JSON.parse(localStorage.getItem(SERVER_DATA_KEY)) || {};
  const logros = sd.logros;
  if (!logros || logros.length < 300) {
    sd.logros = generateDefaultLogros();
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
    return;
  }
  let changed = false;
  const tierDefaults = [0.25, 0.5, 1, 2, 3, 5];
  logros.forEach(l => {
    if (!l.tier) { l.tier = 1; changed = true; }
    if (!l.reward && l.reward !== 0) { l.reward = tierDefaults[(l.tier || 1) - 1]; changed = true; }
  });
  if (changed) localStorage.setItem(SERVER_DATA_KEY, JSON.stringify(sd));
}

/* ───── INIT ───── */
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem(SERVER_DATA_KEY)) {
    localStorage.setItem(SERVER_DATA_KEY, JSON.stringify({
      "title": "~Nervalia~",
      "version": "1.20.1",
      "mode": "Survival / Forge",
      "slot": "20 jugadores",
      "plugins": "¿?",
      "desc1": "Server survival privado para amigos y conocidos.",
      "desc2": "Contamos con voice chat de proximidad y mapa dinámico.",
      "team": [],
      "discord": "https://discord.gg/dG5hyxkca",
      "icon": "https://i.pinimg.com/736x/e8/5b/4d/e85b4d17e58cd4b24e0e886b2ad1a9c7.jpg",
      "modeStatus": "Trabajando",
      "serverIP": "nervalia.mc",
      "kits": [
        { "name": "Cobre", "price": 0, "badge": "🎁 GRATIS", "perks": ["🪖 Armadura: Casco de cuero, Peto de cuero, Pantalones de cuero, Botas de cuero", "⛏️ Herramientas: Pico de madera, Hacha de madera, Espada de madera, Pala de madera", "🍞 Comida: 10 panes, 5 manzanas", "📦 Items: 16 antorchas, 1 Cama marrón", "🏷️ Tag coloreado en el chat"] },
        { "name": "Bronce", "price": 5, "badge": "🟢 INICIAL", "perks": ["🪖 Armadura: Casco de cota de malla, Peto de cota de malla, Pantalones de cota de malla, Botas de cota de malla", "⛏️ Herramientas: Pico de piedra, Hacha de piedra, Espada de piedra, Pala de piedra", "🍞 Comida: 20 filetes de res", "📦 Items: 32 antorchas, 1 Cama naranja, 1 Mesa de trabajo", "🏠 Home adicional (2 total)"] },
        { "name": "Plata", "price": 10, "badge": "🔥 POPULAR", "perks": ["🪖 Armadura: Casco de hierro, Peto de hierro, Pantalones de hierro, Botas de hierro", "⛏️ Herramientas: Pico de hierro, Hacha de hierro, Espada de hierro, Pala de hierro", "🍞 Comida: 15 chuletas de cerdo cocidas", "📦 Items: 24 antorchas, 1 Cama gris, 1 Mesa de encantamientos", "🔮 Acceso a /enderchest"] },
        { "name": "Oro", "price": 20, "badge": "⭐ RECOMENDADO", "perks": ["🪖 Armadura: Casco de oro, Peto de oro, Pantalones de oro, Botas de oro", "⛏️ Herramientas: Pico de oro (Eficiencia II), Hacha de oro (Eficiencia II), Espada de oro, Pala de oro (Eficiencia II)", "🍞 Comida: 30 filetes de res, 10 pasteles de calabaza", "📦 Items: 48 antorchas, 1 Cama amarilla, 1 Yunque, 3 Libros", "💰 5 monedas del server"] },
        { "name": "Diamante", "price": 40, "badge": "💎 VIP", "perks": ["🪖 Armadura: Casco de diamante, Peto de diamante, Pantalones de diamante, Botas de diamante", "⛏️ Herramientas: Pico de diamante (Fortuna III), Hacha de diamante (Eficiencia III), Espada de diamante (Filo III), Pala de diamante (Eficiencia III)", "🍞 Comida: 40 filetes de res, 20 pasteles de calabaza", "📦 Items: 64 antorchas, 1 Cama celeste, 1 Cofre de ender, 5 Obsidiana, 1 Perla de ender"] },
        { "name": "Esmeralda", "price": 80, "badge": "", "perks": ["🪖 Armadura: Casco de diamante (Protección II), Peto de diamante (Protección II), Pantalones de diamante (Protección II), Botas de diamante (Protección II)", "⛏️ Herramientas: Pico de diamante (Fortuna III, Eficiencia III), Hacha de diamante (Eficiencia III, Filo III), Espada de diamante (Filo III, Saqueo II), Pala de diamante (Eficiencia III)", "🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 8 manzanas doradas", "📦 Items: 64 antorchas, 1 Cama verde, 1 Cofre de ender, 16 Obsidiana, 5 Perlas de ender, 1 Huevo de dragón"] },
        { "name": "Rubi", "price": 160, "badge": "🆕 NUEVO", "perks": ["🪖 Armadura: Casco de diamante (Protección III), Peto de diamante (Protección III), Pantalones de diamante (Protección III), Botas de diamante (Protección III)", "⛏️ Herramientas: Pico de diamante (Fortuna IV, Eficiencia IV), Hacha de diamante (Eficiencia IV, Filo IV), Espada de diamante (Filo IV, Saqueo II), Pala de diamante (Eficiencia IV)", "🍞 Comida: 50 filetes de res, 20 pasteles de calabaza, 10 manzanas doradas", "📦 Items: 64 antorchas, 1 Cama roja, 1 Cofre de ender, 10 Obsidiana, 3 Perlas de ender"] },
        { "name": "Netherite", "price": 320, "badge": "🆕 NUEVO", "perks": ["🪖 Armadura: Casco de netherite, Peto de netherite, Pantalones de netherite, Botas de netherite", "⛏️ Herramientas: Pico de netherite (Fortuna V), Hacha de netherite (Eficiencia V), Espada de netherite (Filo V), Pala de netherite (Eficiencia V)", "🍞 Comida: 64 filetes de res, 32 pasteles de calabaza, 32 manzanas doradas", "📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 32 Obsidiana, 10 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad"] },
        { "name": "Super Netherite", "price": 640, "badge": "👑 SUPREMO", "perks": ["🪖 Armadura: Casco de netherite (Protección V, Casco de acuático), Peto de netherite (Protección V), Pantalones de netherite (Protección V, Caída de pluma IV), Botas de netherite (Protección V, Caída de pluma IV, Agilidad acuática)", "⛏️ Herramientas: Pico de netherite (Fortuna V, Eficiencia V, Irrompibilidad III), Hacha de netherite (Eficiencia V, Filo V, Irrompibilidad III), Espada de netherite (Filo V, Aspecto ígneo II, Saqueo III, Barrido III, Irrompibilidad III), Pala de netherite (Eficiencia V, Irrompibilidad III), Azada de netherite (Eficiencia V, Irrompibilidad III)", "🍞 Comida: 64 chuletas de res, 32 pasteles de calabaza, 64 manzanas doradas notches", "📦 Items: 64 antorchas, 1 Cama negra, 1 Cofre de ender, 64 Obsidiana, 16 Perlas de ender, 1 Huevo de dragón, 1 Totem de inmortalidad, 1 Élitatra (Reparación III, Protección IV), 1 Escudo (Reparación III), 1 Ballesta (Multidisparo, Perforación IV, Velocidad de cargado III)", "💰 50 monedas del server"] }
      ],
      "membresias": [
        { "name": "Semanal", "price": 30, "dailyCoins": 1, "badge": "", "perks": ["Tag especial en el chat", "1 home adicional"] },
        { "name": "Mensual", "price": 80, "dailyCoins": 3, "badge": "🔥 POPULAR", "perks": ["Tag especial + color", "3 homes adicionales", "Rol exclusivo en Discord"] },
        { "name": "Vitalicio", "price": 300, "dailyCoins": 5, "badge": "👑 VIP", "perks": ["Tag especial + color + brillo", "5 homes adicionales", "Rol VIP en Discord", "+50 monedas iniciales"] }
      ]
    }));
  }
  migrateKits();
  migrateMembresias();
  migrateLogros();
  setLED('idle');
  updateWallet();
  restoreLogros();
  applyServerData();
  applyTeam();
  applyKits();
  applyMembresias();
  applyReglas();
  applyLogros();
  applyGaleria();
  applyMods();
  showAccountStatus();

  logVisit();

  document.getElementById('creator-tab-content')?.addEventListener('input', () => setUnsaved());

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
