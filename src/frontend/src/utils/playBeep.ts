let audioCtx: AudioContext | null = null;

export function initAudioContext() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    } else if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch {
    // Audio not available
  }
}

export function playBeep() {
  try {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.2,
    );
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch {
    // Audio not available
  }
}
