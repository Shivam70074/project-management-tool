import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import NewProject from "../NewProject";
import TaskModal from "../components/TaskModal";
import CommentsModal from "../components/CommentsModal";
import AddMemberModal from "../components/AddMemberModal";
import ConfirmModal from "../components/ConfirmModal";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeTaskForComments, setActiveTaskForComments] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");

  const fetchProjectData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      const [projRes, tasksRes] = await Promise.all([
        api.getProjectById(id),
        api.getProjectTasks(id),
      ]);

      setProject(projRes.project);
      setTasks(tasksRes.tasks || []);
    } catch (err) {
      console.error("Fetch project details error:", err);
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const isOwner =
    project &&
    user &&
    (project.owner?._id === user.id ||
      project.owner?._id === user._id ||
      project.owner === user.id ||
      project.owner === user._id);

  // ==================== PROJECT ACTIONS ====================
  const handleDeleteProject = async () => {
    try {
      setActionLoading(true);
      await api.deleteProject(id);
      navigate("/projects");
    } catch (err) {
      console.error("Delete project error:", err);
      setError(err.message || "Failed to delete project");
      setShowDeleteProject(false);
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== MEMBER ACTIONS ====================
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setActionLoading(true);
      const res = await api.removeMember(id, memberToRemove._id);
      if (res.project) {
        setProject(res.project);
      }
      setMemberToRemove(null);
      // Refresh tasks in case some were unassigned
      const tasksRes = await api.getProjectTasks(id);
      setTasks(tasksRes.tasks || []);
    } catch (err) {
      console.error("Remove member error:", err);
      setError(err.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== TASK ACTIONS ====================
  const handleCreateOrUpdateTask = async (taskData) => {
    try {
      setActionLoading(true);
      setError("");

      if (editingTask) {
        const res = await api.updateTask(editingTask._id, taskData);
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.task : t))
        );
        setEditingTask(null);
      } else {
        const res = await api.createTask({
          ...taskData,
          projectId: id,
        });
        setTasks((prev) => [res.task, ...prev]);
      }
      setShowTaskModal(false);
    } catch (err) {
      console.error("Save task error:", err);
      setError(err.message || "Failed to save task");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? res.task : t))
      );
    } catch (err) {
      console.error("Quick status error:", err);
      setError(err.message || "Failed to update status");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setActionLoading(true);
      await api.deleteTask(taskToDelete._id);
      setTasks((prev) => prev.filter((t) => t._id !== taskToDelete._id));
      setTaskToDelete(null);
    } catch (err) {
      console.error("Delete task error:", err);
      setError(err.message || "Failed to delete task");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="project-details-page">
        <button className="back-btn" onClick={() => navigate("/projects")}>
          ← Back to Projects
        </button>
        <p className="loading-text">Loading project details...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="project-details-page">
        <button className="back-btn" onClick={() => navigate("/projects")}>
          ← Back to Projects
        </button>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Project Unavailable</h3>
          <p>{error}</p>
          <Link to="/projects" className="new-project-btn" style={{ textDecoration: "none" }}>
            Return to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) return null;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesFilter =
      taskFilter === "all" ? true : t.status === taskFilter;
    const matchesSearch =
      taskSearch.trim() === ""
        ? true
        : t.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
          t.description?.toLowerCase().includes(taskSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="project-details-page">
      {/* Header */}
      <div className="project-details-header">
        <div className="header-navigation-row">
          <button
            className="back-btn"
            onClick={() => navigate("/projects")}
            type="button"
          >
            ← Back to Projects
          </button>

          <div className="header-project-actions">
            <button
              className="edit-project-btn"
              onClick={() => setShowEditProject(true)}
              type="button"
            >
              ✏ Edit Project
            </button>
            {isOwner && (
              <button
                className="delete-project-btn"
                onClick={() => setShowDeleteProject(true)}
                type="button"
              >
                🗑 Delete Project
              </button>
            )}
          </div>
        </div>

        <div className="project-title-row">
          <div>
            <h1>{project.name}</h1>
            <p className="project-desc-text">
              {project.description || "No description provided for this project."}
            </p>
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Project Stats */}
      <div className="project-stats">
        <div className="project-stat-card">
          <span>👥</span>
          <div>
            <small>Team Members</small>
            <h3>{project.members?.length || 1}</h3>
          </div>
        </div>

        <div className="project-stat-card">
          <span>📋</span>
          <div>
            <small>Total Tasks</small>
            <h3>{tasks.length}</h3>
          </div>
        </div>

        <div className="project-stat-card">
          <span>⏳</span>
          <div>
            <small>In Progress</small>
            <h3>{inProgressCount}</h3>
          </div>
        </div>

        <div className="project-stat-card">
          <span>✓</span>
          <div>
            <small>Completed</small>
            <h3>{doneCount}</h3>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="details-section">
        <div className="section-header">
          <div>
            <h2>Team Members</h2>
            <p>Collaborators working on this project</p>
          </div>

          {isOwner && (
            <button
              className="add-member-btn"
              onClick={() => setShowAddMember(true)}
              type="button"
            >
              + Add Member
            </button>
          )}
        </div>

        <div className="members-list">
          {project.members?.map((member) => {
            const memberObj = typeof member === "object" ? member : { _id: member, name: "Member" };
            const isProjectOwner =
              project.owner?._id === memberObj._id || project.owner === memberObj._id;

            return (
              <div className="member-card" key={memberObj._id}>
                <div className="member-avatar">
                  {(memberObj.name || "U").charAt(0).toUpperCase()}
                </div>

                <div className="member-info">
                  <strong>{memberObj.name || "Project Member"}</strong>
                  <p>{memberObj.email || "Member"}</p>
                </div>

                <div className="member-actions">
                  {isProjectOwner ? (
                    <span className="owner-badge">Owner</span>
                  ) : (
                    isOwner && (
                      <button
                        type="button"
                        className="remove-member-btn"
                        title="Remove member"
                        onClick={() => setMemberToRemove(memberObj)}
                      >
                        Remove
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="details-section">
        <div className="section-header">
          <div>
            <h2>Project Tasks</h2>
            <p>Manage, assign, and track project tasks</p>
          </div>

          <button
            className="add-task-btn"
            onClick={() => {
              setEditingTask(null);
              setShowTaskModal(true);
            }}
            type="button"
          >
            + Create Task
          </button>
        </div>

        {/* Task Filter Tabs & Search */}
        <div className="task-filter-bar">
          <div className="task-tabs">
            <button
              className={`task-tab ${taskFilter === "all" ? "active" : ""}`}
              onClick={() => setTaskFilter("all")}
              type="button"
            >
              All ({tasks.length})
            </button>
            <button
              className={`task-tab ${taskFilter === "todo" ? "active" : ""}`}
              onClick={() => setTaskFilter("todo")}
              type="button"
            >
              To Do ({todoCount})
            </button>
            <button
              className={`task-tab ${taskFilter === "in-progress" ? "active" : ""}`}
              onClick={() => setTaskFilter("in-progress")}
              type="button"
            >
              In Progress ({inProgressCount})
            </button>
            <button
              className={`task-tab ${taskFilter === "done" ? "active" : ""}`}
              onClick={() => setTaskFilter("done")}
              type="button"
            >
              Done ({doneCount})
            </button>
          </div>

          <input
            type="text"
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="task-search-input"
          />
        </div>

        {filteredTasks.length === 0 ? (
          <div className="empty-tasks">
            <div className="empty-icon">📋</div>
            <h3>
              {taskSearch || taskFilter !== "all"
                ? "No tasks match your filter"
                : "No tasks yet"}
            </h3>
            <p>
              {taskSearch || taskFilter !== "all"
                ? "Try clearing the search or switching tabs."
                : "Create your first task for this project to start tracking work."}
            </p>
            <button
              className="add-task-btn"
              onClick={() => {
                setEditingTask(null);
                setShowTaskModal(true);
              }}
              type="button"
            >
              + Create Task
            </button>
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

              const assigneeName = task.assignedTo?.name || "Unassigned";
              const assigneeInitial = assigneeName.charAt(0).toUpperCase();

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
                        handleQuickStatusChange(task._id, e.target.value)
                      }
                      title="Change status"
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
                    <div className="task-assignee">
                      <span className="task-assignee-avatar">
                        {assigneeInitial}
                      </span>
                      <span>{assigneeName}</span>
                    </div>

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

                    <div className="task-btn-group">
                      <button
                        type="button"
                        className="task-action-btn"
                        title="Edit task"
                        onClick={() => {
                          setEditingTask(task);
                          setShowTaskModal(true);
                        }}
                      >
                        ✏ Edit
                      </button>

                      <button
                        type="button"
                        className="task-action-btn delete-btn-text"
                        title="Delete task"
                        onClick={() => setTaskToDelete(task)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {showEditProject && (
        <NewProject
          initialData={project}
          onClose={() => setShowEditProject(false)}
          onProjectCreated={(updated) => {
            setProject(updated);
            setShowEditProject(false);
          }}
        />
      )}

      {/* Delete Project Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteProject}
        title="Delete Project?"
        message="Are you sure you want to permanently delete this project? All associated tasks and comments will be permanently erased. This action cannot be undone."
        confirmText="Yes, Delete Project"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteProject}
        onCancel={() => setShowDeleteProject(false)}
      />

      {/* Remove Member Confirm Modal */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        title="Remove Member?"
        message={`Are you sure you want to remove ${memberToRemove?.name || "this member"} from the project? Any tasks assigned to them will become unassigned.`}
        confirmText="Remove Member"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        projectId={id}
        existingMembers={project.members || []}
        onClose={() => setShowAddMember(false)}
        onMemberAdded={(updated) => {
          setProject(updated);
        }}
      />

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        initialData={editingTask}
        members={project.members || []}
        loading={actionLoading}
      />

      {/* Delete Task Confirm Modal */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task?"
        message={`Are you sure you want to delete task "${taskToDelete?.title}"? All task comments will also be deleted.`}
        confirmText="Delete Task"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* Task Comments Modal */}
      {activeTaskForComments && (
        <CommentsModal
          isOpen={!!activeTaskForComments}
          task={activeTaskForComments}
          projectOwnerId={project.owner?._id || project.owner}
          onClose={() => setActiveTaskForComments(null)}
        />
      )}
    </div>
  );
}
