import { useEffect } from "react";
import GlitchCard from "./GlitchCard";

type AuthMode = "LOGIN" | "SIGNUP";

type AuthModalProps = {
  mode: AuthMode;
  username: string;
  password: string;
  authLoading: boolean;
  authError: string;
  authSuccess: string;
  onClose: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onSwitchMode: () => void;
};

export default function AuthModal({
  mode,
  username,
  password,
  authLoading,
  authError,
  authSuccess,
  onClose,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onSwitchMode
}: AuthModalProps) {
  const isLogin = mode === "LOGIN";

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div className="auth-modal-backdrop" role="presentation" onClick={onClose}>
      <GlitchCard
        className="auth-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isLogin ? "Sign In" : "Sign Up"}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-modal-close" type="button" onClick={onClose} aria-label="Close authentication modal">×</button>
        <div className="auth-title">{isLogin ? "Sign In" : "Sign Up"}</div>
        <div className="auth-subtitle">
          {isLogin ? "Access your ASTRAFORGE mission data" : "Create an account to save your mission progress"}
        </div>

        <div className="form-field">
          <label>Username</label>
          <input value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="Username" />
        </div>

        <div className="form-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !authLoading) onSubmit();
            }}
            placeholder="Password"
          />
        </div>

        {authError && <div className="auth-message auth-message--error">{authError}</div>}
        {authSuccess && <div className="auth-message auth-message--success">{authSuccess}</div>}

        <button className="application-button" onClick={onSubmit} disabled={authLoading || username.trim() === "" || password.trim() === ""}>
          {authLoading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
        </button>

        <div className="auth-links">
          <button className="application-link" onClick={onSwitchMode}>
            {isLogin ? "Need an account? Sign Up" : "Have an account? Sign In"}
          </button>
        </div>
      </GlitchCard>
    </div>
  );
}
