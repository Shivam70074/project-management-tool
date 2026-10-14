import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <header className="topbar">
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences.</p>
        </div>
      </header>

      <div className="settings-card">
        <h2>Profile Information</h2>
        <div className="settings-field">
          <label>Name</label>
          <p>{user?.name || "—"}</p>
        </div>
        <div className="settings-field">
          <label>Email</label>
          <p>{user?.email || "—"}</p>
        </div>
        <div className="settings-field">
          <label>Member since</label>
          <p>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      <div className="settings-card">
        <h2>Application</h2>
        <div className="settings-field">
          <label>Version</label>
          <p>TaskFlow v1.0.0</p>
        </div>
        <div className="settings-field">
          <label>Tech Stack</label>
          <p>React · Vite · Node.js · Express · MongoDB</p>
        </div>
      </div>
    </div>
  );
}
