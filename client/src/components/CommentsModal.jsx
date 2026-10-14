import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function CommentsModal({
  isOpen,
  onClose,
  task,
  projectOwnerId,
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async () => {
    if (!task?._id) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.getTaskComments(task._id);
      setComments(res.comments || []);
    } catch (err) {
      console.error("Fetch comments error:", err);
      setError(err.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [task?._id]);

  useEffect(() => {
    if (isOpen && task?._id) {
      fetchComments();
      setNewComment("");
      setError("");
    }
  }, [isOpen, task?._id, fetchComments]);

  if (!isOpen || !task) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setError("Comment text cannot be empty");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await api.createComment(task._id, newComment.trim());
      if (res.comment) {
        setComments((prev) => [...prev, res.comment]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Add comment error:", err);
      setError(err.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Delete comment error:", err);
      setError(err.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal comments-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h2>Task Discussion</h2>
            <p className="task-title-sub">
              <strong>Task:</strong> {task.title}
            </p>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="comments-container">
          {loading ? (
            <div className="comments-loading">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="empty-comments">
              <span className="empty-icon">💬</span>
              <p>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => {
                const isAuthor =
                  comment.user?._id?.toString() === user?.id?.toString() ||
                  comment.user?._id?.toString() === user?._id?.toString() ||
                  comment.user?.toString() === user?.id?.toString();

                const isOwner =
                  projectOwnerId &&
                  (projectOwnerId.toString() === user?.id?.toString() ||
                    projectOwnerId.toString() === user?._id?.toString());

                const authorName = comment.user?.name || "Unknown User";
                const authorInitial = authorName.charAt(0).toUpperCase();

                return (
                  <div className="comment-item" key={comment._id}>
                    <div className="comment-avatar">{authorInitial}</div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <strong>{authorName}</strong>
                        <span className="comment-time">
                          {formatDate(comment.createdAt)}
                        </span>
                        {(isAuthor || isOwner) && (
                          <button
                            type="button"
                            className="comment-del-btn"
                            title="Delete comment"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleAddComment} className="comment-form">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            disabled={submitting}
          />
          <div className="comment-form-actions">
            <button
              type="submit"
              className="create-btn"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
