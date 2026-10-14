const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://localhost:5000";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const auditResults = [];

function record(name, pass, evidence, details = "") {
  auditResults.push({ name, pass, evidence, details });
  const mark = pass ? "✓ PASS" : "✗ FAIL";
  console.log(`${mark}: ${name} — ${evidence}`);
}

async function runAudit() {
  console.log("==================================================");
  console.log("   TASKFLOW END-TO-END AUDIT & VERIFICATION       ");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const userAData = {
    name: "Audit User A",
    email: `audit_a_${timestamp}@example.com`,
    password: "Password123!",
  };
  const userBData = {
    name: "Audit User B",
    email: `audit_b_${timestamp}@example.com`,
    password: "Password123!",
  };

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;
  let projectId = null;
  let taskId = null;
  let commentId = null;

  try {
    // 1. Health & DB Status Check
    const health = await request("GET", "/api/health");
    record(
      "API Health & DB Connectivity",
      health.status === 200 && health.body.connected === true,
      `Status ${health.status}, DB State: ${health.body.database}, connected: ${health.body.connected}`
    );

    // 2. User Registration
    const regA = await request("POST", "/api/auth/register", userAData);
    tokenA = regA.body.token;
    userAId = regA.body.user?._id || regA.body.user?.id;
    record(
      "User Registration (User A)",
      regA.status === 201 && !!tokenA,
      `Status ${regA.status}, User ID: ${userAId}`
    );

    const regB = await request("POST", "/api/auth/register", userBData);
    tokenB = regB.body.token;
    userBId = regB.body.user?._id || regB.body.user?.id;
    record(
      "User Registration (User B)",
      regB.status === 201 && !!tokenB,
      `Status ${regB.status}, User ID: ${userBId}`
    );

    // 3. Duplicate Registration Rejection
    const dupReg = await request("POST", "/api/auth/register", userAData);
    record(
      "Duplicate Registration Validation",
      dupReg.status === 400,
      `Status ${dupReg.status}, Message: "${dupReg.body.message}"`
    );

    // 4. Invalid Registration (Short Password)
    const shortPass = await request("POST", "/api/auth/register", {
      name: "Short Pass",
      email: `short_${timestamp}@example.com`,
      password: "123",
    });
    record(
      "Password Length Validation (< 6 chars)",
      shortPass.status === 400,
      `Status ${shortPass.status}, Message: "${shortPass.body.message}"`
    );

    // 5. User Login & Token Generation
    const loginRes = await request("POST", "/api/auth/login", {
      email: userAData.email,
      password: userAData.password,
    });
    record(
      "User Login with Valid Credentials",
      loginRes.status === 200 && !!loginRes.body.token,
      `Status ${loginRes.status}, Received JWT token (length ${loginRes.body.token?.length})`
    );

    // 6. Invalid Login Handling
    const badLogin = await request("POST", "/api/auth/login", {
      email: userAData.email,
      password: "WrongPassword999",
    });
    record(
      "Invalid Login Rejection",
      badLogin.status === 401,
      `Status ${badLogin.status}, Message: "${badLogin.body.message}"`
    );

    // 7. Login Persistence (Profile Fetch via Token)
    const profileRes = await request("GET", "/api/auth/profile", null, tokenA);
    record(
      "Login Persistence (Profile via JWT)",
      profileRes.status === 200 && profileRes.body.user?.email === userAData.email,
      `Status ${profileRes.status}, Returned user: ${profileRes.body.user?.name} (${profileRes.body.user?.email})`
    );

    // 8. Expired JWT Handling
    const expiredToken = jwt.sign(
      { userId: userAId },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const expiredRes = await request("GET", "/api/auth/profile", null, expiredToken);
    record(
      "Expired JWT Token Handling",
      expiredRes.status === 401,
      `Status ${expiredRes.status}, Message: "${expiredRes.body.message}"`
    );

    // 9. Protected Routes Unauthorized Access Check
    const noTokenRes = await request("GET", "/api/projects");
    record(
      "Unauthenticated Access to Protected Route",
      noTokenRes.status === 401,
      `Status ${noTokenRes.status}, Message: "${noTokenRes.body.message}"`
    );

    // 10. User Search for Team Collaboration
    const searchRes = await request("GET", `/api/auth/users?query=Audit`, null, tokenA);
    record(
      "Search Registered Users",
      searchRes.status === 200 && Array.isArray(searchRes.body.users) && searchRes.body.users.length >= 2,
      `Status ${searchRes.status}, Found ${searchRes.body.users?.length} registered user(s)`
    );

    // 11. Project Creation
    const createProjRes = await request("POST", "/api/projects", {
      name: "E2E Audit Project",
      description: "Project for comprehensive audit testing",
    }, tokenA);
    projectId = createProjRes.body.project?._id;
    record(
      "Project Creation",
      createProjRes.status === 201 && !!projectId,
      `Status ${createProjRes.status}, Project ID: ${projectId}, Owner: ${createProjRes.body.project?.owner?.name}`
    );

    // 12. Fetch User Projects
    const getProjsRes = await request("GET", "/api/projects", null, tokenA);
    const hasAuditProject = getProjsRes.body.projects?.some((p) => p._id === projectId);
    record(
      "Fetch User Projects",
      getProjsRes.status === 200 && hasAuditProject,
      `Status ${getProjsRes.status}, Total projects returned: ${getProjsRes.body.projects?.length}`
    );

    // 13. Fetch Single Project by ID (Refresh Route Simulation)
    const getSingleRes = await request("GET", `/api/projects/${projectId}`, null, tokenA);
    record(
      "Fetch Project by ID (Refresh Details URL)",
      getSingleRes.status === 200 && getSingleRes.body.project?._id === projectId,
      `Status ${getSingleRes.status}, Project Name: "${getSingleRes.body.project?.name}"`
    );

    // 14. Invalid Project ID Error Handling
    const invalidIdRes = await request("GET", "/api/projects/64f1invalidid000", null, tokenA);
    record(
      "Invalid MongoDB ObjectId Handling",
      invalidIdRes.status === 400,
      `Status ${invalidIdRes.status}, Message: "${invalidIdRes.body.message}"`
    );

    // 15. Nonexistent Project ID (404)
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request("GET", `/api/projects/${nonExistentId}`, null, tokenA);
    record(
      "Nonexistent Project ID Handling (404)",
      notFoundRes.status === 404,
      `Status ${notFoundRes.status}, Message: "${notFoundRes.body.message}"`
    );

    // 16. Unauthorized Access by Non-Member User B
    const unauthProjectRes = await request("GET", `/api/projects/${projectId}`, null, tokenB);
    record(
      "Unauthorized Project Access (Non-Member User B)",
      unauthProjectRes.status === 403,
      `Status ${unauthProjectRes.status}, Message: "${unauthProjectRes.body.message}"`
    );

    // 17. Update Project Details
    const updateProjRes = await request("PUT", `/api/projects/${projectId}`, {
      name: "Updated E2E Audit Project",
      description: "Updated description for verification",
    }, tokenA);
    record(
      "Update Project Details",
      updateProjRes.status === 200 && updateProjRes.body.project?.name === "Updated E2E Audit Project",
      `Status ${updateProjRes.status}, New Name: "${updateProjRes.body.project?.name}"`
    );

    // 18. Add Member to Project (User B invited by User A)
    const addMemberRes = await request("PUT", `/api/projects/${projectId}/members`, {
      email: userBData.email,
    }, tokenA);
    const memberCount = addMemberRes.body.project?.members?.length;
    record(
      "Add Member to Project by Email",
      addMemberRes.status === 200 && memberCount === 2,
      `Status ${addMemberRes.status}, Members count now: ${memberCount}`
    );

    // 19. Duplicate Member Addition Rejection
    const dupMemberRes = await request("PUT", `/api/projects/${projectId}/members`, {
      email: userBData.email,
    }, tokenA);
    record(
      "Prevent Duplicate Member Addition",
      dupMemberRes.status === 400,
      `Status ${dupMemberRes.status}, Message: "${dupMemberRes.body.message}"`
    );

    // 20. Fetch Project Members
    const membersRes = await request("GET", `/api/projects/${projectId}/members`, null, tokenA);
    record(
      "Fetch Project Members",
      membersRes.status === 200 && membersRes.body.members?.length === 2,
      `Status ${membersRes.status}, Members: ${membersRes.body.members?.map((m) => m.name).join(", ")}`
    );

    // 21. Non-Member Access Now Allowed After Joining
    const memberAccessRes = await request("GET", `/api/projects/${projectId}`, null, tokenB);
    record(
      "Member Access After Invitation (User B)",
      memberAccessRes.status === 200,
      `Status ${memberAccessRes.status}, User B successfully accessed project`
    );

    // 22. Task Creation in Project
    const createTaskRes = await request("POST", "/api/tasks", {
      title: "Write Audit Report",
      description: "Verify all endpoints and user flows",
      priority: "high",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      projectId: projectId,
      assignedTo: userBId,
    }, tokenA);
    taskId = createTaskRes.body.task?._id;
    record(
      "Task Creation Assigned to Project Member",
      createTaskRes.status === 201 && !!taskId,
      `Status ${createTaskRes.status}, Task: "${createTaskRes.body.task?.title}", Assigned To: ${createTaskRes.body.task?.assignedTo?.name}`
    );

    // 23. Reject Task Assignment to Non-Member
    const fakeMemberId = new mongoose.Types.ObjectId().toString();
    const badAssignRes = await request("POST", "/api/tasks", {
      title: "Invalid Assignment Task",
      projectId: projectId,
      assignedTo: fakeMemberId,
    }, tokenA);
    record(
      "Reject Task Assignment to Non-Member",
      badAssignRes.status === 400,
      `Status ${badAssignRes.status}, Message: "${badAssignRes.body.message}"`
    );

    // 24. Fetch Project Tasks
    const getTasksRes = await request("GET", `/api/tasks/project/${projectId}`, null, tokenA);
    record(
      "Fetch Project Tasks",
      getTasksRes.status === 200 && getTasksRes.body.tasks?.length === 1,
      `Status ${getTasksRes.status}, Tasks found: ${getTasksRes.body.tasks?.length}`
    );

    // 25. Update Task Status & Priority
    const updateTaskRes = await request("PUT", `/api/tasks/${taskId}`, {
      status: "in-progress",
      priority: "medium",
    }, tokenA);
    record(
      "Update Task Status & Priority",
      updateTaskRes.status === 200 && updateTaskRes.body.task?.status === "in-progress",
      `Status ${updateTaskRes.status}, New Status: "${updateTaskRes.body.task?.status}", Priority: "${updateTaskRes.body.task?.priority}"`
    );

    // 26. "My Tasks" Retrieval (User B fetches assigned tasks)
    const myTasksRes = await request("GET", "/api/tasks/my-tasks", null, tokenB);
    const userBHasTask = myTasksRes.body.tasks?.some((t) => t._id === taskId);
    record(
      "Authenticated 'My Tasks' Retrieval (User B)",
      myTasksRes.status === 200 && userBHasTask,
      `Status ${myTasksRes.status}, User B received ${myTasksRes.body.tasks?.length} assigned task(s)`
    );

    // 27. Task Comments: Add Comment by User B
    const addCommentRes = await request("POST", `/api/comments/task/${taskId}`, {
      text: "Audit in progress, working on verification.",
    }, tokenB);
    commentId = addCommentRes.body.comment?._id;
    record(
      "Add Comment to Task (User B)",
      addCommentRes.status === 201 && !!commentId,
      `Status ${addCommentRes.status}, Comment ID: ${commentId}, Author: ${addCommentRes.body.comment?.user?.name}`
    );

    // 28. Task Comments: Reject Empty Comment
    const emptyCommentRes = await request("POST", `/api/comments/task/${taskId}`, {
      text: "   ",
    }, tokenB);
    record(
      "Reject Empty Comment Submission",
      emptyCommentRes.status === 400,
      `Status ${emptyCommentRes.status}, Message: "${emptyCommentRes.body.message}"`
    );

    // 29. Fetch Task Comments
    const getCommentsRes = await request("GET", `/api/comments/task/${taskId}`, null, tokenA);
    record(
      "Fetch Task Comments",
      getCommentsRes.status === 200 && getCommentsRes.body.comments?.length === 1,
      `Status ${getCommentsRes.status}, Comments count: ${getCommentsRes.body.comments?.length}`
    );

    // 30. Delete Comment by Author (User B)
    const delCommentRes = await request("DELETE", `/api/comments/${commentId}`, null, tokenB);
    record(
      "Delete Comment by Author",
      delCommentRes.status === 200,
      `Status ${delCommentRes.status}, Message: "${delCommentRes.body.message}"`
    );

    // 31. Reject Project Deletion by Non-Owner (User B)
    const badDelProj = await request("DELETE", `/api/projects/${projectId}`, null, tokenB);
    record(
      "Reject Project Deletion by Non-Owner",
      badDelProj.status === 403,
      `Status ${badDelProj.status}, Message: "${badDelProj.body.message}"`
    );

    // 32. Remove Member from Project (User A removes User B)
    const removeMemberRes = await request("DELETE", `/api/projects/${projectId}/members/${userBId}`, null, tokenA);
    record(
      "Remove Member from Project",
      removeMemberRes.status === 200 && removeMemberRes.body.project?.members?.length === 1,
      `Status ${removeMemberRes.status}, Members count after removal: ${removeMemberRes.body.project?.members?.length}`
    );

    // 33. Automatic Task Unassignment upon Member Removal
    const checkUnassignedRes = await request("GET", `/api/tasks/project/${projectId}`, null, tokenA);
    const auditTask = checkUnassignedRes.body.tasks?.find((t) => t._id === taskId);
    record(
      "Automatic Task Unassignment on Member Removal",
      auditTask && auditTask.assignedTo === null,
      `Task assignedTo is now: ${auditTask?.assignedTo}`
    );

    // 34. Delete Task with Cascade Comment Deletion
    const delTaskRes = await request("DELETE", `/api/tasks/${taskId}`, null, tokenA);
    record(
      "Delete Task",
      delTaskRes.status === 200,
      `Status ${delTaskRes.status}, Message: "${delTaskRes.body.message}"`
    );

    // 35. Delete Project by Owner (User A)
    const delProjRes = await request("DELETE", `/api/projects/${projectId}`, null, tokenA);
    record(
      "Delete Project by Owner (Cascade Cleanup)",
      delProjRes.status === 200,
      `Status ${delProjRes.status}, Message: "${delProjRes.body.message}"`
    );

    console.log("\n==================================================");
    const passedCount = auditResults.filter((r) => r.pass).length;
    console.log(`AUDIT FINISHED: ${passedCount} / ${auditResults.length} CHECKS PASSED`);
    console.log("==================================================");
  } finally {
    // Database cleanup for audit users
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const User = require("./models/User");
      const Project = require("./models/Project");
      const Task = require("./models/Task");
      const Comment = require("./models/Comment");

      if (userAId) await User.findByIdAndDelete(userAId);
      if (userBId) await User.findByIdAndDelete(userBId);
      if (projectId) await Project.findByIdAndDelete(projectId);
      if (taskId) await Task.findByIdAndDelete(taskId);
      if (commentId) await Comment.findByIdAndDelete(commentId);
      await mongoose.disconnect();
      console.log("✓ Audit test users and resources cleaned up cleanly.");
    } catch (cleanupErr) {
      console.error("Cleanup note:", cleanupErr.message);
    }
  }
}

runAudit().catch(console.error);
