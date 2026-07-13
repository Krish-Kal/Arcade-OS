import React, { useEffect, useState, useRef } from "react";
import { Database, AlertTriangle } from "lucide-react";
import { useStore } from "../store/useStore";

export default function ControlPanel() {
  const games = useStore(state => state.games) || [];
  const apps = useStore(state => state.apps) || [];
  const clearLibrary = useStore(state => state.clearLibrary) || (() => {});

  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const startHold = () => {
    let value = 0;

    intervalRef.current = setInterval(() => {
      value += 4;
      setProgress(value);

      if (value >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        clearLibrary();
        setProgress(0);
      }
    }, 40);
  };

  const cancelHold = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setProgress(0);
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={styles.page}>
      {/* ambient glow */}
      <div style={styles.ambientA} />
      <div style={styles.ambientB} />

      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <Database size={18} />
          </div>

          <div>
            <div style={styles.eyebrow}>SYSTEM MANAGEMENT</div>
            <h1 style={styles.title}>CONTROL PANEL</h1>
          </div>
        </div>

        {/* STATS */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>LIBRARY STATUS</div>

          <div style={styles.stats}>
            <Stat label="Games" value={games.length} />
            <Stat label="Apps" value={apps.length} />
            <Stat label="Total" value={games.length + apps.length} />
          </div>
        </div>

        {/* RESET */}
        <div style={{ ...styles.card, ...styles.dangerCard }}>
          <div style={styles.sectionTitle}>SYSTEM RESET</div>

          <div style={styles.resetRow}>
            <div style={styles.dangerText}>
              Hold to permanently clear your library
            </div>

            <div
              style={styles.holdWrapper}
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
            >
              <div
                style={{
                  ...styles.progressRing,
                  background: `conic-gradient(rgba(239,68,68,0.95) ${progress}%, transparent ${progress}%)`,
                }}
              />

              <button style={styles.resetBtn}>
                <AlertTriangle size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function Stat({ label, value }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statGlow} />

      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    position: "relative",
    height: "100%",
    overflow: "hidden",

    /* REMOVED solid opaque background */
    background: "transparent",

    color: "#e5e7eb",
    backdropFilter: "blur(12px) saturate(135%)",
    WebkitBackdropFilter: "blur(12px) saturate(135%)",
  },

  /* ambient glows */
  ambientA: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "rgba(91,140,255,0.14)",
    filter: "blur(58px)",
    pointerEvents: "none",
  },

  ambientB: {
    position: "absolute",
    right: -100,
    bottom: -100,
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "rgba(139,92,246,0.12)",
    filter: "blur(58px)",
    pointerEvents: "none",
  },

  container: {
    position: "relative",
    zIndex: 2,
    maxWidth: 760,
    margin: "auto",
    padding: "56px 26px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 46,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,

    background: `
      linear-gradient(
        145deg,
        rgba(255,255,255,0.08),
        rgba(255,255,255,0.02)
      ),
      rgba(7,9,22,0.32)
    `,

    border: "1px solid rgba(255,255,255,0.08)",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",

    boxShadow:
      "0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: "0.22em",
    color: "#7c86b2",
    marginBottom: 4,
  },

  title: {
    fontSize: 24,
    letterSpacing: "0.18em",
    fontWeight: "700",
    color: "#f3f6ff",
  },

  card: {
    position: "relative",
    overflow: "hidden",

    marginBottom: 30,
    padding: 26,
    borderRadius: 24,

    background: `
      linear-gradient(
        145deg,
        rgba(255,255,255,0.06) 0%,
        rgba(255,255,255,0.015) 100%
      ),
      rgba(7,9,22,0.28)
    `,

    border: "1px solid rgba(255,255,255,0.08)",

    backdropFilter: "blur(18px) saturate(150%)",
    WebkitBackdropFilter: "blur(18px) saturate(150%)",

    boxShadow:
      "0 18px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
  },

  sectionTitle: {
    fontSize: 11,
    letterSpacing: "0.18em",
    color: "#7b85ad",
    marginBottom: 22,
  },

  stats: {
    display: "flex",
    gap: 20,
  },

  statBox: {
    position: "relative",
    overflow: "hidden",

    flex: 1,
    padding: 22,
    borderRadius: 18,
    textAlign: "center",

    background: `
      linear-gradient(
        145deg,
        rgba(255,255,255,0.05),
        rgba(255,255,255,0.01)
      ),
      rgba(11,16,34,0.24)
    `,

    border: "1px solid rgba(255,255,255,0.06)",

    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",

    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 30px rgba(0,0,0,0.18)",
  },

  statGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top, rgba(91,140,255,0.12), transparent 70%)",
    pointerEvents: "none",
  },

  statValue: {
    position: "relative",
    zIndex: 2,

    fontSize: 30,
    fontWeight: "700",

    background: "linear-gradient(135deg,#dbe4ff,#8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",

    textShadow: "0 0 30px rgba(139,92,246,0.18)",
  },

  statLabel: {
    position: "relative",
    zIndex: 2,

    marginTop: 6,
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "#7b85ad",
  },

  dangerCard: {
    border: "1px solid rgba(239,68,68,0.18)",

    background: `
      linear-gradient(
        145deg,
        rgba(239,68,68,0.08),
        rgba(239,68,68,0.02)
      ),
      rgba(7,9,22,0.26)
    `,
  },

  resetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },

  dangerText: {
    fontSize: 13,
    color: "#f5b1b1",
    lineHeight: 1.6,
  },

  holdWrapper: {
    position: "relative",
    width: 62,
    height: 62,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    cursor: "pointer",
  },

  progressRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    filter: "blur(7px)",
    opacity: 0.9,
    transition: "0.1s linear",
  },

  resetBtn: {
    position: "relative",
    zIndex: 2,

    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.10)",

    background: `
      linear-gradient(
        145deg,
        rgba(255,255,255,0.12),
        rgba(255,255,255,0.03)
      ),
      linear-gradient(
        135deg,
        rgba(239,68,68,0.85),
        rgba(220,38,38,0.75)
      )
    `,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    color: "#fff",

    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",

    boxShadow:
      "0 0 26px rgba(239,68,68,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",

    transition: "0.2s ease",
  },
};
