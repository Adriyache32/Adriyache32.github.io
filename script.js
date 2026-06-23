const SERVER_IP = 'nervalia.mc';
const API_URL = `https://api.mcstatus.io/v2/status/java/${SERVER_IP}`;

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

checkStatus();
setInterval(checkStatus, 60000);
