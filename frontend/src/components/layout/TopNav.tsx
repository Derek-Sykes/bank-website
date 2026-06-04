import { Link } from "react-router-dom";

interface TopNavProps {
  userName?: string;
  onPrimaryAction?: () => void;
}

const TopNav = ({ userName = "Banker", onPrimaryAction }: TopNavProps) => {
  return (
    <header className="topNav">
      <div>
        <p className="eyebrow">Personal banking</p>
        <h1>Good to see you, {userName}</h1>
      </div>
      <div className="topNav__actions">
        <button className="iconButton notificationButton" type="button" aria-label="Notifications">
          🔔
          <span className="notificationDot" />
        </button>
        <Link className="iconButton" to="/accounts" aria-label="Account settings">
          ⚙️
        </Link>
        <button className="button button--primary" type="button" onClick={onPrimaryAction}>
          Add Money
        </button>
      </div>
    </header>
  );
};

export default TopNav;
