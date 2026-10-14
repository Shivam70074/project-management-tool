import { useState, useEffect } from "react";
import { api } from "./services/api";

function NewProject({ onClose, onProjectCreated, initialData = null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData?._id;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setError("");
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      let project;
      if (isEditing) {
        const res = await api.updateProject(initialData._id, {
          name: name.trim(),
          description: description.trim(),
        });
        project = res.project;
      } else {
        const res = await api.createProject(name.trim(), description.trim());
        project = res.project;
      }

      if (!project) {
        throw new Error("Invalid response received from server");
      }

      onProjectCreated(project);
      onClose();
    } catch (err) {
      console.error(isEditing ? "Update project error:" : "Create project error:", err);
      setError(err.message || "Failed to save project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>{isEditing ? "Edit Project" : "Create New Project"}</h2>

        <p>
          {isEditing
            ? "Update your project title and description."
            : "Create a new project and start managing your tasks."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="proj-name">Project Name *</label>
            <input
              id="proj-name"
              type="text"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="proj-desc">Project Description</label>
            <textarea
              id="proj-desc"
              placeholder="Brief description of the project goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-btn"
              disabled={loading || !name.trim()}
            >
              {loading
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProject;