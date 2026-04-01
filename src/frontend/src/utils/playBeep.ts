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

export function playBeep(frequency = 440, duration = 0.25, volume = 0.12) {
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => _doBeep(frequency, duration, volume));
      return;
    }
    _doBeep(frequency, duration, volume);
  } catch {
    // Audio not available
  }
}

function _doBeep(frequency: number, duration: number, volume: number) {
  try {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + duration,
    );
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

function _doBeepAfterResume(
  frequency: number,
  duration: number,
  volume: number,
) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().then(() => _doBeep(frequency, duration, volume));
  } else {
    _doBeep(frequency, duration, volume);
  }
}

// Ascending C4-E4-G4 arpeggio
export function playStartSound(volume = 0.1) {
  if (!audioCtx) return;
  const notes = [261.63, 329.63, 392.0];
  notes.forEach((freq, i) => {
    setTimeout(() => _doBeepAfterResume(freq, 0.18, volume), i * 120);
  });
}

// Single soft chime E5
export function playResumeSound(volume = 0.09) {
  if (!audioCtx) return;
  _doBeepAfterResume(659.25, 0.3, volume);
}

// Descending G4-E4
export function playPauseSound(volume = 0.09) {
  if (!audioCtx) return;
  _doBeepAfterResume(392.0, 0.15, volume);
  setTimeout(() => _doBeepAfterResume(329.63, 0.15, volume), 150);
}

// Very quiet click
export function playTickSound() {
  if (!audioCtx) return;
  _doBeepAfterResume(800, 0.04, 0.04);
}

// Musical chime C5-E5-G5-C6
export function playMilestoneSound(volume = 0.1) {
  if (!audioCtx) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => _doBeepAfterResume(freq, 0.2, volume), i * 150);
  });
}

// Fanfare — ascending C4-E4-G4-C5 then held C5
export function playCompleteSound(volume = 0.12) {
  if (!audioCtx) return;
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((freq, i) => {
    setTimeout(() => _doBeepAfterResume(freq, 0.2, volume), i * 180);
  });
  // Held C5 at end
  setTimeout(() => _doBeepAfterResume(523.25, 0.6, volume), notes.length * 180);
}
