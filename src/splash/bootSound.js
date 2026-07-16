/**
 * bootSound.js
 * 
 * Elegant, minimal procedural boot sound for "Arcade OS".
 * Inspired by premium modern operating system interfaces (TRON UI, Windows 11, PS5).
 * Generates a clean, calm, blue holographic activation soundscape entirely via 
 * pure Web Audio API synthesis.
 */

export function playBootSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const startTime = ctx.currentTime + 0.02;

    // Master bus processing for high-fidelity smoothness
    const masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-15, startTime);
    masterCompressor.knee.setValueAtTime(4, startTime);
    masterCompressor.ratio.setValueAtTime(2.5, startTime);
    masterCompressor.attack.setValueAtTime(0.006, startTime);
    masterCompressor.release.setValueAtTime(0.06, startTime);
    masterCompressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, startTime);
    masterGain.connect(masterCompressor);

    // Short, bright, crystalline space impulse generation
    function createShimmerReverb() {
        const len = ctx.sampleRate * 0.5; // 0.5s short bright tail
        const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const data = buffer.getChannelData(c);
            for (let i = 0; i < len; i++) {
                const percent = i / len;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - percent, 4.0);
            }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = buffer;
        return convolver;
    }

    const reverbNode = createShimmerReverb();
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.22, startTime);
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterGain);

    // Audio routing utility
    function route(node, useReverb = true) {
        node.connect(masterGain);
        if (useReverb) node.connect(reverbNode);
    }

    // --- TIMELINE EVENTS ---

    /**
     * T = 0.00s: Tiny Digital Spark
     * High-frequency micro-transient initialization vector.
     */
    const tSpark = startTime + 0.00;
    const sparkOsc = ctx.createOscillator();
    const sparkFilter = ctx.createBiquadFilter();
    const sparkGain = ctx.createGain();

    sparkOsc.type = 'sine';
    sparkOsc.frequency.setValueAtTime(8500, tSpark);
    sparkOsc.frequency.linearRampToValueAtTime(11000, tSpark + 0.02);

    sparkFilter.type = 'bandpass';
    sparkFilter.frequency.setValueAtTime(9500, tSpark);
    sparkFilter.Q.setValueAtTime(8, tSpark);

    sparkGain.gain.setValueAtTime(0, tSpark);
    sparkGain.gain.linearRampToValueAtTime(0.18, tSpark + 0.002);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, tSpark + 0.025);

    sparkOsc.connect(sparkFilter);
    sparkFilter.connect(sparkGain);
    route(sparkGain, true);
    sparkOsc.start(tSpark);
    sparkOsc.stop(tSpark + 0.03);

    /**
     * T = 0.10s: Short Smooth Upward Synth Sweep
     * Light holographic rise establishing the interface canvas.
     */
    const tSweep = startTime + 0.10;
    const sweepOsc = ctx.createOscillator();
    const sweepFilter = ctx.createBiquadFilter();
    const sweepGain = ctx.createGain();
    const sweepPan = ctx.createStereoPanner();

    sweepOsc.type = 'triangle';
    sweepOsc.frequency.setValueAtTime(290, tSweep);
    sweepOsc.frequency.exponentialRampToValueAtTime(680, tSweep + 0.35);

    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(450, tSweep);
    sweepFilter.frequency.exponentialRampToValueAtTime(1200, tSweep + 0.35);

    sweepGain.gain.setValueAtTime(0, tSweep);
    sweepGain.gain.linearRampToValueAtTime(0.24, tSweep + 0.15);
    sweepGain.gain.linearRampToValueAtTime(0.08, tSweep + 0.30);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, tSweep + 0.38);

    sweepPan.pan.setValueAtTime(-0.4, tSweep);
    sweepPan.pan.linearRampToValueAtTime(0.1, tSweep + 0.35);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepPan);
    sweepPan.connect(sweepGain);
    route(sweepGain, false);
    sweepOsc.start(tSweep);
    sweepOsc.stop(tSweep + 0.40);

    /**
     * T = 0.40s: Soft Laser Scan (Left to Right)
     * Fluid vector beam tracing elements across the stereo field.
     */
    const tScan = startTime + 0.40;
    const scanOsc = ctx.createOscillator();
    const scanFilter = ctx.createBiquadFilter();
    const scanGain = ctx.createGain();
    const scanPan = ctx.createStereoPanner();

    scanOsc.type = 'sine';
    scanOsc.frequency.setValueAtTime(1600, tScan);
    scanOsc.frequency.exponentialRampToValueAtTime(880, tScan + 0.30);

    scanFilter.type = 'bandpass';
    scanFilter.frequency.setValueAtTime(1400, tScan);
    scanFilter.frequency.exponentialRampToValueAtTime(950, tScan + 0.30);
    scanFilter.Q.setValueAtTime(3, tScan);

    scanGain.gain.setValueAtTime(0, tScan);
    scanGain.gain.linearRampToValueAtTime(0.20, tScan + 0.05);
    scanGain.gain.exponentialRampToValueAtTime(0.0001, tScan + 0.32);

    scanPan.pan.setValueAtTime(-0.85, tScan);
    scanPan.pan.linearRampToValueAtTime(0.85, tScan + 0.30);

    scanOsc.connect(scanFilter);
    scanFilter.connect(scanPan);
    scanPan.connect(scanGain);
    route(scanGain, true);
    scanOsc.start(tScan);
    scanOsc.stop(tScan + 0.35);

    /**
     * T = 0.80s: Subtle Low Pulse
     * Grounding the environment with a calm, premium low-end stabilizing cycle.
     */
    const tPulse = startTime + 0.80;
    const pulseOsc = ctx.createOscillator();
    const pulseGain = ctx.createGain();

    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(82.41, tPulse); // E2 frequency, deep and clean

    pulseGain.gain.setValueAtTime(0, tPulse);
    pulseGain.gain.linearRampToValueAtTime(0.40, tPulse + 0.02);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, tPulse + 0.45);

    pulseOsc.connect(pulseGain);
    route(pulseGain, false);
    pulseOsc.start(tPulse);
    pulseOsc.stop(tPulse + 0.50);

    /**
     * T = 1.10s: Clean Crystalline Confirmation Ping
     * The focused elegant peak. Pristine sinusoidal tones that resolve the initialization.
     */
    const tPing = startTime + 1.10;
    const pingFreqs = [2093.00, 2793.83]; // Pure intervals (C7 and F7)
    
    pingFreqs.forEach((freq, idx) => {
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();
        const pingPan = ctx.createStereoPanner();

        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(freq, tPing + (idx * 0.004));

        pingGain.gain.setValueAtTime(0, tPing);
        pingGain.gain.linearRampToValueAtTime(0.32 - (idx * 0.06), tPing + 0.012);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, tPing + 0.42);

        pingPan.pan.setValueAtTime(idx === 0 ? -0.25 : 0.25, tPing);

        pingOsc.connect(pingPan);
        pingPan.connect(pingGain);
        route(pingGain, true);
        
        pingOsc.start(tPing);
        pingOsc.stop(tPing + 0.45);
    });

    // --- LIFE CYCLE TEARDOWN ---
    const runDurationMs = 1750;
    setTimeout(() => {
        ctx.close().catch((err) => console.error(err));
    }, runDurationMs);
}