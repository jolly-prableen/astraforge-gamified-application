import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getFeatureFlags } from "./featureFlags";

export type Task = {
  id: string;
  label: string;
  completed: boolean;
};

export type TaskSet = {
  id: string;
  title: string;
  tasks: Task[];
  completed: boolean;
  xpEarned: number;
  completedAt: number | null;
  submittedAt: number | null;
};

export type PersonalityType =
  | "Methodical Architect"
  | "Burst Explorer"
  | "Steady Navigator"
  | "Late Finisher";

export type Badge = {
  id: string;
  label: string;
  unlocked: boolean;
};

export type AchievementLogEntry = {
  id: string;
  type: "profile" | "task" | "submission" | "badge" | "step_transition" | "mission";
  label: string;
  xp?: number;
  timestamp: number;
};

export type Step = 1 | 2 | 3 | 4;

export type AstraforgeState = {
  currentStep: Step;
  profileCompleted: boolean;
  taskSets: TaskSet[];
  activeTaskSetId: string;
  totalXP: number;
  unlockedBadges: string[];
  achievementLog: AchievementLogEntry[];
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  personalityType: PersonalityType;
  personalityDerivedAt: number | null;
  reduceMotion: boolean;
  completeProfile: () => void;
  completeTask: (taskId: string) => void;
  addTask: (label: string) => void;
  submitApplication: () => void;
  addNewMission: () => void;
  resetActiveMissionTasks: () => void;
  resetAll: () => void;
  toggleReduceMotion: (enabled: boolean) => void;
  reconcileStep: () => void;
  goToStep: (step: Step) => void;
};

const defaultTaskTemplates: Task[] = [];

const badgeThresholds = [
  { id: "badge-1", label: "Stellar Alignment", xp: 50 },
  { id: "badge-2", label: "Astral Apex", xp: 100 }
];

const STREAK_BONUS_XP = 5;
const STREAK_BONUS_INTERVAL = 5;

const unlockBadges = (xp: number) =>
  badgeThresholds.filter((badge) => xp >= badge.xp).map((badge) => badge.id);

const createTaskSet = (index: number): TaskSet => {
  const now = Date.now();
  return {
    id: `mission-${now}`,
    title: `Mission ${index}`,
    tasks: defaultTaskTemplates.map((task, taskIndex) => ({
      ...task,
      id: `${task.id}-${now}-${taskIndex}`
    })),
    completed: false,
    xpEarned: 0,
    completedAt: null,
    submittedAt: null
  };
};

const buildInitialState = () => {
  const initialTaskSet = createTaskSet(1);
  return {
    currentStep: 1 as Step,
    profileCompleted: false,
    taskSets: [initialTaskSet],
    activeTaskSetId: initialTaskSet.id,
    totalXP: 0,
    unlockedBadges: [],
    achievementLog: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    personalityType: "Steady Navigator" as PersonalityType,
    personalityDerivedAt: null,
    reduceMotion: false
  };
};

const getDayKey = (date: Date) => date.toISOString().slice(0, 10);

const getStreakUpdate = (lastActiveDate: string | null, currentStreak: number) => {
  const todayKey = getDayKey(new Date());
  if (!lastActiveDate) {
    return { nextStreak: 1, isNewDay: true, dayKey: todayKey };
  }
  if (lastActiveDate === todayKey) {
    return { nextStreak: currentStreak, isNewDay: false, dayKey: todayKey };
  }
  const lastDate = new Date(`${lastActiveDate}T00:00:00.000Z`);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const diffDays = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
  if (diffDays === 1) {
    return { nextStreak: currentStreak + 1, isNewDay: true, dayKey: todayKey };
  }
  return { nextStreak: 1, isNewDay: true, dayKey: todayKey };
};

const derivePersonality = (
  taskSets: TaskSet[],
  totalXP: number,
  achievementLog: AchievementLogEntry[],
  now: number
): PersonalityType => {
  const taskEvents = achievementLog
    .filter((entry) => entry.type === "task")
    .map((entry) => entry.timestamp)
    .sort((a, b) => a - b);

  if (taskEvents.length < 2) {
    return "Steady Navigator";
  }

  const gaps: number[] = [];
  for (let i = 1; i < taskEvents.length; i += 1) {
    gaps.push(taskEvents[i] - taskEvents[i - 1]);
  }
  const avgGapHours = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length / 3600000;

  const missionsCompleted = taskSets.filter((taskSet) => taskSet.completed).length;
  const firstTask = taskEvents[0];
  const daysActive = Math.max(1, (now - firstTask) / 86400000);
  const xpPerDay = totalXP / daysActive;

  const recentWindowMs = 6 * 3600000;
  const recentTasks = taskEvents.filter((timestamp) => now - timestamp <= recentWindowMs).length;

  if (avgGapHours <= 1 && recentTasks >= 4) {
    return "Burst Explorer";
  }
  if (avgGapHours >= 48 && missionsCompleted >= 1 && totalXP >= 50) {
    return "Late Finisher";
  }
  if (avgGapHours >= 6 && avgGapHours <= 24 && missionsCompleted >= 1) {
    return "Methodical Architect";
  }
  if (xpPerDay >= 20 && avgGapHours <= 12) {
    return "Burst Explorer";
  }
  return "Steady Navigator";
};

export const useAstraforgeStore = create<AstraforgeState>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      completeProfile: () => {
        set((state) => {
          if (state.profileCompleted) {
            return state;
          }
          const now = Date.now();
          const nextXp = state.totalXP + 20;
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find((entry) => entry.id === badgeId);
              return {
                id: `badge-unlock-${badgeId}-${now}`,
                type: "badge" as const,
                label: `Badge Unlocked: ${badge?.label || "Unknown"}`,
                xp: undefined,
                timestamp: now
              };
            });
          return {
            ...state,
            profileCompleted: true,
            totalXP: nextXp,
            currentStep: 2,
            achievementLog: [
              ...state.achievementLog,
              {
                id: `achievement-${now}`,
                type: "profile",
                label: "Profile Completed",
                xp: 20,
                timestamp: now
              },
              ...newBadgeEntries
            ],
            unlockedBadges: nextBadges
          };
        });
      },
      completeTask: (taskId) => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          if (!active || active.completed) {
            return state;
          }
          const task = active.tasks.find((item) => item.id === taskId);
          if (!task || task.completed) {
            return state;
          }

          const now = Date.now();
          const streaksEnabled = getFeatureFlags().streaks;
          const streakUpdate = streaksEnabled
            ? getStreakUpdate(state.lastActiveDate, state.currentStreak)
            : { nextStreak: state.currentStreak, isNewDay: false, dayKey: state.lastActiveDate ?? getDayKey(new Date()) };
          const nextStreak = streakUpdate.nextStreak;
          const streakBonus =
            streaksEnabled && streakUpdate.isNewDay && nextStreak > 0 && nextStreak % STREAK_BONUS_INTERVAL === 0
              ? STREAK_BONUS_XP
              : 0;

          const updatedTasks = active.tasks.map((item) =>
            item.id === taskId ? { ...item, completed: true } : item
          );
          const allDone = updatedTasks.every((item) => item.completed);
          const nextXp = state.totalXP + 10 + streakBonus;
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find((entry) => entry.id === badgeId);
              return {
                id: `badge-unlock-${badgeId}-${now}`,
                type: "badge" as const,
                label: `Badge Unlocked: ${badge?.label || "Unknown"}`,
                xp: undefined,
                timestamp: now
              };
            });
          const updatedTaskSet: TaskSet = {
            ...active,
            tasks: updatedTasks,
            completed: allDone ? true : active.completed,
            completedAt: allDone ? now : active.completedAt,
            xpEarned: active.xpEarned + 10 + streakBonus
          };
          const nextTaskSets = state.taskSets.map((taskSet) =>
            taskSet.id === updatedTaskSet.id ? updatedTaskSet : taskSet
          );

          const stepTransitionEntry = allDone
            ? [
                {
                  id: `step-transition-2-to-3-${now}`,
                  type: "step_transition" as const,
                  label: `Mission complete: ${updatedTaskSet.title}`,
                  xp: undefined,
                  timestamp: now
                }
              ]
            : [];
          const streakEntries = streaksEnabled && streakBonus
            ? [
                {
                  id: `streak-bonus-${now}`,
                  type: "badge" as const,
                  label: `${nextStreak}-Day Streak Bonus`,
                  xp: streakBonus,
                  timestamp: now
                }
              ]
            : [];
          const taskEntry: AchievementLogEntry = {
            id: `achievement-${now}`,
            type: "task",
            label: `Task Completed: ${task.label}`,
            xp: 10,
            timestamp: now
          };
          const hasSubmission = state.taskSets.some((taskSet) => taskSet.submittedAt);
          const nextPersonality = hasSubmission
            ? state.personalityType
            : derivePersonality(nextTaskSets, nextXp, [...state.achievementLog, taskEntry], now);

          return {
            ...state,
            taskSets: nextTaskSets,
            totalXP: nextXp,
            currentStep: allDone ? 3 : state.currentStep,
            currentStreak: streaksEnabled ? nextStreak : state.currentStreak,
            longestStreak: streaksEnabled ? Math.max(state.longestStreak, nextStreak) : state.longestStreak,
            lastActiveDate: streaksEnabled ? streakUpdate.dayKey : state.lastActiveDate,
            personalityType: nextPersonality,
            personalityDerivedAt: hasSubmission ? state.personalityDerivedAt : now,
            achievementLog: [
              ...state.achievementLog,
              taskEntry,
              ...streakEntries,
              ...stepTransitionEntry,
              ...newBadgeEntries
            ],
            unlockedBadges: nextBadges
          };
        });
      },
      addTask: (label) => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          if (!active || active.completed) {
            return state;
          }
          const trimmed = label.trim();
          if (!trimmed) {
            return state;
          }
          const exists = active.tasks.some((taskItem) => taskItem.label.toLowerCase() === trimmed.toLowerCase());
          if (exists) {
            return state;
          }
          const now = Date.now();
          const newTask: Task = {
            id: `task-${now}`,
            label: trimmed,
            completed: false
          };
          const updatedTaskSet = {
            ...active,
            tasks: [...active.tasks, newTask]
          };
          return {
            ...state,
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === updatedTaskSet.id ? updatedTaskSet : taskSet
            )
          };
        });
      },
      submitApplication: () => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          if (!active || !active.completed || active.submittedAt) {
            return state;
          }
          const now = Date.now();
          const nextXp = state.totalXP + 30;
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find((entry) => entry.id === badgeId);
              return {
                id: `badge-unlock-${badgeId}-${now}`,
                type: "badge" as const,
                label: `Badge Unlocked: ${badge?.label || "Unknown"}`,
                xp: undefined,
                timestamp: now
              };
            });
          const updatedTaskSet: TaskSet = {
            ...active,
            submittedAt: now,
            xpEarned: active.xpEarned + 30
          };
          const hasSubmission = state.taskSets.some((taskSet) => taskSet.submittedAt);
          const nextTaskSets = state.taskSets.map((taskSet) =>
            taskSet.id === updatedTaskSet.id ? updatedTaskSet : taskSet
          );
          const lockedPersonality = hasSubmission
            ? state.personalityType
            : derivePersonality(nextTaskSets, nextXp, state.achievementLog, now);

          return {
            ...state,
            taskSets: nextTaskSets,
            totalXP: nextXp,
            currentStep: 4,
            personalityType: lockedPersonality,
            personalityDerivedAt: hasSubmission ? state.personalityDerivedAt : now,
            achievementLog: [
              ...state.achievementLog,
              {
                id: `achievement-${now}`,
                type: "submission",
                label: `Submission complete: ${updatedTaskSet.title}`,
                xp: 30,
                timestamp: now
              },
              {
                id: `step-transition-3-to-4-${now}`,
                type: "step_transition",
                label: "Status updated",
                xp: undefined,
                timestamp: now
              },
              ...newBadgeEntries
            ],
            unlockedBadges: nextBadges
          };
        });
      },
      addNewMission: () => {
        set((state) => {
          const nextIndex = state.taskSets.length + 1;
          const newTaskSet = createTaskSet(nextIndex);
          return {
            ...state,
            taskSets: [...state.taskSets, newTaskSet],
            activeTaskSetId: newTaskSet.id,
            currentStep: state.profileCompleted ? 2 : 1,
            achievementLog: [
              ...state.achievementLog,
              {
                id: `mission-${newTaskSet.id}`,
                type: "mission",
                label: `New mission launched: ${newTaskSet.title}`,
                xp: undefined,
                timestamp: Date.now()
              }
            ]
          };
        });
      },
      resetActiveMissionTasks: () => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          if (!active || active.tasks.some((task) => task.completed)) {
            return state;
          }
          const resetTaskSet: TaskSet = {
            ...active,
            tasks: []
          };
          return {
            ...state,
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === resetTaskSet.id ? resetTaskSet : taskSet
            )
          };
        });
      },
      resetAll: () => {
        set(() => buildInitialState());
      },
      toggleReduceMotion: (enabled) => {
        set({ reduceMotion: enabled });
      },
      reconcileStep: () => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          let nextStep: Step = 1;
          if (state.profileCompleted && active) {
            nextStep = active.completed ? (active.submittedAt ? 4 : 3) : 2;
          }
          if (state.currentStep === nextStep) {
            return state;
          }
          return {
            ...state,
            currentStep: nextStep
          };
        });
      },
      goToStep: (step) => {
        set((state) => {
          const active = state.taskSets.find((taskSet) => taskSet.id === state.activeTaskSetId);
          const maxStep: Step = state.profileCompleted && active
            ? active.completed
              ? (active.submittedAt ? 4 : 3)
              : 2
            : 1;
          if (step > maxStep || step < 1) {
            return state;
          }
          if (state.currentStep === step) {
            return state;
          }
          return {
            ...state,
            currentStep: step
          };
        });
      }
    }),
    {
      name: "astraforge-state",
      partialize: (state) => ({
        currentStep: state.currentStep,
        profileCompleted: state.profileCompleted,
        taskSets: state.taskSets,
        activeTaskSetId: state.activeTaskSetId,
        totalXP: state.totalXP,
        unlockedBadges: state.unlockedBadges,
        achievementLog: state.achievementLog,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastActiveDate: state.lastActiveDate,
        personalityType: state.personalityType,
        personalityDerivedAt: state.personalityDerivedAt,
        reduceMotion: state.reduceMotion
      })
    }
  )
);

export const useBadges = (): Badge[] => {
  const totalXP = useAstraforgeStore((state) => state.totalXP);
  const unlocked = useAstraforgeStore((state) => state.unlockedBadges);
  return badgeThresholds.map((badge) => ({
    ...badge,
    unlocked: unlocked.includes(badge.id) || totalXP >= badge.xp
  }));
};
