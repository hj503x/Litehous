import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Plus, X, Flame, Anchor, Archive, Info } from "lucide-react";

const RANKS = [
  { min: 0, name: "Cadet Keeper", color: "#F2A65A" },
  { min: 120, name: "Keeper", color: "#F2C14E" },
  { min: 360, name: "Senior Keeper", color: "#8FD9C4" },
  { min: 800, name: "Harbor Master", color: "#7EC8E3" },
  { min: 1600, name: "Beacon Master", color: "#C9A6E8" },
  { min: 3200, name: "Keeper of the Old Light", color: "#FFE9A8" },
];

const BASE = {
  bg: "#0B1D2E",
  panel: "#13293D",
  panelLight: "#1B3A52",
  rust: "#C1502E",
  teal: "#4F8A8B",
  mist: "#F4EFE6",
  mistDim: "#AAB9C2",
};

const DURATIONS = [25, 45, 60];
const STORAGE_KEY = "litehous-state-v2";

function getRankInfo(oil) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (oil >= RANKS[i].min) idx = i;
  }
  const current = RANKS[idx];
  const next = RANKS[idx + 1] || null;
  const progress = next
    ? Math.min(100, Math.round(((oil - current.min) / (next.min - current.min)) * 100))
    : 100;
  return { current, next, progress };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function last28Days() {
  const out = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (e) {
    // audio not available, ignore
  }
}

export default function Litehous() {
  const [loaded, setLoaded] = useState(false);
  const [oil, setOil] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [activityDates, setActivityDates] = useState([]);
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const intervalRef = useRef(null);
  const saveTimeout = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setOil(data.oil ?? 0);
        setTasks(data.tasks ?? []);
        setArchivedCount(data.archivedCount ?? 0);
        setStreak(data.streak ?? 0);
        setLastActiveDate(data.lastActiveDate ?? null);
        setActivityDates(data.activityDates ?? []);
        setDuration(data.duration ?? 25);
        setSecondsLeft((data.duration ?? 25) * 60);
        setHelpDismissed(data.helpDismissed ?? false);
      }
    } catch (e) {
      // fresh start, or localStorage unavailable (private browsing etc.)
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            oil,
            tasks,
            archivedCount,
            streak,
            lastActiveDate,
            activityDates,
            duration,
            helpDismissed,
          })
        );
      } catch (e) {
        // best effort
      }
    }, 400);
    return () => clearTimeout(saveTimeout.current);
  }, [oil, tasks, archivedCount, streak, lastActiveDate, activityDates, duration, helpDismissed, loaded]);

  const markActiveToday = useCallback(() => {
    const today = todayStr();
    setActivityDates((prev) => (prev.includes(today) ? prev : [...prev, today].slice(-60)));
    setLastActiveDate((prevDate) => {
      if (prevDate === today) return prevDate;
      if (prevDate) {
        const gap = daysBetween(prevDate, today);
        if (gap === 1) setStreak((s) => s + 1);
        else if (gap > 1) setStreak(1);
        else setStreak((s) => Math.max(s, 1));
      } else {
        setStreak(1);
      }
      return today;
    });
  }, []);

  const awardOil = useCallback(
    (amount, message) => {
      setOil((o) => o + amount);
      markActiveToday();
      setFlash(message);
      setTimeout(() => setFlash(null), 2200);
    },
    [markActiveToday]
  );

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setPulse(true);
            playChime();
            setTimeout(() => setPulse(false), 1300);
            awardOil(duration, `Watch complete — +${duration} oil`);
            return duration * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, duration, awardOil]);

  const handleStartPause = () => setRunning((r) => !r);

  const handleResetClick = () => {
    const inProgress = running || secondsLeft !== duration * 60;
    if (!inProgress) return;
    if (!resetArmed) {
      setResetArmed(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    setRunning(false);
    setSecondsLeft(duration * 60);
    setResetArmed(false);
    if (resetTimer.current) clearTimeout(resetTimer.current);
  };

  const handleDuration = (d) => {
    if (running) return;
    setDuration(d);
    setSecondsLeft(d * 60);
  };

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    setTasks((t) => [...t, { id: Date.now(), text, done: false }]);
    setNewTask("");
  };

  const toggleTask = (id) => {
    setTasks((t) =>
      t.map((task) => {
        if (task.id !== id) return task;
        const nowDone = !task.done;
        if (nowDone) awardOil(15, "Logbook entry recorded — +15 oil");
        return { ...task, done: nowDone };
      })
    );
  };

  const removeTask = (id) => setTasks((t) => t.filter((task) => task.id !== id));

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditingText(task.text);
  };

  const commitEdit = () => {
    const text = editingText.trim();
    setTasks((t) =>
      t.map((task) => (task.id === editingId ? { ...task, text: text || task.text } : task))
    );
    setEditingId(null);
    setEditingText("");
  };

  const archiveCompleted = () => {
    const doneCount = tasks.filter((t) => t.done).length;
    if (doneCount === 0) return;
    setTasks((t) => t.filter((task) => !task.done));
    setArchivedCount((c) => c + doneCount);
  };

  const rankInfo = getRankInfo(oil);
  const accent = rankInfo.current.color;
  const totalSeconds = duration * 60;
  const progressFrac = 1 - secondsLeft / totalSeconds;
  const sessionInProgress = secondsLeft !== totalSeconds;
  const sweepClass = running ? "active running" : sessionInProgress ? "active paused" : "";
  const lampClass = running ? "active" : sessionInProgress ? "dim" : "";
  const displayTasks = [...tasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  const doneCount = tasks.filter((t) => t.done).length;
  const activitySet = new Set(activityDates);

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${BASE.bg} 0%, #081420 100%)`,
        color: BASE.mist,
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "600px",
        borderRadius: "12px",
        overflow: "hidden",
        "--accent": accent,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap');
        .lk-display { font-family: 'Fraunces', serif; }
        .lk-beam-wrap { position: relative; width: 100%; height: 220px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
        .lk-sweep {
          position: absolute; top: 46px; left: 50%; width: 500px; height: 500px;
          transform-origin: 50% 0%; transform: translateX(-50%) rotate(-35deg);
          background: conic-gradient(from 0deg at 50% 0%, transparent 0deg, color-mix(in srgb, var(--accent) 30%, transparent) 20deg, transparent 40deg);
          animation: lk-sweep-anim 4s linear infinite;
          opacity: 0; transition: opacity 0.6s ease;
        }
        .lk-sweep.active.running { opacity: 1; animation-play-state: running; }
        .lk-sweep.active.paused { opacity: 0.28; animation-play-state: paused; }
        @keyframes lk-sweep-anim {
          0% { transform: translateX(-50%) rotate(-55deg); }
          50% { transform: translateX(-50%) rotate(55deg); }
          100% { transform: translateX(-50%) rotate(-55deg); }
        }
        .lk-lamp-glow { filter: drop-shadow(0 0 4px rgba(244,239,230,0.15)); transition: filter 0.6s ease, fill 0.6s ease; }
        .lk-lamp-glow.dim { filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 55%, transparent)); }
        .lk-lamp-glow.active { filter: drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 90%, transparent)) drop-shadow(0 0 40px color-mix(in srgb, var(--accent) 50%, transparent)); }
        .lk-pulse { animation: lk-pulse-anim 1.3s ease; }
        @keyframes lk-pulse-anim {
          0% { transform: scale(1); }
          25% { transform: scale(1.08); }
          50% { transform: scale(1); }
          70% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .lk-btn { font-family: 'Public Sans', sans-serif; border: none; cursor: pointer; transition: transform 0.15s ease, background 0.2s ease; }
        .lk-btn:active { transform: scale(0.96); }
        .lk-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .lk-task-check { width: 20px; height: 20px; border-radius: 4px; border: 2px solid ${BASE.teal}; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .lk-icon-btn { min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .lk-icon-btn:hover { background: rgba(255,255,255,0.06); }
        .lk-flash { animation: lk-flash-in 0.3s ease; }
        @keyframes lk-flash-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lk-dot { width: 9px; height: 9px; border-radius: 50%; }
        .lk-scroll::-webkit-scrollbar { width: 6px; }
        .lk-scroll::-webkit-scrollbar-thumb { background: ${BASE.panelLight}; border-radius: 3px; }
        .lk-bottom-grid { display: grid; grid-template-columns: minmax(160px, 220px) 1fr; gap: 1px; background: #0E2233; }
        @media (max-width: 560px) {
          .lk-bottom-grid { grid-template-columns: 1fr; }
        }
        .lk-help { background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px 4px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Anchor size={20} color={accent} />
          <span className="lk-display" style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "0.2px" }}>
            Litehous
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="lk-btn lk-icon-btn"
            onClick={() => setHelpDismissed((h) => !h)}
            style={{ background: "transparent", color: BASE.mistDim }}
            aria-label="How this works"
            title="How this works"
          >
            <Info size={16} />
          </button>
          <div style={{ textAlign: "right" }}>
            <div className="lk-display" style={{ fontSize: "15px", color: accent, fontWeight: 600 }}>
              {rankInfo.current.name}
            </div>
            <div style={{ fontSize: "12px", color: BASE.mistDim }}>{oil} oil banked</div>
          </div>
        </div>
      </div>

      {/* Help panel */}
      {!helpDismissed && (
        <div style={{ margin: "10px 28px 0" }}>
          <div className="lk-help" style={{ padding: "12px 14px", fontSize: "12.5px", color: BASE.mist, lineHeight: 1.6, position: "relative" }}>
            <button
              className="lk-icon-btn"
              onClick={() => setHelpDismissed(true)}
              style={{ position: "absolute", top: "4px", right: "4px", background: "transparent", color: BASE.mistDim, border: "none", cursor: "pointer" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
            <strong>Oil</strong> is earned by finishing a watch (session) or checking off a logbook entry. <strong>Streak</strong> counts consecutive days you did at least one of those. <strong>Rank</strong> rises with total oil — and the beam's color changes as you rank up.
          </div>
        </div>
      )}

      {/* Rank progress bar */}
      <div style={{ padding: "12px 28px 0" }}>
        <div style={{ height: "5px", background: BASE.panel, borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${rankInfo.progress}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 55%, transparent), ${accent})`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        {rankInfo.next && (
          <div style={{ fontSize: "11px", color: BASE.mistDim, marginTop: "4px" }}>
            {rankInfo.next.min - oil} oil to {rankInfo.next.name}
          </div>
        )}
      </div>

      {/* Beam hero */}
      <div className="lk-beam-wrap">
        <div className={`lk-sweep ${sweepClass}`} />
        <svg width="140" height="200" viewBox="0 0 140 200" className={pulse ? "lk-pulse" : ""} style={{ position: "relative", zIndex: 2 }}>
          <path d="M20 200 L40 165 L100 165 L120 200 Z" fill="#0E2233" />
          <path d="M52 165 L58 55 L82 55 L88 165 Z" fill={BASE.panelLight} stroke="#0E2233" strokeWidth="1" />
          <rect x="54" y="90" width="32" height="14" fill={BASE.rust} opacity="0.85" />
          <rect x="55" y="130" width="30" height="14" fill={BASE.rust} opacity="0.85" />
          <rect x="55" y="38" width="30" height="18" fill="#0E2233" stroke={accent} strokeWidth="1.5" />
          <circle className={`lk-lamp-glow ${lampClass}`} cx="70" cy="47" r="7" fill={accent} />
          <path d="M50 38 L70 20 L90 38 Z" fill={BASE.rust} />
        </svg>
      </div>

      {/* Flash message */}
      <div style={{ textAlign: "center", height: "22px" }}>
        {flash && (
          <span className="lk-flash" style={{ fontSize: "13px", color: accent, fontWeight: 600, background: "rgba(255,255,255,0.06)", padding: "3px 12px", borderRadius: "999px" }}>
            {flash}
          </span>
        )}
      </div>

      {/* Timer */}
      <div style={{ textAlign: "center", padding: "4px 28px 8px" }}>
        <div style={{ fontSize: "11px", color: BASE.mistDim, letterSpacing: "0.3px", height: "16px" }}>
          {running ? "Watch in progress" : sessionInProgress ? "Paused" : ""}
        </div>
        <div className="lk-display" style={{ fontSize: "56px", fontWeight: 600, lineHeight: 1, color: running ? accent : BASE.mist, fontVariantNumeric: "tabular-nums" }}>
          {formatTime(secondsLeft)}
        </div>
        <div style={{ height: "3px", background: BASE.panel, borderRadius: "2px", margin: "10px auto 0", maxWidth: "260px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, progressFrac * 100)}%`, background: accent, transition: "width 1s linear" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          {DURATIONS.map((d) => (
            <button
              key={d}
              className="lk-btn"
              disabled={running}
              onClick={() => handleDuration(d)}
              style={{
                background: duration === d ? accent : BASE.panel,
                color: duration === d ? "#0B1D2E" : BASE.mistDim,
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "999px",
              }}
            >
              {d}m
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
          <button
            className="lk-btn"
            onClick={handleStartPause}
            style={{ background: accent, color: "#0B1D2E", fontWeight: 700, fontSize: "14px", padding: "11px 26px", borderRadius: "999px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Light the Lamp"}
          </button>
          <button
            className="lk-btn"
            onClick={handleResetClick}
            disabled={!sessionInProgress}
            style={{
              background: resetArmed ? BASE.rust : "transparent",
              color: resetArmed ? BASE.mist : BASE.mistDim,
              border: `1px solid ${resetArmed ? BASE.rust : BASE.panelLight}`,
              padding: "11px 16px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
            }}
            aria-label="Reset timer"
          >
            <RotateCcw size={16} />
            {resetArmed && "Confirm?"}
          </button>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="lk-bottom-grid" style={{ marginTop: "12px" }}>
        {/* Streak panel */}
        <div style={{ background: BASE.panel, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <Flame size={16} color={streak > 0 ? BASE.rust : BASE.mistDim} />
            <span className="lk-display" style={{ fontSize: "14px", fontWeight: 600 }}>
              {streak} night{streak === 1 ? "" : "s"} lit
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", maxWidth: "180px" }}>
            {last28Days().map((day) => (
              <span
                key={day}
                className="lk-dot"
                title={day}
                style={{ background: activitySet.has(day) ? BASE.rust : BASE.panelLight }}
              />
            ))}
          </div>
          <p style={{ fontSize: "11.5px", color: BASE.mistDim, marginTop: "12px", lineHeight: 1.5 }}>
            Last 28 days. Finish a watch or an entry each day to keep the light burning.
          </p>
        </div>

        {/* Logbook panel */}
        <div style={{ background: BASE.panel, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="lk-display" style={{ fontSize: "14px", fontWeight: 600 }}>
              Keeper's Logbook
            </span>
            {archivedCount > 0 && (
              <span style={{ fontSize: "11px", color: BASE.mistDim }}>{archivedCount} archived</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Record a task..."
              style={{ flex: 1, background: BASE.bg, border: `1px solid ${BASE.panelLight}`, borderRadius: "8px", padding: "8px 12px", color: BASE.mist, fontSize: "13px", outline: "none" }}
            />
            <button className="lk-btn" onClick={addTask} style={{ background: BASE.teal, color: "#0B1D2E", borderRadius: "8px", padding: "0 12px", display: "flex", alignItems: "center" }} aria-label="Add task">
              <Plus size={16} />
            </button>
          </div>

          <div className="lk-scroll" style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {displayTasks.length === 0 && (
              <p style={{ fontSize: "12.5px", color: BASE.mistDim }}>The log is empty. Add what needs doing tonight.</p>
            )}
            {displayTasks.map((task) => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="lk-task-check" onClick={() => toggleTask(task.id)}>
                  {task.done && <span style={{ color: BASE.teal, fontSize: "13px" }}>✓</span>}
                </div>
                {editingId === task.id ? (
                  <input
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                    onBlur={commitEdit}
                    style={{ flex: 1, background: BASE.bg, border: `1px solid ${BASE.panelLight}`, borderRadius: "6px", padding: "4px 8px", color: BASE.mist, fontSize: "13.5px", outline: "none" }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => !task.done && startEdit(task)}
                    style={{ flex: 1, fontSize: "13.5px", color: task.done ? BASE.mistDim : BASE.mist, textDecoration: task.done ? "line-through" : "none", cursor: task.done ? "default" : "text" }}
                    title={task.done ? "" : "Double-click to edit"}
                  >
                    {task.text}
                  </span>
                )}
                <button className="lk-btn lk-icon-btn" onClick={() => removeTask(task.id)} style={{ background: "transparent", color: BASE.mistDim }} aria-label="Remove task">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {doneCount > 0 && (
            <button
              className="lk-btn"
              onClick={archiveCompleted}
              style={{ marginTop: "12px", background: "transparent", border: `1px solid ${BASE.panelLight}`, color: BASE.mistDim, borderRadius: "8px", padding: "7px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Archive size={13} /> Archive {doneCount} completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
