import React, { useState, useRef } from "react";
import { Database, AlertTriangle } from "lucide-react";
import { useStore } from "../store/useStore";

export default function ControlPanel() {
  const store = useStore();

  const games = store.games || [];
  const apps = store.apps || [];
  const clearLibrary = store.clearLibrary || (() => {});

  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const startHold = () => {
    let value = 0;

    intervalRef.current = setInterval(() => {
      value += 4;
      setProgress(value);

      if (value >= 100) {
        clearInterval(intervalRef.current);
        clearLibrary();
        setProgress(0);
      }
    }, 40);
  };

  const cancelHold = () => {
    clearInterval(intervalRef.current);
    setProgress(0);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <Database size={20} />
          <h1 style={styles.title}>CONTROL PANEL</h1>
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
                  background: `conic-gradient(#ef4444 ${progress}%, transparent ${progress}%)`
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
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    height: "100%",
    background:
      "radial-gradient(circle at top, #020617, #000000 80%)",
    color: "#e5e7eb",
  },

  container: {
    maxWidth: 720,
    margin: "auto",
    padding: "50px 24px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 50,
  },

  title: {
    fontSize: 22,
    letterSpacing: "0.2em",
    fontWeight: "600",
  },

  card: {
    marginBottom: 30,
    padding: 24,
    borderRadius: 18,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 0 40px rgba(0,0,0,0.6)",
  },

  sectionTitle: {
    fontSize: 11,
    letterSpacing: "0.18em",
    color: "#64748b",
    marginBottom: 20,
  },

  stats: {
    display: "flex",
    gap: 20,
  },

  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 14,
    textAlign: "center",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "inset 0 0 20px rgba(255,255,255,0.03)",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "700",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  statLabel: {
    fontSize: 11,
    color: "#64748b",
  },

  dangerCard: {
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.05)",
  },

  resetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dangerText: {
    fontSize: 13,
    color: "#fca5a5",
  },

  holdWrapper: {
    position: "relative",
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  progressRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    filter: "blur(6px)",
    opacity: 0.9,
    transition: "0.1s",
  },

  resetBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background:
      "linear-gradient(135deg,#ef4444,#dc2626)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    boxShadow:
      "0 0 20px rgba(239,68,68,0.6), inset 0 0 10px rgba(255,255,255,0.2)",
    transition: "0.2s",
  },
};