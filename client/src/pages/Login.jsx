import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [showLogin, setShowLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (!showLogin && !name.trim()) {
      setMessage("Please provide your name.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (showLogin) {
        await login(email.trim(), password);
        navigate(from, { replace: true });
      } else {
        await register(name.trim(), email.trim(), password);
        setMessage("Account created successfully! Redirecting...");
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setMessage(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="auth-card">
        <div className="logo">TaskFlow</div>

        <h1>{showLogin ? "Welcome Back" : "Create Account"}</h1>

        <p className="subtitle">
          {showLogin
            ? "Login to manage your projects, tasks, and team."
            : "Create an account to start managing projects with TaskFlow."}
        </p>

        <form onSubmit={handleSubmit}>
          {!showLogin && (
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus={showLogin}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Please wait..." : showLogin ? "Login" : "Register"}
          </button>
        </form>

        {message && (
          <p
            className="message"
            style={{
              background: message.includes("success") ? "#dcfce7" : "#fee2e2",
              color: message.includes("success") ? "#15803d" : "#b91c1c",
            }}
          >
            {message}
          </p>
        )}

        <p className="switch-text">
          {showLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            type="button"
            className="switch-btn"
            onClick={() => {
              setShowLogin(!showLogin);
              setMessage("");
            }}
            disabled={loading}
          >
            {showLogin ? " Register" : " Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
