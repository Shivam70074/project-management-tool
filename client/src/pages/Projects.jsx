import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import NewProject from "../NewProject";

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.getProjects();
      setProjects(res.projects || []);
    } catch (err) {
      console.error("Fetch projects error:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="projects-page">
      <header className="topbar">
        <div>
          <h1>My Projects</h1>
          <p>Manage and monitor all your ongoing workspace projects.</p>
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

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search projects by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="projects-grid" style={{ marginTop: "20px" }}>
        {loading ? (
          <p className="loading-text">Loading projects...</p>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>
              {search ? "No projects match your search" : "No projects found"}
            </h3>
            <p>
              {search
                ? "Try searching for a different keyword or clear your filter."
                : "Create your first project to get started."}
            </p>
            {!search && (
              <button
                className="new-project-btn"
                onClick={() => setShowNewProject(true)}
                type="button"
              >
                + Create Project
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isOwner =
              project.owner?._id === user?.id ||
              project.owner?._id === user?._id ||
              project.owner === user?.id ||
              project.owner === user?._id;

            return (
              <div className="project-card" key={project._id}>
                <div className="project-card-top">
                  <div className="project-icon">
                    {project.name?.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={
                      isOwner ? "status-badge" : "status-badge member-badge"
                    }
                  >
                    {isOwner ? "Owner" : "Member"}
                  </span>
                </div>

                <h3>{project.name}</h3>
                <p>{project.description || "No description provided."}</p>

                <div className="project-meta">
                  <span>👥 {project.members?.length || 1} member(s)</span>
                  <span>
                    Created:{" "}
                    {new Date(project.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <Link
                  to={`/projects/${project._id}`}
                  className="project-view-btn"
                  style={{
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  View Project →
                </Link>
              </div>
            );
          })
        )}
      </div>

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
