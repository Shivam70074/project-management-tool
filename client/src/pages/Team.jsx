import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function Team() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.getProjects();
      setProjects(res.projects || []);
    } catch (err) {
      console.error("Fetch projects error:", err);
      setError(err.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Build a unique member map across all projects
  const memberMap = new Map();
  projects.forEach((proj) => {
    if (proj.owner && typeof proj.owner === "object") {
      const id = proj.owner._id;
      if (!memberMap.has(id)) {
        memberMap.set(id, {
          ...proj.owner,
          projects: [],
          isOwnerOf: [],
        });
      }
      memberMap.get(id).isOwnerOf.push(proj.name);
      if (!memberMap.get(id).projects.includes(proj.name)) {
        memberMap.get(id).projects.push(proj.name);
      }
    }

    if (Array.isArray(proj.members)) {
      proj.members.forEach((member) => {
        if (!member || typeof member !== "object") return;
        const id = member._id;
        if (!memberMap.has(id)) {
          memberMap.set(id, {
            ...member,
            projects: [],
            isOwnerOf: [],
          });
        }
        if (!memberMap.get(id).projects.includes(proj.name)) {
          memberMap.get(id).projects.push(proj.name);
        }
      });
    }
  });

  const allMembers = Array.from(memberMap.values());

  return (
    <div className="team-page">
      <header className="topbar">
        <div>
          <h1>Team Members</h1>
          <p>
            All collaborators across your projects. Manage teams from individual
            project settings.
          </p>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p className="loading-text">Loading team members...</p>
      ) : allMembers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No team members yet</h3>
          <p>Create a project and add members to build your team.</p>
          <Link
            to="/projects"
            className="new-project-btn"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            Go to Projects
          </Link>
        </div>
      ) : (
        <div className="team-grid">
          {allMembers.map((member) => {
            const isCurrentUser =
              member._id === user?.id || member._id === user?._id;
            const initial = (member.name || "U").charAt(0).toUpperCase();

            return (
              <div className="team-member-card" key={member._id}>
                <div className="team-member-header">
                  <div className="member-avatar large">{initial}</div>
                  <div>
                    <strong>
                      {member.name}
                      {isCurrentUser && (
                        <span className="you-badge"> (You)</span>
                      )}
                    </strong>
                    <p className="member-email">{member.email}</p>
                  </div>
                </div>

                <div className="team-member-details">
                  <div className="team-stat">
                    <span className="team-stat-label">Projects</span>
                    <span className="team-stat-value">
                      {member.projects.length}
                    </span>
                  </div>
                  <div className="team-stat">
                    <span className="team-stat-label">Role</span>
                    <span className="team-stat-value">
                      {member.isOwnerOf.length > 0 ? "Owner" : "Member"}
                    </span>
                  </div>
                </div>

                <div className="team-member-projects">
                  <small>Active in:</small>
                  <div className="project-tags">
                    {member.projects.map((pName) => (
                      <span className="project-tag" key={pName}>
                        {pName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
