import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import CommentsModal from "../components/CommentsModal";

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTaskForComments, setActiveTaskForComments] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.getMyTasks();
      setTasks(res.tasks || []);
    } catch (err) {
      console.error("Fetch my tasks error:", err);
      setError(err.message || "Failed to load assigned tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.task : t))
      );
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.message || "Failed to update task status");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesFilter =
      statusFilter === "all" ? true : t.status === statusFilter;
    const matchesSearch =
      search.trim() === ""
        ? true
        : t.title?.toLowerCase().includes(search.toLowerCase()) ||
          t.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="my-tasks-page">
      <header className="topbar">
        <div>
          <h1>My Tasks</h1>
          <p>All tasks currently assigned to you across projects.</p>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      <div className="task-filter-bar">
        <div className="task-tabs">
          <button
            className={`task-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
            type="button"
          >
            All ({tasks.length})
          </button>
          <button
            className={`task-tab ${statusFilter === "todo" ? "active" : ""}`}
            onClick={() => setStatusFilter("todo")}
            type="button"
          >
            To Do ({todoCount})
          </button>
          <button
            className={`task-tab ${statusFilter === "in-progress" ? "active" : ""}`}
            onClick={() => setStatusFilter("in-progress")}
            type="button"
          >
            In Progress ({inProgressCount})
          </button>
          <button
            className={`task-tab ${statusFilter === "done" ? "active" : ""}`}
            onClick={() => setStatusFilter("done")}
            type="button"
          >
            Done ({doneCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search assigned tasks by title or project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="task-search-input"
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        {loading ? (
          <p className="loading-text">Loading assigned tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>
              {search || statusFilter !== "all"
                ? "No tasks match your search"
                : "No tasks assigned to you"}
            </h3>
            <p>
              {search || statusFilter !== "all"
                ? "Try clearing your filters or changing search keywords."
                : "You currently don't have any tasks assigned. Check your projects to assign tasks."}
            </p>
            <Link
              to="/projects"
              className="new-project-btn"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Browse Projects
            </Link>
          </div>
        ) : (
          <div className="tasks-grid">
            {filteredTasks.map((task) => {
              const priorityClass =
                task.priority === "high"
                  ? "priority-high"
                  : task.priority === "low"
                  ? "priority-low"
                  : "priority-medium";

              const statusClass =
                task.status === "done"
                  ? "status-done"
                  : task.status === "in-progress"
                  ? "status-in-progress"
                  : "status-todo";

              return (
                <div className="task-card" key={task._id}>
                  <div className="task-card-top">
                    <span className={`priority-badge ${priorityClass}`}>
                      {task.priority?.toUpperCase()}
                    </span>

                    <select
                      className={`task-status-select ${statusClass}`}
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task._id, e.target.value)
                      }
                      title="Update status"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <h3 className="task-card-title">{task.title}</h3>

                  {task.description && (
                    <p className="task-card-desc">{task.description}</p>
                  )}

                  <div className="task-card-meta">
                    <span className="task-project-tag">
                      📁{" "}
                      {task.project ? (
                        <Link to={`/projects/${task.project._id}`}>
                          {task.project.name}
                        </Link>
                      ) : (
                        "Project"
                      )}
                    </span>

                    {task.dueDate && (
                      <span className="task-due-date">
                        📅 {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="task-action-btn comment-btn"
                      onClick={() => setActiveTaskForComments(task)}
                    >
                      💬 Comments
                    </button>

                    {task.project && (
                      <Link
                        to={`/projects/${task.project._id}`}
                        className="task-action-btn"
                        style={{ textDecoration: "none" }}
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeTaskForComments && (
        <CommentsModal
          isOpen={!!activeTaskForComments}
          task={activeTaskForComments}
          onClose={() => setActiveTaskForComments(null)}
        />
      )}
    </div>
  );
}
