type HomeAuthControlsProps = {
  onLoginClick: () => void;
  onSignupClick: () => void;
};

export default function HomeAuthControls({ onLoginClick, onSignupClick }: HomeAuthControlsProps) {
  return (
    <div className="home-auth">
      <div className="home-auth-actions">
        <button className="home-auth-button" onClick={onLoginClick}>Sign In</button>
        <button className="home-auth-button" onClick={onSignupClick}>Sign Up</button>
      </div>
    </div>
  );
}
