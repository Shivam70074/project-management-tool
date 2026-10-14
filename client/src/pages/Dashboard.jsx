import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import NewProject from "../NewProject";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [projRes, taskRes] = await Promise.all([
        api.getProjects(),
        api.getMyTasks(),
      ]);

      setProjects(projRes.projects || []);
      setTasks(taskRes.tasks || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real statistics calculations
  const totalProjects = projects.length;

  const uniqueMembers = new Set();
  projects.forEach((proj) => {
    if (proj.owner?._id) uniqueMembers.add(proj.owner._id.toString());
    if (Array.isArray(proj.members)) {
      proj.members.forEach((m) => {
        const id = m?._id || m;
        if (id) uniqueMembers.add(id.toString());
      });
    }
  });
  const totalTeamMembers = uniqueMembers.size;

  const totalMyTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;

  // Real recent activities generated from actual projects and tasks
  const activities = [];

  tasks.slice(0, 3).forEach((task) => {
    activities.push({
      id: `task-${task._id}`,
      type: task.status === "done" ? "completed" : "task",
      title: task.status === "done" ? "Task completed" : "Task assigned",
      desc: `${task.title} (${task.project?.name || "Project"})`,
      time: task.updatedAt || task.createdAt,
    });
  });

  projects.slice(0, 3).forEach((project) => {
    activities.push({
      id: `proj-${project._id}`,
      type: "project",
      title: "Project active",
      desc: `${project.name} with ${project.members?.length || 1} member(s)`,
      time: project.createdAt,
    });
  });

  activities.sort((a, b) => new Date(b.time) - new Date(a.time));

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return "Recently";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="dashboard-page">
      {/* Top Bar */}
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name || "there"}! Here's what's happening today.</p>
        </div>

        <div className="top-actions">
          <button
            className="new-project-btn"
            onClick={() => setShowNewProject(true)}
            type="button"
          >
            + New Project
          </button>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">▦</div>
          <div>
            <p>Total Projects</p>
            <h2>{loading ? "..." : totalProjects}</h2>
            <span className="stat-positive">Active workspace</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">✓</div>
          <div>
            <p>My Tasks</p>
            <h2>{loading ? "..." : totalMyTasks}</h2>
            <span className="stat-positive">
              {inProgressTasks} in progress
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">👥</div>
          <div>
            <p>Team Members</p>
            <h2>{loading ? "..." : totalTeamMembers}</h2>
            <span className="stat-positive">Across all projects</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">⚡</div>
          <div>
            <p>Completed Tasks</p>
            <h2>{loading ? "..." : completedTasks}</h2>
            <span className="stat-positive">
              {totalMyTasks > 0
                ? `${Math.round((completedTasks / totalMyTasks) * 100)}% done`
                : "No tasks assigned"}
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid: Projects + Activity */}
      <section className="dashboard-grid">
        {/* Recent Projects */}
        <div className="projects-section">
          <div className="section-header">
            <div>
              <h2>Recent Projects</h2>
              <p>Your latest active projects</p>
            </div>
            <Link to="/projects" className="view-all">
              View all →
            </Link>
          </div>

          <div className="projects-grid">
            {loading ? (
              <p className="loading-text">Loading projects...</p>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No projects yet</h3>
                <p>Create your first project to start managing tasks.</p>
                <button
                  className="new-project-btn"
                  onClick={() => setShowNewProject(true)}
                  type="button"
                >
                  + Create Project
                </button>
              </div>
            ) : (
              projects.slice(0, 4).map((project) => (
                <div className="project-card" key={project._id}>
                  <div className="project-card-top">
                    <div className="project-icon">
                      {project.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="status-badge">Active</span>
                  </div>

                  <h3>{project.name}</h3>
                  <p>{project.description || "No description provided."}</p>

                  <div className="project-meta">
                    <span>👥 {project.members?.length || 1} member(s)</span>
                    <span>
                      {project.owner?._id === user?.id || project.owner?._id === user?._id
                        ? "Owner"
                        : "Member"}
                    </span>
                  </div>

                  <Link
                    to={`/projects/${project._id}`}
                    className="project-view-btn"
                    style={{ textAlign: "center", textDecoration: "none", display: "block" }}
                  >
                    View Project →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real Recent Activity */}
        <div className="activity-section">
          <div className="section-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Updates from your workspace</p>
            </div>
          </div>

          <div className="activity-list">
            {loading ? (
              <p className="loading-text">Loading activity...</p>
            ) : activities.length === 0 ? (
              <div className="empty-activity">
                <p>No activity yet. Create a project or task to get started!</p>
              </div>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div className="activity-item" key={act.id}>
                  <div
                    className={`activity-icon ${
                      act.type === "completed"
                        ? "green"
                        : act.type === "task"
                        ? "blue"
                        : "purple"
                    }`}
                  >
                    {act.type === "completed" ? "✓" : act.type === "task" ? "📋" : "▦"}
                  </div>
                  <div>
                    <strong>{act.title}</strong>
                    <p>{act.desc}</p>
                    <small>{formatActivityTime(act.time)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-section">
        <div className="section-header">
          <div>
            <h2>Quick Actions</h2>
            <p>Get things done faster</p>
          </div>
        </div>

        <div className="quick-grid">
          <button
            className="quick-card"
            onClick={() => setShowNewProject(true)}
            type="button"
          >
            <span className="quick-icon purple">+</span>
            <div>
              <strong>Create Project</strong>
              <p>Start a new project</p>
            </div>
          </button>

          <button
            className="quick-card"
            onClick={() => navigate("/tasks")}
            type="button"
          >
            <span className="quick-icon blue">✓</span>
            <div>
              <strong>My Tasks</strong>
              <p>View your assigned tasks</p>
            </div>
          </button>

          <button
            className="quick-card"
            onClick={() => navigate("/team")}
            type="button"
          >
            <span className="quick-icon green">👥</span>
            <div>
              <strong>Team Members</strong>
              <p>Collaborate with your team</p>
            </div>
          </button>

          <button
            className="quick-card"
            onClick={() => navigate("/projects")}
            type="button"
          >
            <span className="quick-icon orange">▤</span>
            <div>
              <strong>All Projects</strong>
              <p>Browse workspace projects</p>
            </div>
          </button>
        </div>
      </section>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProject
          onClose={() => setShowNewProject(false)}
          onProjectCreated={(newProj) => {
            setProjects((prev) => [newProj, ...prev]);
            setShowNewProject(false);
          }}
        />
      )}
    </div>
  );
}
