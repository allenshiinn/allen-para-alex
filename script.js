const scene = document.querySelector('.scene');
const startBtn = document.getElementById('startBtn');
const blowBtn = document.getElementById('blowBtn');
const againBtn = document.getElementById('againBtn');
const statusText = document.getElementById('status');

let audioContext = null;
let stream = null;
let analyser = null;
let source = null;
let rafId = null;
let loudFrames = 0;
let lastBlow = 0;

function extinguish(message = '¡Lo lograste! Tu deseo ya está en camino 💗') {
  if (scene.classList.contains('blown')) return;
  scene.classList.add('blown');
  statusText.textContent = message;
  startBtn.textContent = '✨ ¡Velita apagada!';
  startBtn.disabled = true;
  stopMicrophone();
}

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusText.textContent = 'Tu navegador no permite usar el micrófono aquí. Prueba en una página HTTPS.';
    return;
  }
  try {
    statusText.textContent = 'Solicitando permiso para usar el micrófono…';
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false
    });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    loudFrames = 0;
    statusText.textContent = '¡Ahora sopla hacia el micrófono! 💨';
    startBtn.textContent = '🎤 Micrófono activado';
    monitor(samples);
  } catch (error) {
    statusText.textContent = error.name === 'NotAllowedError'
      ? 'No se permitió el micrófono. Puedes apagarla con el botón de abajo.'
      : 'No pude acceder al micrófono. Prueba el botón de apagar.';
  }
}

function monitor(samples) {
  if (!analyser || scene.classList.contains('blown')) return;
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const value of samples) {
    const normalized = (value - 128) / 128;
    sum += normalized * normalized;
  }
  const volume = Math.sqrt(sum / samples.length);
  const now = Date.now();

  // Umbral ajustable: detecta un soplido sostenido, no un sonido aislado.
  if (volume > 0.105 && now - lastBlow > 1200) {
    loudFrames++;
    if (loudFrames >= 5) {
      lastBlow = now;
      extinguish();
      return;
    }
  } else {
    loudFrames = Math.max(0, loudFrames - 1);
  }
  rafId = requestAnimationFrame(() => monitor(samples));
}

function stopMicrophone() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
  audioContext = null;
  analyser = null;
  source = null;
}

function relight() {
  stopMicrophone();
  scene.classList.remove('blown');
  statusText.textContent = 'Tu velita está esperando ✨';
  startBtn.textContent = '🎤 Activar micrófono';
  startBtn.disabled = false;
  loudFrames = 0;
}

startBtn.addEventListener('click', startMicrophone);
blowBtn.addEventListener('click', () => extinguish('¡Deseo pedido! 💗'));
againBtn.addEventListener('click', relight);
window.addEventListener('pagehide', stopMicrophone);


// Melodía de cumpleaños sintetizada en el navegador (no usa una grabación).
const songBtn = document.getElementById('songBtn');
let songContext = null;
let songTimers = [];

function stopSong() {
  songTimers.forEach(id => clearTimeout(id));
  songTimers = [];
  if (songContext && songContext.state !== 'closed') songContext.close();
  songContext = null;
  songBtn.classList.remove('playing');
  songBtn.textContent = '♫ Escuchar cumpleaños feliz';
}

function playBirthdaySong() {
  stopSong();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    statusText.textContent = 'Tu navegador no permite reproducir la canción.';
    return;
  }
  songContext = new AudioCtx();
  const ctx = songContext;
  ctx.resume();

  // Frecuencias de la melodía tradicional de cumpleaños, en una versión sencilla.
  const melody = [
    [392, .32], [392, .18], [440, .5], [392, .5], [523.25, .5], [493.88, .9],
    [392, .32], [392, .18], [440, .5], [392, .5], [587.33, .5], [523.25, .9],
    [392, .32], [392, .18], [783.99, .5], [659.25, .5], [523.25, .5], [493.88, .5], [440, .9],
    [698.46, .32], [698.46, .18], [659.25, .5], [523.25, .5], [587.33, .5], [523.25, 1.0]
  ];
  let at = ctx.currentTime + .08;
  melody.forEach(([frequency, duration]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.13, at + .025);
    gain.gain.setTargetAtTime(0.0001, at + Math.max(.06, duration - .08), .035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration);
    at += duration + .035;
  });
  songBtn.classList.add('playing');
  songBtn.textContent = '♫ Reproduciendo…';
  const totalMs = melody.reduce((sum, note) => sum + note[1] + .035, 0) * 1000 + 250;
  songTimers.push(setTimeout(() => {
    if (songContext === ctx) {
      songBtn.classList.remove('playing');
      songBtn.textContent = '♫ Escuchar otra vez';
      ctx.close();
      songContext = null;
    }
  }, totalMs));
}

songBtn.addEventListener('click', playBirthdaySong);
window.addEventListener('pagehide', stopSong);
