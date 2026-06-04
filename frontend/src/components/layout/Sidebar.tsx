import { NavLink } from "react-router-dom";

const links = [
  { to: "/home", label: "Dashboard", icon: "🏦" },
  { to: "/accounts", label: "Accounts", icon: "💳" },
  { to: "/about", label: "Insights", icon: "📈" },
];

const Sidebar = () => {
  return (
    <nav className="sidebar" aria-label="Primary navigation">
      <div className="brandMark">B</div>
      <div className="sidebar__links">
        {links.map((link) => (
          <NavLink className="sidebar__link" to={link.to} key={link.to}>
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
