const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Comment = require("../models/Comment");

// ==========================================
// CREATE TASK
// ==========================================
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      projectId,
      assignedTo,
    } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Valid projectId is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Validate assignedTo if provided
    let assignedUserId = null;
    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          message: "Invalid assignedTo user ID",
        });
      }

      const isAssigneeMember =
        project.owner.toString() === assignedTo.toString() ||
        project.members.some((m) => m.toString() === assignedTo.toString());

      if (!isAssigneeMember) {
        return res.status(400).json({
          message: "Assigned user is not a member of this project",
        });
      }

      assignedUserId = assignedTo;
    }

    const validPriorities = ["low", "medium", "high"];
    const validStatuses = ["todo", "in-progress", "done"];

    const task = await Task.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      priority: validPriorities.includes(priority) ? priority : "medium",
      status: validStatuses.includes(status) ? status : "todo",
      dueDate: dueDate ? new Date(dueDate) : null,
      project: projectId,
      assignedTo: assignedUserId,
      createdBy: req.userId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      message: "Failed to create task",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL TASKS FOR A PROJECT
// ==========================================
const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const tasks = await Task.find({
      project: projectId,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Fetch project tasks error:", error);
    res.status(500).json({
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

// ==========================================
// GET TASKS ASSIGNED TO LOGGED-IN USER ("MY TASKS")
// ==========================================
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.userId,
    })
      .populate("project", "name description")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Fetch my tasks error:", error);
    res.status(500).json({
      message: "Failed to fetch assigned tasks",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE TASK
// ==========================================
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
    } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project associated with task not found",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: "Task title cannot be empty",
        });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = typeof description === "string" ? description.trim() : "";
    }

    if (status !== undefined) {
      const validStatuses = ["todo", "in-progress", "done"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });
      }
      task.status = status;
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "medium", "high"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          message: `Priority must be one of: ${validPriorities.join(", ")}`,
        });
      }
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === "" || assignedTo === "unassigned") {
        task.assignedTo = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
          return res.status(400).json({
            message: "Invalid assignedTo user ID",
          });
        }
        const isAssigneeMember =
          project.owner.toString() === assignedTo.toString() ||
          project.members.some((m) => m.toString() === assignedTo.toString());

        if (!isAssigneeMember) {
          return res.status(400).json({
            message: "Assigned user is not a member of this project",
          });
        }
        task.assignedTo = assignedTo;
      }
    }

    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate("project", "name description")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE TASK
// ==========================================
const deleteTask = async (req, res) => {
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
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Cascade delete comments belonging to this task
    await Comment.deleteMany({ task: taskId });
    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

// ==========================================
// ASSIGN TASK TO USER
// ==========================================
const assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

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
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.userId.toString() ||
      project.members.some((m) => m.toString() === req.userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    if (userId === null || userId === "" || userId === "unassigned") {
      task.assignedTo = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const isAssignedUserMember =
        project.owner.toString() === userId.toString() ||
        project.members.some((m) => m.toString() === userId.toString());

      if (!isAssignedUserMember) {
        return res.status(400).json({
          message: "User is not a member of this project",
        });
      }

      task.assignedTo = userId;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({
      message: "Task assigned successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({
      message: "Failed to assign task",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getMyTasks,
  updateTask,
  deleteTask,
  assignTask,
};