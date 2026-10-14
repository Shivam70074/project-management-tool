const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Project = require("../models/Project");

// CREATE COMMENT
const createComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({
        message: "Comment text cannot be empty",
      });
    }

    // Check if task exists
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Check project membership
    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found for this task",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not authorized to comment on this task",
      });
    }

    const comment = await Comment.create({
      text: text.trim(),
      task: taskId,
      user: req.userId,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name email"
    );

    res.status(201).json({
      message: "Comment created successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      message: "Failed to create comment",
      error: error.message,
    });
  }
};

// GET ALL COMMENTS FOR A TASK
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found for this task",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not authorized to view comments for this task",
      });
    }

    const comments = await Comment.find({ task: taskId })
      .populate("user", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json({
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      message: "Failed to fetch comments",
      error: error.message,
    });
  }
};

// DELETE COMMENT
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const task = await Task.findById(comment.task);
    let isProjectOwner = false;
    if (task) {
      const project = await Project.findById(task.project);
      if (project && project.owner.toString() === req.userId.toString()) {
        isProjectOwner = true;
      }
    }

    // Only the comment author or project owner can delete it
    const isAuthor = comment.user.toString() === req.userId.toString();

    if (!isAuthor && !isProjectOwner) {
      return res.status(403).json({
        message: "You can only delete your own comments",
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      message: "Failed to delete comment",
      error: error.message,
    });
  }
};

module.exports = {
  createComment,
  getTaskComments,
  deleteComment,
};