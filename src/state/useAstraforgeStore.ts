import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Task = {
  id: string;
  label: string;
  completed: boolean;
};

export type Badge = {
  id: string;
  label: string;
  unlocked: boolean;
};

export type TimelineEntry = {
  id: string;
  label: string;
  xp: number;
  timestamp: number;
};

export type AchievementLogEntry = {
  id: string;
  type: "profile" | "task" | "submission" | "badge" | "step_transition";
  label: string;
  xp?: number;
  timestamp: number;
};

export type Step = 1 | 2 | 3 | 4;

type AstraforgeState = {
  currentStep: Step;
  xp: number;
  profileCompleted: boolean;
  completedTasks: string[];
  submitted: boolean;
  tasks: Task[];
  unlockedBadges: string[];
  timeline: TimelineEntry[];
  achievementLog: AchievementLogEntry[];
  reduceMotion: boolean;
  completionTimestamp: number | null;
  completeProfile: () => void;
  completeTask: (taskId: string) => void;
  addTask: (label: string) => void;
  submitApplication: () => void;
  resetApplication: () => void;
  toggleReduceMotion: (enabled: boolean) => void;
  reconcileStep: () => void;
  goToStep: (step: Step) => void;
};

const defaultTasks: Task[] = [
  { id: "task-1", label: "Confirm focus details", completed: false },
  { id: "task-2", label: "Upload supporting info", completed: false },
  { id: "task-3", label: "Review application summary", completed: false }
];

const badgeThresholds = [
  { id: "badge-1", label: "Stellar Alignment", xp: 50 },
  { id: "badge-2", label: "Astral Apex", xp: 100 }
];

const unlockBadges = (xp: number) =>
  badgeThresholds.filter((badge) => xp >= badge.xp).map((badge) => badge.id);

export const useAstraforgeStore = create<AstraforgeState>()(
  persist(
    (set) => ({
      currentStep: 1,
      xp: 0,
      profileCompleted: false,
      completedTasks: [],
      submitted: false,
      tasks: defaultTasks,
      unlockedBadges: [],
      timeline: [],
      achievementLog: [],
      reduceMotion: false,
      completionTimestamp: null,
      completeProfile: () => {
        set((state) => {
          if (state.profileCompleted) {
            return state;
          }
          const now = Date.now();
          const nextXp = state.xp + 20;
          const newTimelineEntry: TimelineEntry = {
            id: "profile-complete",
            label: "Profile Completed",
            xp: 20,
            timestamp: now
          };
          const newLogEntry: AchievementLogEntry = {
            id: `achievement-${now}`,
            type: "profile",
            label: "Profile Completed",
            xp: 20,
            timestamp: now
          };
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find(b => b.id === badgeId);
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
            xp: nextXp,
            currentStep: 2,
            timeline: [...state.timeline, newTimelineEntry],
            achievementLog: [...state.achievementLog, newLogEntry, ...newBadgeEntries],
            unlockedBadges: nextBadges
          };
        });
      },
      completeTask: (taskId) => {
        set((state) => {
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task || task.completed) {
            return state;
          }
          const now = Date.now();
          const nextTasks = state.tasks.map((item) =>
            item.id === taskId ? { ...item, completed: true } : item
          );
          const nextCompleted = nextTasks.filter((item) => item.completed).map((item) => item.id);
          const nextXp = state.xp + 10;
          const allDone = nextCompleted.length === nextTasks.length;
          const newTimelineEntry: TimelineEntry = {
            id: `task-${taskId}`,
            label: `Task: ${task.label}`,
            xp: 10,
            timestamp: now
          };
          const newLogEntry: AchievementLogEntry = {
            id: `achievement-${now}`,
            type: "task",
            label: `Task Completed: ${task.label}`,
            xp: 10,
            timestamp: now
          };
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find(b => b.id === badgeId);
              return {
                id: `badge-unlock-${badgeId}-${now}`,
                type: "badge" as const,
                label: `Badge Unlocked: ${badge?.label || "Unknown"}`,
                xp: undefined,
                timestamp: now
              };
            });
          const stepTransitionEntry = allDone ? [{
            id: `step-transition-2-to-3-${now}`,
            type: "step_transition" as const,
            label: "Progressed to Step 3: Submission",
            xp: undefined,
            timestamp: now
          }] : [];
          return {
            ...state,
            tasks: nextTasks,
            completedTasks: nextCompleted,
            xp: nextXp,
            currentStep: allDone ? 3 : state.currentStep,
            timeline: [...state.timeline, newTimelineEntry],
            achievementLog: [...state.achievementLog, newLogEntry, ...newBadgeEntries, ...stepTransitionEntry],
            unlockedBadges: nextBadges
          };
        });
      },
      addTask: (label) => {
        set((state) => {
          if (state.submitted) {
            return state;
          }
          const trimmed = label.trim();
          if (!trimmed) {
            return state;
          }
          const exists = state.tasks.some((task) => task.label.toLowerCase() === trimmed.toLowerCase());
          if (exists) {
            return state;
          }
          const now = Date.now();
          const newTask: Task = {
            id: `task-${now}`,
            label: trimmed,
            completed: false
          };
          return {
            ...state,
            tasks: [...state.tasks, newTask]
          };
        });
      },
      submitApplication: () => {
        set((state) => {
          const allTasksDone = state.tasks.length > 0 && state.tasks.every((task) => task.completed);
          if (state.submitted || !allTasksDone) {
            return state;
          }
          const now = Date.now();
          const nextXp = state.xp + 30;
          const newTimelineEntry: TimelineEntry = {
            id: "submission-confirmed",
            label: "Submission Confirmed",
            xp: 30,
            timestamp: now
          };
          const newLogEntry: AchievementLogEntry = {
            id: `achievement-${now}`,
            type: "submission",
            label: "Application Submitted",
            xp: 30,
            timestamp: now
          };
          const stepTransitionEntry: AchievementLogEntry = {
            id: `step-transition-3-to-4-${now}`,
            type: "step_transition",
            label: "Progressed to Step 4: Status",
            xp: undefined,
            timestamp: now
          };
          const nextBadges = unlockBadges(nextXp);
          const newBadgeEntries = nextBadges
            .filter((badgeId) => !state.unlockedBadges.includes(badgeId))
            .map((badgeId) => {
              const badge = badgeThresholds.find(b => b.id === badgeId);
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
            submitted: true,
            xp: nextXp,
            currentStep: 4,
            completionTimestamp: now,
            timeline: [...state.timeline, newTimelineEntry],
            achievementLog: [...state.achievementLog, newLogEntry, stepTransitionEntry, ...newBadgeEntries],
            unlockedBadges: nextBadges
          };
        });
      },
      resetApplication: () => {
        set(() => ({
          currentStep: 1,
          xp: 0,
          profileCompleted: false,
          completedTasks: [],
          submitted: false,
          tasks: defaultTasks,
          unlockedBadges: [],
          timeline: [],
          achievementLog: [],
          completionTimestamp: null
        }));
      },
      toggleReduceMotion: (enabled) => {
        set({ reduceMotion: enabled });
      },
      reconcileStep: () => {
        set((state) => {
          const allTasksDone = state.tasks.length > 0 && state.tasks.every((task) => task.completed);
          let nextStep: Step = 1;
          if (state.profileCompleted) {
            nextStep = allTasksDone ? (state.submitted ? 4 : 3) : 2;
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
          const allTasksDone = state.tasks.length > 0 && state.tasks.every((task) => task.completed);
          const maxStep: Step = state.profileCompleted
            ? (allTasksDone ? (state.submitted ? 4 : 3) : 2)
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
        xp: state.xp,
        completedTasks: state.completedTasks,
        unlockedBadges: state.unlockedBadges,
        profileCompleted: state.profileCompleted,
        submitted: state.submitted,
        tasks: state.tasks,
        timeline: state.timeline,
        achievementLog: state.achievementLog,
        reduceMotion: state.reduceMotion,
        completionTimestamp: state.completionTimestamp
      })
    }
  )
);

export const useBadges = (): Badge[] => {
  const xp = useAstraforgeStore((state) => state.xp);
  const unlocked = useAstraforgeStore((state) => state.unlockedBadges);
  return badgeThresholds.map((badge) => ({
    ...badge,
    unlocked: unlocked.includes(badge.id) || xp >= badge.xp
  }));
};
