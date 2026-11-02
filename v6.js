/* Version 6 additions: falling rose petals and an optional original melody.
   The Version 5 flower model and message remain untouched. */
(() => {
  const screen = document.getElementById("screen");
  const experience = screen.querySelector(".experience");

  // Each petal is CSS-drawn, lightweight, and tied to the existing replay.
  for (let i = 0; i < 15; i += 1) {
    const petal = document.createElement("span");
    petal.className = "petal-fall";
    petal.setAttribute("aria-hidden", "true");
    petal.style.setProperty("--left", `${(i * 31 + 9) % 100}%`);
    petal.style.setProperty("--size", `${7 + (i % 5) * 2}px`);
    petal.style.setProperty("--duration", `${9.5 + (i % 6) * 1.2}s`);
    petal.style.setProperty("--fall-delay", `${1.2 + i * 1.13}s`);
    petal.style.setProperty("--drift", `${i % 2 ? 85 : -92}px`);
    screen.appendChild(petal);
  }

  const toggle = document.createElement("button");
  toggle.className = "music-toggle";
  toggle.type = "button";
  toggle.textContent = "♫ Play soft piano";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", "Play optional soft piano melody");
  experience.appendChild(toggle);

  let context = null;
  let master = null;
  let phraseTimer = null;
  let playingMusic = false;
  const phraseLength = 12.8;

  // A small original four-chord melody, created in the browser on demand.
  // No copyrighted recording, audio file, download, or autoplay required.
  const melody = [
    [0, 53, 2.6], [.12, 69, 1.5], [.8, 72, 1.0], [1.6, 76, 1.1], [2.4, 72, .9],
    [3.2, 48, 2.7], [3.32, 67, 1.4], [4.0, 71, 1], [4.8, 76, 1.2], [5.6, 71, .9],
    [6.4, 45, 2.6], [6.52, 64, 1.5], [7.2, 67, 1.0], [8.0, 72, 1.2], [8.8, 67, .9],
    [9.6, 43, 2.8], [9.72, 62, 1.5], [10.4, 69, 1.1], [11.2, 74, 1.2], [12.0, 69, .9]
  ];

  function createNote(midi, when, duration) {
    if (!context || !master) return;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(midi < 60 ? 0.14 : 0.085, when + .018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration + .55);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2300;
    envelope.connect(filter);
    filter.connect(master);

    for (const [type, ratio, level] of [["sine", 1, 1], ["triangle", 2, .16]]) {
      const oscillator = context.createOscillator();
      const voice = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency * ratio, when);
      voice.gain.value = level;
      oscillator.connect(voice);
      voice.connect(envelope);
      oscillator.start(when);
      oscillator.stop(when + duration + .65);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        voice.disconnect();
      }, {once: true});
    }
  }

  function schedulePhrase() {
    if (!playingMusic || !context) return;
    const start = context.currentTime + .07;
    melody.forEach(([offset, midi, duration]) => {
      createNote(midi, start + offset, duration);
    });
  }

  function showMusicState() {
    toggle.setAttribute("aria-pressed", String(playingMusic));
    toggle.textContent = playingMusic ? "♫ Music on · tap to mute" : "♫ Play soft piano";
    toggle.setAttribute("aria-label", playingMusic ? "Mute soft piano melody" : "Play optional soft piano melody");
  }

  function stopMusic() {
    playingMusic = false;
    if (phraseTimer !== null) {
      clearInterval(phraseTimer);
      phraseTimer = null;
    }
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.0001, context.currentTime, .12);
    }
    showMusicState();
  }

  async function startMusic() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      toggle.textContent = "Music unavailable on this browser";
      toggle.disabled = true;
      return;
    }
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = .0001;
        master.connect(context.destination);
      }
      await context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(.38, context.currentTime, .18);
      playingMusic = true;
      showMusicState();
      schedulePhrase();
      phraseTimer = setInterval(schedulePhrase, phraseLength * 1000);
    } catch {
      stopMusic();
      toggle.textContent = "Music unavailable";
    }
  }

  toggle.addEventListener("click", () => {
    if (playingMusic) stopMusic();
    else startMusic();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playingMusic) stopMusic();
  });
})();
