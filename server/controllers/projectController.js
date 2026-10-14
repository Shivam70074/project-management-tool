const mongoose = require("mongoose");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const User = require("../models/User");

// CREATE PROJECT
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      owner: req.userId,
      members: [req.userId],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      message: "Failed to create project",
      error: error.message,
    });
  }
};

// GET ALL PROJECTS FOR LOGGED-IN USER
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ members: req.userId }, { owner: req.userId }],
    })
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);
    res.status(500).json({
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
};

// GET SINGLE PROJECT
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isOwner = project.owner && project.owner._id.toString() === req.userId.toString();
    const isMember = project.members.some(
      (member) => member._id.toString() === req.userId.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    res.status(200).json({
      project,
    });
  } catch (error) {
    console.error("Fetch project by id error:", error);
    res.status(500).json({
      message: "Failed to fetch project",
      error: error.message,
    });
  }
};

// UPDATE PROJECT DETAILS
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === req.userId.toString();
    const isMember = project.members.some(
      (member) => member.toString() === req.userId.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "You are not authorized to update this project",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Project name cannot be empty",
        });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = typeof description === "string" ? description.trim() : "";
    }

    await project.save();

    const updatedProject = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      message: "Failed to update project",
      error: error.message,
    });
  }
};

// DELETE PROJECT
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Only the project owner can delete this project",
      });
    }

    // Find all tasks of this project to cascade delete comments
    const tasks = await Task.find({ project: id }).select("_id");
    const taskIds = tasks.map((t) => t._id);

    if (taskIds.length > 0) {
      await Comment.deleteMany({ task: { $in: taskIds } });
      await Task.deleteMany({ project: id });
    }

    await Project.findByIdAndDelete(id);

    res.status(200).json({
      message: "Project and associated tasks deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      message: "Failed to delete project",
      error: error.message,
    });
  }
};

// ADD MEMBER TO PROJECT
const addMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    if (!userId && !email) {
      return res.status(400).json({
        message: "userId or email is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only project owner can add members
    if (project.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Only the project owner can add members",
      });
    }

    // Resolve user by email or userId
    let userToAdd;
    if (email) {
      userToAdd = await User.findOne({ email: email.trim().toLowerCase() });
    } else if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }
      userToAdd = await User.findById(userId);
    }

    if (!userToAdd) {
      return res.status(404).json({
        message: "User not found with provided information",
      });
    }

    // Check if user is already a member
    const alreadyMember = project.members.some(
      (member) => member.toString() === userToAdd._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "User is already a project member",
      });
    }

    project.members.push(userToAdd._id);
    await project.save();

    const updatedProject = await Project.findById(projectId)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.status(200).json({
      message: "Member added successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({
      message: "Failed to add member",
      error: error.message,
    });
  }
};

// REMOVE MEMBER FROM PROJECT
const removeMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({
        message: "Invalid project or member ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isOwner = project.owner.toString() === req.userId.toString();
    const isSelf = memberId === req.userId.toString();

    // Only owner can remove other members, or user can leave themselves
    if (!isOwner && !isSelf) {
      return res.status(403).json({
        message: "You are not authorized to remove this member",
      });
    }

    // Project owner cannot be removed as a member
    if (project.owner.toString() === memberId) {
      return res.status(400).json({
        message: "Cannot remove project owner from members",
      });
    }

    project.members = project.members.filter(
      (m) => m.toString() !== memberId
    );

    await project.save();

    // Unassign tasks assigned to the removed member in this project
    await Task.updateMany(
      { project: projectId, assignedTo: memberId },
      { $set: { assignedTo: null } }
    );

    const updatedProject = await Project.findById(projectId)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.status(200).json({
      message: "Member removed successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

// FETCH PROJECT MEMBERS
const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner._id.toString() === req.userId.toString() ||
      project.members.some((m) => m._id.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    res.status(200).json({
      owner: project.owner,
      members: project.members,
    });
  } catch (error) {
    console.error("Fetch members error:", error);
    res.status(500).json({
      message: "Failed to fetch project members",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProjectMembers,
};