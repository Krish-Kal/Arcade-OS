import React, { useEffect, useRef, useState } from "react";
import "./Splash.css";
import { playBootSound } from "./bootSound";

// Import the logo asset natively via Vite
import logoImage from "../assets/icon.png";

/**
 * Arcade KERNEL — System Initialization Splash
 * ------------------------------------------------------------
 * Concept: this is not "a logo playing an animation." The visual
 * language reads as a system activating — a digital core forms,
 * a thin geometric interface constructs itself around it, the
 * logo resolves out of that interface, and the interface then
 * retracts, leaving only the logo + wordmark before the whole
 * thing hands off to the main application.
 *
 * Mount this as the root of a DEDICATED splash BrowserWindow's
 * renderer (see splash-main.jsx). It does not make the window
 * itself transparent/frameless — that's main-process config.
 *
 * Requires a preload bridge:
 *   window.splashAPI.notifyAnimationReady()
 * If absent (e.g. running standalone in a browser), it's a no-op.
 * ------------------------------------------------------------
 */

const WORDMARK = "ARCADE KERNEL";

// Boot sequence timeline (ms).
const TIMELINE = [
  { phase: "core", at: 0 },
  { phase: "construct", at: 250 },
  { phase: "scan", at: 900 },
  { phase: "resolve", at: 1450 },
  { phase: "retract", at: 2100 },
  { phase: "identity", at: 2550 },
  { phase: "stabilize", at: 3000 },
  { phase: "powerdown", at: 3400 },
  { phase: "exit", at: 3700 }
];

const TOTAL_DURATION = 4000;
const READY_SIGNAL_PHASE = "stabilize"; // minimum-duration gate

export default function Splash() {
  const [phase, setPhase] = useState("idle");
  const timers = useRef([]);
  const notifiedRef = useRef(false);

  useEffect(() => {
      playBootSound();
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      timers.current.push(setTimeout(() => setPhase("resolve"), 30));
      timers.current.push(setTimeout(() => setPhase("identity"), 500));
      timers.current.push(
        setTimeout(() => {
          setPhase("stabilize");
          notifyReady();
        }, 1100)
      );
      timers.current.push(setTimeout(() => setPhase("exit"), 1600));
    } else {
      TIMELINE.forEach(({ phase: p, at }) => {
        timers.current.push(
          setTimeout(() => {
            setPhase(p);
            if (p === READY_SIGNAL_PHASE) notifyReady();
          }, at)
        );
      });
    }

    // Safety net so Electron never hangs waiting on a signal.
    timers.current.push(setTimeout(notifyReady, TOTAL_DURATION));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  function notifyReady() {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    if (window.splashAPI?.notifyAnimationReady) {
      window.splashAPI.notifyAnimationReady();
    }
  }

  return (
    <div className={`arcade-boot phase-${phase}`}>
      {/* digital core */}
      <div className="core-point" />

      {/* rotating precision rings — finite animation, not a loop */}
      <svg className="rings" viewBox="0 0 200 200" aria-hidden="true">
<circle className="ring ring-outer" cx="100" cy="100" r="92" />
<circle className="ring ring-inner" cx="100" cy="100" r="72" />
      </svg>

      {/* thin geometric interface frame */}
      <svg className="frame" viewBox="0 0 200 200" aria-hidden="true">
        <rect
          className="frame-rect"
          x="40"
          y="40"
          width="120"
          height="120"
          rx="2"
        />
        <line className="frame-tick tick-top" x1="100" y1="10" x2="100" y2="28" />
        <line className="frame-tick tick-bottom" x1="100" y1="172" x2="100" y2="190" />
        <line className="frame-tick tick-left" x1="10" y1="100" x2="28" y2="100" />
        <line className="frame-tick tick-right" x1="172" y1="100" x2="190" y2="100" />
      </svg>

      {/* scan sweep */}
      <div className="scan-line" />

      {/* segmented indicators */}
      <div className="indicators">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="indicator" style={{ "--i": i }} />
        ))}
      </div>

      {/* logo */}
      <div className="logo-wrap">
        <img className="logo-img" src={logoImage} alt="" draggable={false} />
      </div>

      {/* wordmark — single elegant wipe reveal, no per-letter typing */}
      <div className="wordmark-wrap" aria-hidden="true">
        <span className="wordmark-text">{WORDMARK}</span>
      </div>
    </div>
  );
}