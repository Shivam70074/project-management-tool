import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetailsPage from "./pages/ProjectDetails";
import MyTasks from "./pages/MyTasks";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import "./App.css";

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { loggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="logo">TaskFlow</div>
          <p className="subtitle">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Redirect logged-in users away from auth page
function AuthRoute({ children }) {
  const { loggedIn, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// 404 page
function NotFound() {
  return (
    <div className="project-details-page">
      <div className="empty-state" style={{ marginTop: "60px" }}>
        <div className="empty-icon">🔍</div>
        <h3>Page Not Found</h3>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a
          href="/"
          className="new-project-btn"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Route */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      {/* Protected Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetailsPage />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;