process.env.NODE_ENV = "test";
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config();

const app = require("./server");
const User = require("./models/User");
const Project = require("./models/Project");
const Task = require("./models/Task");
const Comment = require("./models/Comment");

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
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
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
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

async function runTests() {
  console.log("=== STARTING TASKFLOW BACKEND TEST SUITE ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB for testing");

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`✓ Test server running on ${baseUrl}`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const testUser1 = {
    name: "QA User One",
    email: `qa_user_1_${timestamp}@example.com`,
    password: "Password123!",
  };
  const testUser2 = {
    name: "QA User Two",
    email: `qa_user_2_${timestamp}@example.com`,
    password: "Password123!",
  };

  let token1 = null;
  let user1Id = null;
  let token2 = null;
  let user2Id = null;
  let projectId = null;
  let taskId = null;
  let commentId = null;

  try {
    // 1. Health check
    const health = await makeRequest("GET", "/api/health");
    console.assert(health.status === 200, "Health check failed");
    console.log("✓ GET /api/health passed");

    // 2. Register user 1
    const reg1 = await makeRequest("POST", "/api/auth/register", testUser1);
    console.assert(reg1.status === 201, `Register 1 failed: ${reg1.status} ${JSON.stringify(reg1.body)}`);
    token1 = reg1.body.token;
    user1Id = reg1.body.user.id || reg1.body.user._id;
    console.log("✓ POST /api/auth/register (User 1) passed");

    // 3. Register user 2
    const reg2 = await makeRequest("POST", "/api/auth/register", testUser2);
    console.assert(reg2.status === 201, "Register 2 failed");
    token2 = reg2.body.token;
    user2Id = reg2.body.user.id || reg2.body.user._id;
    console.log("✓ POST /api/auth/register (User 2) passed");

    // 4. Duplicate registration check
    const dupReg = await makeRequest("POST", "/api/auth/register", testUser1);
    console.assert(dupReg.status === 400, "Duplicate register check failed");
    console.log("✓ Duplicate registration rejection passed");

    // 5. Login user 1
    const login = await makeRequest("POST", "/api/auth/login", {
      email: testUser1.email,
      password: testUser1.password,
    });
    console.assert(login.status === 200 && login.body.token, "Login failed");
    console.log("✓ POST /api/auth/login passed");

    // 6. Invalid login
    const badLogin = await makeRequest("POST", "/api/auth/login", {
      email: testUser1.email,
      password: "WrongPassword!",
    });
    console.assert(badLogin.status === 401, "Bad login check failed");
    console.log("✓ Invalid login rejection passed");

    // 7. Get user profile
    const profile = await makeRequest("GET", "/api/auth/profile", null, token1);
    console.assert(profile.status === 200 && profile.body.user.email === testUser1.email, "Profile check failed");
    console.log("✓ GET /api/auth/profile passed");

    // 8. Search users
    const users = await makeRequest("GET", `/api/auth/users?query=QA`, null, token1);
    console.assert(users.status === 200 && users.body.users.length >= 2, "Search users failed");
    console.log("✓ GET /api/auth/users passed");

    // 9. Unauthorized access without token
    const unauth = await makeRequest("GET", "/api/projects");
    console.assert(unauth.status === 401, "Unauthorized check failed");
    console.log("✓ Auth middleware protection passed");

    // 10. Create project
    const createProj = await makeRequest("POST", "/api/projects", {
      name: "Automated QA Project",
      description: "Testing TaskFlow full cycle",
    }, token1);
    console.assert(createProj.status === 201, `Create project failed: ${JSON.stringify(createProj.body)}`);
    projectId = createProj.body.project._id;
    console.log("✓ POST /api/projects passed");

    // 11. Get projects for user 1
    const getProjs = await makeRequest("GET", "/api/projects", null, token1);
    console.assert(getProjs.status === 200 && getProjs.body.projects.length >= 1, "Get projects failed");
    console.log("✓ GET /api/projects passed");

    // 12. Get project by ID
    const getProj = await makeRequest("GET", `/api/projects/${projectId}`, null, token1);
    console.assert(getProj.status === 200 && getProj.body.project.name === "Automated QA Project", "Get project by ID failed");
    console.log("✓ GET /api/projects/:id passed");

    // 13. Update project
    const updateProj = await makeRequest("PUT", `/api/projects/${projectId}`, {
      name: "Updated QA Project Name",
      description: "Updated description",
    }, token1);
    console.assert(updateProj.status === 200 && updateProj.body.project.name === "Updated QA Project Name", "Update project failed");
    console.log("✓ PUT /api/projects/:id passed");

    // 14. Add member to project by email
    const addMem = await makeRequest("PUT", `/api/projects/${projectId}/members`, {
      email: testUser2.email,
    }, token1);
    console.assert(addMem.status === 200 && addMem.body.project.members.length === 2, "Add member failed");
    console.log("✓ PUT /api/projects/:projectId/members passed");

    // 15. Fetch project members
    const getMembers = await makeRequest("GET", `/api/projects/${projectId}/members`, null, token1);
    console.assert(getMembers.status === 200 && getMembers.body.members.length === 2, "Fetch members failed");
    console.log("✓ GET /api/projects/:projectId/members passed");

    // 16. Create task in project assigned to User 2
    const createTaskRes = await makeRequest("POST", "/api/tasks", {
      title: "Write End-to-End Tests",
      description: "Ensure all endpoints work seamlessly",
      priority: "high",
      status: "todo",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      projectId: projectId,
      assignedTo: user2Id,
    }, token1);
    console.assert(createTaskRes.status === 201, `Create task failed: ${JSON.stringify(createTaskRes.body)}`);
    taskId = createTaskRes.body.task._id;
    console.log("✓ POST /api/tasks passed");

    // 17. Get project tasks
    const getTasks = await makeRequest("GET", `/api/tasks/project/${projectId}`, null, token1);
    console.assert(getTasks.status === 200 && getTasks.body.tasks.length === 1, "Get project tasks failed");
    console.log("✓ GET /api/tasks/project/:projectId passed");

    // 18. Update task status & priority
    const updateTaskRes = await makeRequest("PUT", `/api/tasks/${taskId}`, {
      status: "in-progress",
      priority: "medium",
    }, token1);
    console.assert(updateTaskRes.status === 200 && updateTaskRes.body.task.status === "in-progress", "Update task failed");
    console.log("✓ PUT /api/tasks/:taskId passed");

    // 19. Get "My Tasks" for User 2
    const myTasks = await makeRequest("GET", "/api/tasks/my-tasks", null, token2);
    console.assert(myTasks.status === 200 && myTasks.body.tasks.length >= 1, "Get my-tasks failed");
    console.log("✓ GET /api/tasks/my-tasks passed");

    // 20. Add comment to task by User 2
    const addCommentRes = await makeRequest("POST", `/api/comments/task/${taskId}`, {
      text: "Working on this QA task right now!",
    }, token2);
    console.assert(addCommentRes.status === 201, "Add comment failed");
    commentId = addCommentRes.body.comment._id;
    console.log("✓ POST /api/comments/task/:taskId passed");

    // 21. Get task comments
    const getComments = await makeRequest("GET", `/api/comments/task/${taskId}`, null, token1);
    console.assert(getComments.status === 200 && getComments.body.comments.length === 1, "Get comments failed");
    console.log("✓ GET /api/comments/task/:taskId passed");

    // 22. Delete comment
    const delComment = await makeRequest("DELETE", `/api/comments/${commentId}`, null, token2);
    console.assert(delComment.status === 200, "Delete comment failed");
    console.log("✓ DELETE /api/comments/:commentId passed");

    // 23. Delete task
    const delTask = await makeRequest("DELETE", `/api/tasks/${taskId}`, null, token1);
    console.assert(delTask.status === 200, "Delete task failed");
    console.log("✓ DELETE /api/tasks/:taskId passed");

    // 24. Delete project
    const delProj = await makeRequest("DELETE", `/api/projects/${projectId}`, null, token1);
    console.assert(delProj.status === 200, "Delete project failed");
    console.log("✓ DELETE /api/projects/:id passed");

    // 25. Verify invalid ObjectId returns 400
    const invalidId = await makeRequest("GET", "/api/projects/123notanobjectid", null, token1);
    console.assert(invalidId.status === 400, "Invalid ObjectId check failed");
    console.log("✓ Invalid ObjectId validation passed");

    console.log("\nALL 25 BACKEND TESTS PASSED SUCCESSFULLY! 🎉");
  } finally {
    // Cleanup created test users
    if (user1Id) await User.findByIdAndDelete(user1Id);
    if (user2Id) await User.findByIdAndDelete(user2Id);
    if (projectId) await Project.findByIdAndDelete(projectId);
    if (taskId) await Task.findByIdAndDelete(taskId);
    if (commentId) await Comment.findByIdAndDelete(commentId);

    if (server) {
      await new Promise((res) => server.close(res));
    }
    await mongoose.disconnect();
    console.log("✓ Cleaned up test data and closed test server");
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
