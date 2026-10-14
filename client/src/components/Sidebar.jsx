import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">T</div>
          <span>TaskFlow</span>
        </div>

        <div className="sidebar-section">
          <p className="section-title">MAIN</p>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span>▦</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span>▤</span>
            My Projects
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span>✓</span>
            My Tasks
          </NavLink>

          <NavLink
            to="/team"
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span>👥</span>
            Team
          </NavLink>
        </div>

        <div className="sidebar-section">
          <p className="section-title">WORKSPACE</p>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `side-link ${isActive ? "active" : ""}`
            }
            onClick={onClose}
          >
            <span>⚙</span>
            Settings
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{userInitial}</div>
            <div className="profile-info">
              <strong>{user?.name || "Loading..."}</strong>
              <small title={user?.email}>{user?.email || "Signed In"}</small>
            </div>
          </div>

          <button
            className="side-logout"
            onClick={logout}
            type="button"
            title="Log out of TaskFlow"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
