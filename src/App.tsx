import { useEffect, useMemo, useRef, useState } from "react";
import AstraforgeScene, { IntroPhase } from "./scene/AstraforgeScene";
import { AchievementPopup, AuthModal, GlitchCard, HomeAuthControls, SaveIndicator, UserProfileBar } from "./components";
import type { AchievementPopupData } from "./components/AchievementPopup";
import {
  addXp,
  fetchProgress,
  fetchUserDataRequest,
  loginRequest,
  saveUserDataRequest,
  signupRequest,
  type BackendUserData,
  type ProgressData
} from "./integration/authApi";
import { useAstraforgeStore, useBadges } from "./state/useAstraforgeStore";
import type { AstraforgeState, Step, TaskSet } from "./state/useAstraforgeStore";
import { useFeatureFlags } from "./state/featureFlags";
import { getUserLevel } from "./utils/gamification";
import html2canvas from "html2canvas";

type Page = "HOME" | "APPLICATION";
const AUTH_STORAGE_KEY = "user";

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

const createFallbackMission = (index = 1): TaskSet => {
  const now = Date.now();
  return {
    id: `mission-${now}`,
    title: `Mission ${index}`,
    tasks: [],
    completed: false,
    xpEarned: 0,
    completedAt: null,
    submittedAt: null
  };
};

export default function App() {
  const introPhase = useIntroSequence();
  const [page, setPage] = useState<Page>("HOME");
  const [authMode, setAuthMode] = useState<"LOGIN" | "SIGNUP" | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [achievementQueue, setAchievementQueue] = useState<AchievementPopupData[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<AchievementPopupData | null>(null);
  const [confetti, setConfetti] = useState(false);
  const totalXP = useAstraforgeStore((state: AstraforgeState) => state.totalXP);
  const currentStep = useAstraforgeStore((state: AstraforgeState) => state.currentStep);
  const profileCompleted = useAstraforgeStore((state: AstraforgeState) => state.profileCompleted);
  const taskSets = useAstraforgeStore((state: AstraforgeState) => state.taskSets);
  const activeTaskSetId = useAstraforgeStore((state: AstraforgeState) => state.activeTaskSetId);
  const achievementLog = useAstraforgeStore((state: AstraforgeState) => state.achievementLog);
  const currentStreak = useAstraforgeStore((state: AstraforgeState) => state.currentStreak);
  const longestStreak = useAstraforgeStore((state: AstraforgeState) => state.longestStreak);
  const personalityType = useAstraforgeStore((state: AstraforgeState) => state.personalityType);
  const personalityDerivedAt = useAstraforgeStore((state: AstraforgeState) => state.personalityDerivedAt);
  const reduceMotion = useAstraforgeStore((state: AstraforgeState) => state.reduceMotion);
  const completeProfile = useAstraforgeStore((state: AstraforgeState) => state.completeProfile);
  const completeTask = useAstraforgeStore((state: AstraforgeState) => state.completeTask);
  const addTask = useAstraforgeStore((state: AstraforgeState) => state.addTask);
  const submitApplication = useAstraforgeStore((state: AstraforgeState) => state.submitApplication);
  const addNewMission = useAstraforgeStore((state: AstraforgeState) => state.addNewMission);
  const resetActiveMissionTasks = useAstraforgeStore((state: AstraforgeState) => state.resetActiveMissionTasks);
  const resetAll = useAstraforgeStore((state: AstraforgeState) => state.resetAll);
  const toggleReduceMotion = useAstraforgeStore((state: AstraforgeState) => state.toggleReduceMotion);
  const reconcileStep = useAstraforgeStore((state: AstraforgeState) => state.reconcileStep);
  const goToStep = useAstraforgeStore((state: AstraforgeState) => state.goToStep);
  const badges = useBadges();
  const featureFlags = useFeatureFlags();
  const lastXp = useRef(totalXP);
  const [xpPulse, setXpPulse] = useState(false);
  const [badgePulse, setBadgePulse] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [shareInProgress, setShareInProgress] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [expandedTaskSets, setExpandedTaskSets] = useState<Record<string, boolean>>({});
  const [showSystemOverview, setShowSystemOverview] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const lastAchievementIndexRef = useRef<number | null>(null);
  const syncedXpRef = useRef<number | null>(null);

  const activeTaskSet = useMemo(
    () => taskSets.find((taskSet) => taskSet.id === activeTaskSetId) || taskSets[0],
    [taskSets, activeTaskSetId]
  );
  const completedTaskSets = useMemo(
    () => taskSets.filter((taskSet) => taskSet.completed),
    [taskSets]
  );
  const totalTasksCompleted = useMemo(
    () => taskSets.reduce((sum, taskSet) => sum + taskSet.tasks.filter((task) => task.completed).length, 0),
    [taskSets]
  );
  const averageXpPerMission = useMemo(() => {
    if (completedTaskSets.length === 0) {
      return 0;
    }
    const totalMissionXp = completedTaskSets.reduce((sum, taskSet) => sum + taskSet.xpEarned, 0);
    return Math.round(totalMissionXp / completedTaskSets.length);
  }, [completedTaskSets]);
  const mostProductiveDay = useMemo(() => {
    if (achievementLog.length === 0) {
      return null;
    }
    const dayTotals: Record<string, number> = {};
    for (const entry of achievementLog) {
      if (!entry.xp) {
        continue;
      }
      const date = new Date(entry.timestamp);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;
      dayTotals[dayKey] = (dayTotals[dayKey] ?? 0) + entry.xp;
    }
    const sorted = Object.entries(dayTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      return null;
    }
    const [dayKey, xp] = sorted[0];
    return {
      dayLabel: new Date(`${dayKey}T00:00:00`).toLocaleDateString(),
      xp
    };
  }, [achievementLog]);
  const visibleLogEntries = useMemo(
    () => (showFullLog ? achievementLog : achievementLog.slice(0, 6)),
    [achievementLog, showFullLog]
  );
  const levelInfo = useMemo(() => getUserLevel(totalXP), [totalXP]);

  const hydrateStoreFromBackend = (data: BackendUserData | undefined) => {
    if (!data) {
      return;
    }

    useAstraforgeStore.setState((previous) => {
      const incomingTaskSets = Array.isArray(data.taskSets)
        ? (data.taskSets as AstraforgeState["taskSets"])
        : null;

      const fallbackMission = createFallbackMission(1);
      const nextTaskSets = incomingTaskSets && incomingTaskSets.length > 0
        ? incomingTaskSets
        : previous.taskSets.length > 0
          ? previous.taskSets
          : [fallbackMission];

      const nextActiveTaskSetId = nextTaskSets.some((taskSet) => taskSet.id === previous.activeTaskSetId)
        ? previous.activeTaskSetId
        : nextTaskSets[0].id;

      return {
        ...previous,
        totalXP: typeof data.totalXP === "number" ? data.totalXP : previous.totalXP,
        taskSets: nextTaskSets,
        activeTaskSetId: nextActiveTaskSetId,
        personalityType:
          typeof data.personality === "string"
            ? (data.personality as AstraforgeState["personalityType"])
            : previous.personalityType,
        personalityDerivedAt:
          typeof data.personality === "string" ? Date.now() : previous.personalityDerivedAt
      };
    });
  };

  useEffect(() => {
    if (taskSets.length > 0) {
      return;
    }

    const fallbackMission = createFallbackMission(1);
    useAstraforgeStore.setState((previous) => {
      if (previous.taskSets.length > 0) {
        return previous;
      }

      return {
        ...previous,
        taskSets: [fallbackMission],
        activeTaskSetId: fallbackMission.id
      };
    });
  }, [taskSets.length]);

  const hydrateProgressFromBackend = (data: ProgressData | undefined) => {
    if (!data) {
      return;
    }

    syncedXpRef.current = data.xp;

    useAstraforgeStore.setState((previous) => ({
      ...previous,
      totalXP: typeof data.xp === "number" ? data.xp : previous.totalXP,
      unlockedBadges: Array.isArray(data.badges) ? data.badges : previous.unlockedBadges
    }));
  };

  const handleSignup = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const payload = await signupRequest(signupUsername, signupPassword);
      setAuthSuccess(payload.message || "Signup successful. You can now log in.");
      setLoginUsername(signupUsername.trim());
      setSignupPassword("");
      setAuthMode("LOGIN");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      const loginPayload = await loginRequest(loginUsername, loginPassword);
      const username = loginPayload.data?.username || loginUsername.trim();

      const latestDataResponse = await fetchUserDataRequest(username);
      hydrateStoreFromBackend(latestDataResponse.data?.data || loginPayload.data?.data);
      const progressResponse = await fetchProgress(username);
      hydrateProgressFromBackend(progressResponse.data);

      setLoggedInUsername(username);
      window.localStorage.setItem(AUTH_STORAGE_KEY, username);
      setLoginPassword("");
      setAuthMode(null);
      setPage("APPLICATION");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    syncedXpRef.current = null;
    setLoggedInUsername(null);
    setAuthError("");
    setAuthSuccess("");
    setLoginPassword("");
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    resetAll();
    setPage("HOME");
  };

  const openLoginPage = () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthMode("LOGIN");
  };

  const openSignupPage = () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthMode("SIGNUP");
  };

  const closeAuthModal = () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(false);
    setAuthMode(null);
  };

  useEffect(() => {
    if (totalXP > lastXp.current) {
      setXpPulse(true);
      const timer = window.setTimeout(() => setXpPulse(false), 800);
      lastXp.current = totalXP;
      return () => window.clearTimeout(timer);
    }
    lastXp.current = totalXP;
  }, [totalXP]);

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
  }, [profileCompleted, activeTaskSet, reconcileStep]);

  useEffect(() => {
    const savedUsername = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedUsername) {
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const response = await fetchUserDataRequest(savedUsername);
        if (cancelled) {
          return;
        }
        hydrateStoreFromBackend(response.data?.data);
        const progressResponse = await fetchProgress(savedUsername);
        hydrateProgressFromBackend(progressResponse.data);
        setLoggedInUsername(savedUsername);
      } catch (error) {
        if (!cancelled) {
          console.warn("Session restore failed:", error);
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loggedInUsername) {
      syncedXpRef.current = null;
      return;
    }

    if (syncedXpRef.current === null) {
      syncedXpRef.current = totalXP;
      return;
    }

    if (totalXP <= syncedXpRef.current) {
      return;
    }

    const xpDelta = totalXP - syncedXpRef.current;
    let cancelled = false;

    const syncXp = async () => {
      try {
        const response = await addXp(loggedInUsername, xpDelta);
        if (cancelled) {
          return;
        }

        const progress = response.data;
        if (!progress) {
          return;
        }

        syncedXpRef.current = progress.xp;
        useAstraforgeStore.setState((previous) => ({
          ...previous,
          totalXP: progress.xp,
          unlockedBadges: Array.isArray(progress.badges) ? progress.badges : previous.unlockedBadges
        }));
      } catch (error) {
        console.warn("XP sync failed:", error);
        syncedXpRef.current = totalXP;
      }
    };

    syncXp();

    return () => {
      cancelled = true;
    };
  }, [loggedInUsername, totalXP]);

  useEffect(() => {
    if (!loggedInUsername) {
      setSaveState("idle");
      return;
    }

    let resetTimer: number | undefined;
    const timer = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        await saveUserDataRequest(loggedInUsername, {
          totalXP,
          taskSets,
          personality: personalityType
        });
        setSaveState("saved");
        resetTimer = window.setTimeout(() => setSaveState("idle"), 1600);
      } catch (error) {
        console.warn("Auto-save failed:", error);
        setSaveState("error");
        resetTimer = window.setTimeout(() => setSaveState("idle"), 2200);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }
    };
  }, [loggedInUsername, totalXP, taskSets, personalityType]);

  useEffect(() => {
    if (lastAchievementIndexRef.current === null) {
      lastAchievementIndexRef.current = achievementLog.length;
      return;
    }

    if (achievementLog.length <= lastAchievementIndexRef.current) {
      return;
    }

    const entriesToProcess = achievementLog.slice(lastAchievementIndexRef.current);
    lastAchievementIndexRef.current = achievementLog.length;

    const nextPopups: AchievementPopupData[] = entriesToProcess
      .filter((entry) => entry.type === "task" || entry.type === "badge" || entry.type === "submission")
      .map((entry) => ({
        id: entry.id,
        title:
          entry.type === "task"
            ? "Task Completed"
            : entry.type === "submission"
              ? "Submission Completed"
              : "Badge Unlocked",
        xpGained: entry.xp,
        badgeName: entry.type === "badge" ? entry.label.replace("Badge Unlocked:", "").trim() || entry.label : undefined
      }));

    if (nextPopups.length > 0) {
      setAchievementQueue((previous) => [...previous, ...nextPopups]);
    }
  }, [achievementLog]);

  useEffect(() => {
    if (activeAchievement || achievementQueue.length === 0) {
      return;
    }

    setActiveAchievement(achievementQueue[0]);
    setAchievementQueue((previous) => previous.slice(1));
  }, [achievementQueue, activeAchievement]);

  useEffect(() => {
    if (!authMode) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [authMode]);

  const progressPercent = useMemo(() => {
    const stepsCompleted = [
      profileCompleted,
      activeTaskSet?.completed,
      Boolean(activeTaskSet?.submittedAt)
    ].filter(Boolean).length;
    return (stepsCompleted / 3) * 100;
  }, [profileCompleted, activeTaskSet]);

  const allTasksDone = Boolean(activeTaskSet?.completed);
  const submitted = Boolean(activeTaskSet?.submittedAt);
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

  const handleAddMission = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    addNewMission();
    setResetConfirm(false);
    setPage("APPLICATION");
  };

  const handleResetAll = () => {
    resetAll();
    setPage("HOME");
    setResetConfirm(false);
  };

  const handleExportSummary = () => {
    const missionHistory = taskSets.map((taskSet) => ({
      id: taskSet.id,
      title: taskSet.title,
      completed: taskSet.completed,
      xpEarned: taskSet.xpEarned,
      completedAt: taskSet.completedAt,
      submittedAt: taskSet.submittedAt
    }));
    const summary = {
      totalXP,
      missionHistory,
      unlockedBadges: badges.filter((badge) => badge.unlocked).map((badge) => badge.label),
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

  const toggleTaskSet = (taskSetId: string) => {
    setExpandedTaskSets((prev) => ({
      ...prev,
      [taskSetId]: !prev[taskSetId]
    }));
  };

  return (
    <div className="app">
      {page === "HOME" ? (
        <>
          <AstraforgeScene introPhase={introPhase} />
          <div className="overlay">
            {loggedInUsername ? (
              <div className="home-auth">
                <UserProfileBar username={loggedInUsername} totalXP={totalXP} onLogoutClick={handleLogout} />
              </div>
            ) : (
              <HomeAuthControls onLoginClick={openLoginPage} onSignupClick={openSignupPage} />
            )}
            <div className={`intro-copy intro-copy--static${introPhase === "done" ? " intro-copy--hidden" : ""}`}>
              <div className="intro-title glitch-title">ASTRAFORGE</div>
              <div className="intro-tagline">Forge your place among the stars.</div>
            </div>
            {loggedInUsername ? (
              <button className="home-action" onClick={() => setPage("APPLICATION")}>
                Continue Application
              </button>
            ) : null}
          </div>

          {authMode && (
            <AuthModal
              mode={authMode}
              username={authMode === "LOGIN" ? loginUsername : signupUsername}
              password={authMode === "LOGIN" ? loginPassword : signupPassword}
              authLoading={authLoading}
              authError={authError}
              authSuccess={authSuccess}
              onClose={closeAuthModal}
              onUsernameChange={(value: string) => {
                if (authMode === "LOGIN") {
                  setLoginUsername(value);
                } else {
                  setSignupUsername(value);
                }
              }}
              onPasswordChange={(value: string) => {
                if (authMode === "LOGIN") {
                  setLoginPassword(value);
                } else {
                  setSignupPassword(value);
                }
              }}
              onSubmit={() => {
                if (authMode === "LOGIN") {
                  void handleLogin();
                } else {
                  void handleSignup();
                }
              }}
              onSwitchMode={() => {
                if (authMode === "LOGIN") {
                  openSignupPage();
                } else {
                  openLoginPage();
                }
              }}
            />
          )}
        </>
      ) : (
        <div className={`application application-step-${currentStep}`}>
          <div className="application-header">
            <div>
              <div className="application-title">Application Control</div>
              <div className="application-subtitle">ASTRAFORGE mission workflow</div>
            </div>
            <div className="header-controls">
              <div className={`xp-counter${xpPulse ? " xp-counter--pulse" : ""}`}>Stellar Energy: {totalXP} XP</div>
              <div className="level-counter">Level {levelInfo.level} — {levelInfo.title}</div>
              {loggedInUsername ? (
                <UserProfileBar username={loggedInUsername} totalXP={totalXP} onLogoutClick={handleLogout} />
              ) : null}
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
            <GlitchCard className="panel panel--form">
              {currentStep === 1 && (
                <>
                  <div className="panel-title">Profile</div>
                  <div className="panel-description">Introduce the operator behind the constellation.</div>
                  <div className="form-field">
                    <label>Name</label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !profileCompleted) {
                          completeProfile();
                        }
                      }}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="form-field">
                    <label>Focus</label>
                    <input
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !profileCompleted) {
                          completeProfile();
                        }
                      }}
                      placeholder="Discipline"
                    />
                  </div>
                  <button
                    className="application-button"
                    onClick={completeProfile}
                    disabled={profileCompleted}
                  >
                    {profileCompleted ? "PROFILE COMPLETED" : "COMPLETE PROFILE"}
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="panel-title">Missions</div>
                  <div className="panel-description">Complete tasks in your active mission to progress.</div>
                  {taskSets.length === 0 ? (
                    <div className="task-sets">
                      <div className="task-set task-set--active">
                        <div className="task-set-header">
                          <div>
                            <div className="task-set-title">Mission 1</div>
                            <div className="task-set-subtitle">Initializing...</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="task-sets">
                      {taskSets.map((taskSet) => {
                        const isActive = taskSet.id === activeTaskSetId;
                        const isExpanded = expandedTaskSets[taskSet.id] ?? isActive;
                        const isCompleted = taskSet.completed;
                        return (
                          <div key={taskSet.id} className={`task-set${isActive ? " task-set--active" : ""}`}>
                            <button
                              className="task-set-header"
                              type="button"
                              onClick={() => toggleTaskSet(taskSet.id)}
                            >
                              <div>
                                <div className="task-set-title">{taskSet.title}</div>
                                <div className="task-set-subtitle">
                                  {isCompleted ? "Completed" : isActive ? "Active" : "Locked"} · {taskSet.tasks.length} tasks
                                </div>
                              </div>
                              <div className="task-set-meta">
                                <span className="task-set-xp">{taskSet.xpEarned} XP</span>
                                <span className="task-set-toggle">{isExpanded ? "−" : "+"}</span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="task-set-body">
                                {isActive && !isCompleted && (
                                  <div className="task-add">
                                    <input
                                      value={newTaskLabel}
                                      onChange={(event) => setNewTaskLabel(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" && newTaskLabel.trim() !== "") {
                                          handleAddTask();
                                        }
                                      }}
                                      placeholder="Add a custom task"
                                      aria-label="Add a custom task"
                                    />
                                    <button
                                      className="application-button"
                                      type="button"
                                      onClick={handleAddTask}
                                      disabled={newTaskLabel.trim() === ""}
                                    >
                                      Add Task
                                    </button>
                                    <button
                                      className="application-button"
                                      type="button"
                                      onClick={resetActiveMissionTasks}
                                      disabled={taskSet.tasks.some((task) => task.completed)}
                                    >
                                      Reset Tasks
                                    </button>
                                  </div>
                                )}
                                <div className="task-list">
                                  {taskSet.tasks.map((task) => (
                                    <label
                                      key={task.id}
                                      className={`task-item${task.completed ? " task-item--done" : ""}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => completeTask(task.id)}
                                        disabled={!isActive || task.completed}
                                      />
                                      <span>{task.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="panel-title">Submission</div>
                  <div className="panel-description">Submit the active mission once tasks are complete.</div>
                  <button className="application-button" onClick={handleSubmit} disabled={submitted}>
                    {submitted ? "Submitted" : "Submit Mission"}
                  </button>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="panel-title">Status</div>
                  <div className="panel-description">Your mission archive and achievements.</div>
                  
                  <div className="snapshot-container" ref={snapshotRef}>
                    <div className="snapshot-header">
                      <div className="snapshot-branding">ASTRAFORGE</div>
                      <div className="snapshot-subtitle">Application Completion Certificate</div>
                    </div>
                    
                    <div className="snapshot-body">
                      <div className="snapshot-section">
                        <div className="snapshot-label">Total Stellar Energy</div>
                        <div className="snapshot-value">{totalXP} XP</div>
                      </div>

                      <div className="snapshot-section">
                        <div className="snapshot-label">Achievements Unlocked</div>
                        <div className="snapshot-badges">
                          {badges.filter((badge) => badge.unlocked).map((badge) => (
                            <div key={badge.id} className="snapshot-badge">{badge.label}</div>
                          ))}
                        </div>
                      </div>
                      {featureFlags.streaks && (
                        <div className="snapshot-section">
                          <div className="snapshot-label">Engagement Streak</div>
                          <div className="snapshot-value">🔥 {currentStreak}-Day Streak</div>
                          <div className="snapshot-progress">Longest: {longestStreak} days</div>
                        </div>
                      )}

                      <div className="snapshot-section">
                        <div className="snapshot-label">Mission History</div>
                        <div className="snapshot-progress">
                          {completedTaskSets.length} completed
                        </div>
                      </div>
                      <div className="snapshot-section">
                        <div className="snapshot-label">Constellation Personality</div>
                        <div className="snapshot-value">{personalityType}</div>
                        <div className="snapshot-progress">
                          Derived: {personalityDerivedAt ? new Date(personalityDerivedAt).toLocaleDateString() : "-"}
                        </div>
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

                  <div className="mission-history">
                    <div className="mission-history-title">Mission History</div>
                    {completedTaskSets.length === 0 ? (
                      <div className="status-message">No completed missions yet.</div>
                    ) : (
                      completedTaskSets.map((taskSet) => (
                        <div key={taskSet.id} className="mission-history-entry">
                          <div className="mission-history-heading">
                            <span className="mission-history-name">{taskSet.title}</span>
                            <span className="mission-history-xp">{taskSet.xpEarned} XP</span>
                          </div>
                          <div className="mission-history-meta">
                            Completed: {taskSet.completedAt ? new Date(taskSet.completedAt).toLocaleString() : "-"}
                          </div>
                          <div className="mission-history-meta">
                            Submitted: {taskSet.submittedAt ? new Date(taskSet.submittedAt).toLocaleString() : "-"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mission-history">
                    <div className="mission-history-title">Constellation Personality</div>
                    <div className="status-message">{personalityType}</div>
                    <div className="mission-history-meta">
                      Derived: {personalityDerivedAt ? new Date(personalityDerivedAt).toLocaleString() : "-"}
                    </div>
                  </div>

                  {featureFlags.insights && (
                    <div className="progress-insights">
                      <div className="progress-insights-title">Progress Insights</div>
                      <div className="progress-insights-row">
                        <span className="progress-insights-label">Missions completed</span>
                        <span className="progress-insights-value">{completedTaskSets.length}</span>
                      </div>
                      <div className="progress-insights-row">
                        <span className="progress-insights-label">Tasks completed</span>
                        <span className="progress-insights-value">{totalTasksCompleted}</span>
                      </div>
                      <div className="progress-insights-row">
                        <span className="progress-insights-label">Average XP per mission</span>
                        <span className="progress-insights-value">{averageXpPerMission} XP</span>
                      </div>
                      <div className="progress-insights-row">
                        <span className="progress-insights-label">Most productive day</span>
                        <span className="progress-insights-value">
                          {mostProductiveDay ? `${mostProductiveDay.dayLabel} · ${mostProductiveDay.xp} XP` : "-"}
                        </span>
                      </div>
                    </div>
                  )}

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
                          Submit each mission: +30 XP
                        </div>
                      </div>

                      <div className="system-overview-section">
                        <div className="system-overview-title">How Badges Unlock</div>
                        <div className="system-overview-content">
                          Stellar Alignment: 50 XP or more<br/>
                          Astral Apex: 100 XP or more
                        </div>
                      </div>

                      <div className="system-overview-section">
                        <div className="system-overview-title">Progress System</div>
                        <div className="system-overview-content">
                          Profiles are completed once.<br/>
                          Missions can be repeated and stacked.<br/>
                          All progress is saved automatically.
                        </div>
                      </div>
                    </div>
                  )}

                  {achievementLog.length > 0 && (
                    <div className="achievement-log">
                      <div className="achievement-log-title">Achievement Log</div>
                      <div className="achievement-log-entries">
                        {visibleLogEntries.map((entry) => (
                          <div key={entry.id} className={`achievement-log-entry achievement-log-entry--${entry.type}`}>
                            <div className="achievement-log-type">{entry.type}</div>
                            <div className="achievement-log-label">{entry.label}</div>
                            {entry.xp && <div className="achievement-log-xp">+{entry.xp} XP</div>}
                            <div className="achievement-log-timestamp">{new Date(entry.timestamp).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                      {achievementLog.length > 6 && (
                        <button
                          className="achievement-log-toggle"
                          type="button"
                          onClick={() => setShowFullLog((prev) => !prev)}
                        >
                          {showFullLog ? "View less" : "View more"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </GlitchCard>

            <GlitchCard className="panel panel--progress">
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
                {featureFlags.streaks && (
                  <div className="streak-card">
                    <div className="streak-title">Daily Streak</div>
                    <div className="streak-value">🔥 {currentStreak}-Day Streak</div>
                    <div className="streak-meta">Longest: {longestStreak} days</div>
                  </div>
                )}
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
              {taskSets.length > 0 && (
                <div className="timeline">
                  <div className="timeline-title">Mission History</div>
                  <div className="timeline-entries">
                    {taskSets
                      .filter((taskSet) => taskSet.completed)
                      .map((taskSet, index) => (
                        <div key={taskSet.id} className="timeline-entry" style={{ animationDelay: `${index * 0.15}s` }}>
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <div className="timeline-label">{taskSet.title}</div>
                            <div className="timeline-xp">{taskSet.xpEarned} XP</div>
                            <div className="timeline-meta">
                              {taskSet.completedAt ? new Date(taskSet.completedAt).toLocaleDateString() : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    <div className="timeline-entry timeline-entry--total" style={{ animationDelay: `${taskSets.length * 0.15}s` }}>
                      <div className="timeline-dot timeline-dot--final" />
                      <div className="timeline-content">
                        <div className="timeline-label">Total Stellar Energy</div>
                        <div className="timeline-xp">{totalXP} XP</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlitchCard>
          </div>

          <div className="application-footer">
            {loggedInUsername && (
              <button className="application-link" onClick={handleLogout}>
                Logout ({loggedInUsername})
              </button>
            )}
            <button className="application-link" onClick={() => setPage("HOME")}>
              Return to HOME
            </button>
            <div className="reset-container">
              <button className="application-link" onClick={handleResetAll}>
                Reset All
              </button>
              <button className="application-link" onClick={handleAddMission}>
                Add New Mission
              </button>
              {resetConfirm && (
                <div className="reset-confirm">
                  Click again to launch a new mission.
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

      <AchievementPopup popup={activeAchievement} onDone={() => setActiveAchievement(null)} />
      <SaveIndicator state={saveState} />
    </div>
  );
}

