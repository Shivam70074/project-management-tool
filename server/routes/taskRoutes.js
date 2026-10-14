const express = require("express");

const {
  createTask,
  getProjectTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  assignTask,
} = require("../controllers/taskController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create task
router.post("/", protect, createTask);

// Get tasks assigned to logged in user ("My Tasks") - MUST BE BEFORE /:taskId
router.get("/my-tasks", protect, getMyTasks);

// Get all tasks of a project
router.get("/project/:projectId", protect, getProjectTasks);

// Update task
router.put("/:taskId", protect, updateTask);

// Delete task
router.delete("/:taskId", protect, deleteTask);

// Assign task to project member
router.put("/:taskId/assign", protect, assignTask);

module.exports = router;