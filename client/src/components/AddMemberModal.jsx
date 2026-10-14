import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function AddMemberModal({
  isOpen,
  onClose,
  onMemberAdded,
  projectId,
  existingMembers = [],
}) {
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setSearchResults([]);
      setError("");
      return;
    }

    // Load registered users suggestions
    const fetchUsers = async () => {
      try {
        setSearchLoading(true);
        const res = await api.searchUsers("");
        const existingIds = new Set(
          existingMembers.map((m) => (m._id || m).toString())
        );
        const filtered = (res.users || []).filter(
          (u) => !existingIds.has(u._id.toString())
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error("Failed to load user suggestions:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, existingMembers]);

  if (!isOpen) return null;

  const handleAddByEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter a user email");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.addMember(projectId, { email: email.trim() });
      if (res.project) {
        onMemberAdded(res.project);
        onClose();
      }
    } catch (err) {
      console.error("Add member error:", err);
      setError(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.addMember(projectId, { userId: user._id });
      if (res.project) {
        onMemberAdded(res.project);
        onClose();
      }
    } catch (err) {
      console.error("Add member error:", err);
      setError(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal add-member-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>Add Team Member</h2>
        <p>Invite a registered user to collaborate on this project.</p>

        <form onSubmit={handleAddByEmail}>
          <div className="form-group">
            <label htmlFor="member-email">Enter Email Address</label>
            <div className="input-with-button">
              <input
                id="member-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="create-btn"
                disabled={loading || !email.trim()}
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </form>

        {error && <div className="form-error">{error}</div>}

        <div className="suggested-users-section">
          <h3>Registered Users</h3>
          {searchLoading ? (
            <p className="hint-text">Loading available users...</p>
          ) : searchResults.length === 0 ? (
            <p className="hint-text">All registered users are already in this project, or none found.</p>
          ) : (
            <div className="suggested-users-list">
              {searchResults.slice(0, 5).map((u) => (
                <div className="user-suggestion-row" key={u._id}>
                  <div className="member-avatar">
                    {(u.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="user-suggestion-info">
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </div>
                  <button
                    type="button"
                    className="add-suggestion-btn"
                    onClick={() => handleSelectUser(u)}
                    disabled={loading}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-buttons" style={{ marginTop: "20px" }}>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
