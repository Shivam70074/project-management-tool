const express = require("express");

const {
  createComment,
  getTaskComments,
  deleteComment,
} = require("../controllers/commentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create a comment on a task
router.post("/task/:taskId", protect, createComment);

// Get all comments of a task
router.get("/task/:taskId", protect, getTaskComments);

// Delete a comment
router.delete("/:commentId", protect, deleteComment);

module.exports = router;