import { useEffect } from "react";

export type AchievementPopupData = {
  id: string;
  title: string;
  xpGained?: number;
  badgeName?: string;
};

type AchievementPopupProps = {
  popup: AchievementPopupData | null;
  durationMs?: number;
  onDone: () => void;
};

export default function AchievementPopup({ popup, durationMs = 2600, onDone }: AchievementPopupProps) {
  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(timer);
  }, [popup, durationMs, onDone]);

  if (!popup) return null;

  return (
    <div className="achievement-popup" role="status" aria-live="polite">
      <div className="achievement-popup-title">{popup.title}</div>
      <div className="achievement-popup-meta">
        {typeof popup.xpGained === "number" ? `+${popup.xpGained} XP` : "Milestone recorded"}
      </div>
      {popup.badgeName ? <div className="achievement-popup-badge">🏅 {popup.badgeName}</div> : null}
    </div>
  );
}
