import { getUserLevel } from "../utils/gamification";

type UserProfileBarProps = {
  username: string;
  totalXP: number;
  onLogoutClick: () => void;
};

export default function UserProfileBar({ username, totalXP, onLogoutClick }: UserProfileBarProps) {
  const levelInfo = getUserLevel(totalXP);

  return (
    <div className="home-auth-user">
      <span>👤 {username}</span>
      <span className="home-auth-separator">|</span>
      <span>{`Level ${levelInfo.level}`}</span>
      <span className="home-auth-separator">|</span>
      <span>{totalXP} XP</span>
      <span className="home-auth-separator">|</span>
      <button className="home-auth-link" onClick={onLogoutClick}>Logout</button>
    </div>
  );
}
