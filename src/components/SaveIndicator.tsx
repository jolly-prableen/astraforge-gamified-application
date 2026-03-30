type SaveState = "idle" | "saving" | "saved" | "error";

type SaveIndicatorProps = {
  state: SaveState;
};

export default function SaveIndicator({ state }: SaveIndicatorProps) {
  if (state === "idle") return null;

  return (
    <div className={`save-indicator save-indicator--${state}`} role="status" aria-live="polite">
      {state === "saving" ? "Saving..." : state === "saved" ? "Saved ✅" : "Save failed"}
    </div>
  );
}
