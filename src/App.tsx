import { useEffect, useMemo, useRef, useState } from "react";
import AstraforgeScene, { IntroPhase } from "./scene/AstraforgeScene";
import { useAstraforgeStore, useBadges } from "./state/useAstraforgeStore";
import type { Step } from "./state/useAstraforgeStore";
import html2canvas from "html2canvas";

type Page = "HOME" | "APPLICATION";

const useIntroSequence = () => {
  const [phase, setPhase] = useState<IntroPhase>("forming");

  useEffect(() => {
    const formMs = 4200;
    const holdMs = 2000;
    const dissolveMs = 3200;

    const holdTimer = window.setTimeout(() => setPhase("hold"), formMs);
    const dissolveTimer = window.setTimeout(() => setPhase("dissolve"), formMs + holdMs);
    const doneTimer = window.setTimeout(() => setPhase("done"), formMs + holdMs + dissolveMs);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(dissolveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return phase;
};

const steps = ["Profile", "Tasks", "Submission", "Status"];

export default function App() {
  const introPhase = useIntroSequence();
  const [page, setPage] = useState<Page>("HOME");
  const [confetti, setConfetti] = useState(false);
  const xp = useAstraforgeStore((state) => state.xp);
  const currentStep = useAstraforgeStore((state) => state.currentStep);
  const profileCompleted = useAstraforgeStore((state) => state.profileCompleted);
  const tasks = useAstraforgeStore((state) => state.tasks);
  const submitted = useAstraforgeStore((state) => state.submitted);
  const timeline = useAstraforgeStore((state) => state.timeline);
  const achievementLog = useAstraforgeStore((state) => state.achievementLog);
  const reduceMotion = useAstraforgeStore((state) => state.reduceMotion);
  const completionTimestamp = useAstraforgeStore((state) => state.completionTimestamp);
  const completeProfile = useAstraforgeStore((state) => state.completeProfile);
  const completeTask = useAstraforgeStore((state) => state.completeTask);
  const addTask = useAstraforgeStore((state) => state.addTask);
  const submitApplication = useAstraforgeStore((state) => state.submitApplication);
  const resetApplication = useAstraforgeStore((state) => state.resetApplication);
  const toggleReduceMotion = useAstraforgeStore((state) => state.toggleReduceMotion);
  const reconcileStep = useAstraforgeStore((state) => state.reconcileStep);
  const goToStep = useAstraforgeStore((state) => state.goToStep);
  const badges = useBadges();
  const lastXp = useRef(xp);
  const [xpPulse, setXpPulse] = useState(false);
  const [badgePulse, setBadgePulse] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [shareInProgress, setShareInProgress] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [showSystemOverview, setShowSystemOverview] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (xp > lastXp.current) {
      setXpPulse(true);
      const timer = window.setTimeout(() => setXpPulse(false), 800);
      lastXp.current = xp;
      return () => window.clearTimeout(timer);
    }
    lastXp.current = xp;
  }, [xp]);

  useEffect(() => {
    const newlyUnlocked = badges.find((badge) => badge.unlocked && badge.id !== badgePulse);
    if (newlyUnlocked) {
      setBadgePulse(newlyUnlocked.id);
      const timer = window.setTimeout(() => setBadgePulse(null), 1200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [badges, badgePulse]);

  useEffect(() => {
    reconcileStep();
  }, [profileCompleted, tasks, submitted, reconcileStep]);

  const progressPercent = useMemo(() => {
    const stepsCompleted = [
      profileCompleted,
      tasks.length > 0 && tasks.every((task) => task.completed),
      submitted
    ].filter(Boolean).length;
    return (stepsCompleted / 3) * 100;
  }, [profileCompleted, submitted, tasks]);

  const allTasksDone = useMemo(() => tasks.length > 0 && tasks.every((task) => task.completed), [tasks]);
  const maxStep = useMemo<Step>(() => {
    if (!profileCompleted) {
      return 1;
    }
    if (!allTasksDone) {
      return 2;
    }
    if (!submitted) {
      return 3;
    }
    return 4;
  }, [allTasksDone, profileCompleted, submitted]);

  const handleSubmit = () => {
    if (submitted || !allTasksDone) {
      return;
    }
    submitApplication();
    setConfetti(true);
    window.setTimeout(() => setConfetti(false), 1600);
  };

  const handleShareSnapshot = async () => {
    if (!snapshotRef.current) return;
    
    setShareInProgress(true);
    try {
      const canvas = await html2canvas(snapshotRef.current, {
        backgroundColor: "#05060b",
        scale: 2,
        logging: false,
        useCORS: true
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.95);
      });

      if (!blob) throw new Error("Failed to generate image");

      // Try Web Share API first
      if (navigator.share && navigator.canShare({ files: [new File([blob], "astraforge-completion.png", { type: "image/png" })] })) {
        await navigator.share({
          files: [new File([blob], "astraforge-completion.png", { type: "image/png" })],
          title: "ASTRAFORGE Application Completion",
          text: "I completed ASTRAFORGE! Check out my stellar energy achievement."
        });
      } else {
        // Fallback: Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "astraforge-completion.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Snapshot error:", error);
      alert("Snapshot generation failed. Please try again.");
    } finally {
      setShareInProgress(false);
    }
  };

  const handleResetApplication = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    resetApplication();
    setPage("HOME");
    setResetConfirm(false);
  };

  const handleExportSummary = () => {
    const stepsCompleted = [
      profileCompleted ? "Profile" : null,
      allTasksDone ? "Tasks" : null,
      submitted ? "Submission" : null
    ].filter((step): step is string => Boolean(step));
    const summary = {
      finalXP: xp,
      stepsCompleted,
      unlockedBadges: badges.filter(b => b.unlocked).map(b => b.label),
      completionTimestamp: completionTimestamp,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `astraforge-summary-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleReduceMotion = () => {
    toggleReduceMotion(!reduceMotion);
  };

  const handleAddTask = () => {
    addTask(newTaskLabel);
    setNewTaskLabel("");
  };

  return (
    <div className="app">
      {page === "HOME" ? (
        <>
          <AstraforgeScene introPhase={introPhase} />
          <div className="overlay">
            <div className={`intro-copy intro-copy--static${introPhase === "done" ? " intro-copy--hidden" : ""}`}>
              <div className="intro-title">ASTRAFORGE</div>
              <div className="intro-tagline">Forge your place among the stars.</div>
            </div>
            <button className="home-action" onClick={() => setPage("APPLICATION")}>
              Continue Application
            </button>
          </div>
        </>
      ) : (
        <div className={`application application-step-${currentStep}`}>
          <div className="application-header">
            <div>
              <div className="application-title">Application Control</div>
              <div className="application-subtitle">ASTRAFORGE mission workflow</div>
            </div>
            <div className="header-controls">
              <div className={`xp-counter${xpPulse ? " xp-counter--pulse" : ""}`}>Stellar Energy: {xp} XP</div>
              <label className="reduce-motion-toggle">
                <input 
                  type="checkbox" 
                  checked={reduceMotion} 
                  onChange={handleToggleReduceMotion}
                  aria-label="Reduce motion and animations"
                />
                <span>Reduce Motion</span>
              </label>
            </div>
          </div>

          <div className="stepper">
            {steps.map((label, index) => {
              const stepIndex = index + 1;
              const state = stepIndex < currentStep ? "done" : stepIndex === currentStep ? "active" : "idle";
              const isLocked = stepIndex > maxStep;
              return (
                <div
                  key={label}
                  className={`step step--${state}${isLocked ? " step--locked" : ""}`}
                  role="button"
                  tabIndex={isLocked ? -1 : 0}
                  onClick={() => {
                    if (!isLocked) {
                      goToStep(stepIndex as Step);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (isLocked) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      goToStep(stepIndex as Step);
                    }
                  }}
                >
                  <div className="step-index">{stepIndex}</div>
                  <div className="step-label">{label}</div>
                </div>
              );
            })}
          </div>

          <div className="application-grid">
            <div className="panel panel--form">
              {currentStep === 1 && (
                <>
                  <div className="panel-title">Profile</div>
                  <div className="panel-description">Introduce the operator behind the constellation.</div>
                  <div className="form-field">
                    <label>Name</label>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                  </div>
                  <div className="form-field">
                    <label>Focus</label>
                    <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Discipline" />
                  </div>
                  <button
                    className="application-button"
                    onClick={completeProfile}
                    disabled={profileCompleted || name.trim() === ""}
                  >
                    {profileCompleted ? "Profile Completed" : "Complete Profile"}
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="panel-title">Tasks</div>
                  <div className="panel-description">Complete each action to ignite new stars.</div>
                  <div className="task-add">
                    <input
                      value={newTaskLabel}
                      onChange={(event) => setNewTaskLabel(event.target.value)}
                      placeholder="Add a custom task"
                      aria-label="Add a custom task"
                    />
                    <button
                      className="application-button"
                      type="button"
                      onClick={handleAddTask}
                      disabled={submitted || newTaskLabel.trim() === ""}
                    >
                      Add Task
                    </button>
                  </div>
                  <div className="task-list">
                    {tasks.map((task) => (
                      <label key={task.id} className={`task-item${task.completed ? " task-item--done" : ""}`}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => completeTask(task.id)}
                          disabled={task.completed}
                        />
                        <span>{task.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="panel-title">Submission</div>
                  <div className="panel-description">Lock the constellation and submit your application.</div>
                  <button className="application-button" onClick={handleSubmit} disabled={submitted}>
                    {submitted ? "Submitted" : "Submit Application"}
                  </button>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="panel-title">Status</div>
                  <div className="panel-description">Your constellation is now archived.</div>
                  
                  <div className="snapshot-container" ref={snapshotRef}>
                    <div className="snapshot-header">
                      <div className="snapshot-branding">ASTRAFORGE</div>
                      <div className="snapshot-subtitle">Application Completion Certificate</div>
                    </div>
                    
                    <div className="snapshot-body">
                      <div className="snapshot-section">
                        <div className="snapshot-label">Stellar Energy Earned</div>
                        <div className="snapshot-value">{xp} XP</div>
                      </div>

                      <div className="snapshot-section">
                        <div className="snapshot-label">Achievements Unlocked</div>
                        <div className="snapshot-badges">
                          {badges.filter(b => b.unlocked).map(badge => (
                            <div key={badge.id} className="snapshot-badge">{badge.label}</div>
                          ))}
                        </div>
                      </div>

                      <div className="snapshot-section">
                        <div className="snapshot-label">Progress</div>
                        <div className="snapshot-progress">✓ 100% Complete</div>
                      </div>
                    </div>

                    <div className="snapshot-footer">
                      <div className="snapshot-timestamp">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <button 
                    className="application-button" 
                    onClick={handleShareSnapshot}
                    disabled={shareInProgress}
                  >
                    {shareInProgress ? "Generating..." : "Share Snapshot"}
                  </button>

                  <button 
                    className="application-button" 
                    onClick={handleExportSummary}
                  >
                    Export Summary
                  </button>

                  <button 
                    className="application-link" 
                    onClick={() => setShowSystemOverview(!showSystemOverview)}
                  >
                    {showSystemOverview ? "Hide" : "Show"} System Overview
                  </button>

                  {showSystemOverview && (
                    <div className="system-overview">
                      <div className="system-overview-section">
                        <div className="system-overview-title">How XP is Awarded</div>
                        <div className="system-overview-content">
                          Complete your profile: +20 XP<br/>
                          Complete each task: +10 XP per task<br/>
                          Submit your application: +30 XP
                        </div>
                      </div>

                      <div className="system-overview-section">
                        <div className="system-overview-title">How Badges Unlock</div>
                        <div className="system-overview-content">
                          Stellar Pioneer: 50 XP or more<br/>
                          Cosmic Navigator: 100 XP or more
                        </div>
                      </div>

                      <div className="system-overview-section">
                        <div className="system-overview-title">Progress System</div>
                        <div className="system-overview-content">
                          Each step builds on the previous one.<br/>
                          All progress is saved automatically.<br/>
                          Complete all steps to unlock the Status page.
                        </div>
                      </div>
                    </div>
                  )}

                  {achievementLog.length > 0 && (
                    <div className="achievement-log">
                      <div className="achievement-log-title">Achievement Log</div>
                      <div className="achievement-log-entries">
                        {achievementLog.map((entry) => (
                          <div key={entry.id} className={`achievement-log-entry achievement-log-entry--${entry.type}`}>
                            <div className="achievement-log-type">{entry.type}</div>
                            <div className="achievement-log-label">{entry.label}</div>
                            {entry.xp && <div className="achievement-log-xp">+{entry.xp} XP</div>}
                            <div className="achievement-log-timestamp">{new Date(entry.timestamp).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="panel panel--progress">
              <div className="panel-title">Progress</div>
              <div className="progress-ring">
                <svg viewBox="0 0 120 120">
                  <circle className="ring-bg" cx="60" cy="60" r="50" />
                  <circle
                    className="ring-progress"
                    cx="60"
                    cy="60"
                    r="50"
                    style={{
                      strokeDasharray: 314,
                      strokeDashoffset: 314 - (314 * progressPercent) / 100
                    }}
                  />
                </svg>
                <div className="progress-value">{Math.round(progressPercent)}%</div>
              </div>
              <div className="badge-gallery">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`badge${badge.unlocked ? " badge--unlocked" : ""}${
                      badgePulse === badge.id ? " badge--pulse" : ""
                    }`}
                  >
                    <div className="badge-title">{badge.label}</div>
                    <div className="badge-status">{badge.unlocked ? "Unlocked" : "Locked"}</div>
                  </div>
                ))}
              </div>

              {submitted && timeline.length > 0 && (
                <div className="timeline">
                  <div className="timeline-title">Application Timeline</div>
                  <div className="timeline-entries">
                    {timeline.map((entry, index) => (
                      <div key={entry.id} className="timeline-entry" style={{ animationDelay: `${index * 0.15}s` }}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-label">{entry.label}</div>
                          <div className="timeline-xp">+{entry.xp} XP</div>
                        </div>
                      </div>
                    ))}
                    <div className="timeline-entry timeline-entry--total" style={{ animationDelay: `${timeline.length * 0.15}s` }}>
                      <div className="timeline-dot timeline-dot--final" />
                      <div className="timeline-content">
                        <div className="timeline-label">Total Stellar Energy</div>
                        <div className="timeline-xp">{xp} XP</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="application-footer">
            <button className="application-link" onClick={() => setPage("HOME")}>
              Return to HOME
            </button>
            <div className="reset-container">
              <button className="application-link" onClick={handleResetApplication}>
                Reset Application
              </button>
              {resetConfirm && (
                <div className="reset-confirm">
                  Click again to confirm reset.
                </div>
              )}
            </div>
          </div>

          {confetti && !reduceMotion && (
            <div className="confetti">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={`confetti-${index}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

