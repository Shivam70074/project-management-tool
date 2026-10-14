const express = require("express");

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProjectMembers,
} = require("../controllers/projectController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE PROJECT
router.post("/", protect, createProject);

// GET ALL PROJECTS FOR USER
router.get("/", protect, getProjects);

// GET SINGLE PROJECT
router.get("/:id", protect, getProjectById);

// UPDATE PROJECT
router.put("/:id", protect, updateProject);

// DELETE PROJECT
router.delete("/:id", protect, deleteProject);

// FETCH PROJECT MEMBERS
router.get("/:projectId/members", protect, getProjectMembers);

// ADD MEMBER
router.put("/:projectId/members", protect, addMember);

// REMOVE MEMBER
router.delete("/:projectId/members/:memberId", protect, removeMember);

module.exports = router;