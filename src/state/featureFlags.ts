import { useEffect, useState } from "react";

type FeatureFlagKey = "streaks" | "undo" | "insights";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const STORAGE_KEY = "astraforge-feature-flags";

const DEFAULT_FLAGS: FeatureFlags = {
  streaks: true,
  undo: false,
  insights: true
};

const parseFlags = (raw: string | null): FeatureFlags => {
  if (!raw) {
    return { ...DEFAULT_FLAGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
};

export const getFeatureFlags = (): FeatureFlags => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_FLAGS };
  }
  return parseFlags(window.localStorage.getItem(STORAGE_KEY));
};

export const setFeatureFlags = (partial: Partial<FeatureFlags>) => {
  if (typeof window === "undefined") {
    return;
  }
  const next = { ...getFeatureFlags(), ...partial };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("astraforge-feature-flags", { detail: next }));
};

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlags>(() => getFeatureFlags());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setFlags(parseFlags(event.newValue));
      }
    };
    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<FeatureFlags>;
      if (custom.detail) {
        setFlags(custom.detail);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("astraforge-feature-flags", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("astraforge-feature-flags", handleCustom);
    };
  }, []);

  return flags;
};
