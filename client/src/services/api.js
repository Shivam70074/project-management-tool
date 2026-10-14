const API_URL =
  typeof import.meta.env.VITE_API_URL !== "undefined"
    ? import.meta.env.VITE_API_URL
    : "http://localhost:5000";

let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

async function handleResponse(response) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (typeof onUnauthorizedCallback === "function") {
      onUnauthorizedCallback();
    }
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    const errorMsg =
      data.message ||
      (response.status === 503
        ? "Database is currently unavailable. Please verify your MongoDB Atlas Network Access IP whitelist."
        : `Request failed with status ${response.status}`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function fetchApi(endpoint, options = {}) {
  try {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_URL}${endpoint}`;
    const res = await fetch(url, options);
    return await handleResponse(res);
  } catch (err) {
    if (
      err instanceof TypeError &&
      (err.message.includes("fetch") ||
        err.message.includes("network") ||
        err.message.includes("Network") ||
        err.message.includes("Failed"))
    ) {
      const error = new Error(
        "Unable to connect to backend server. Make sure the backend server is running on port 5000."
      );
      error.isNetworkError = true;
      throw error;
    }
    throw err;
  }
}

export const api = {
  // ==================== AUTH ====================
  async login(email, password) {
    return fetchApi("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name, email, password) {
    return fetchApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  },

  async getProfile() {
    return fetchApi("/api/auth/profile", {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async searchUsers(query = "") {
    const q = encodeURIComponent(query);
    return fetchApi(`/api/auth/users?query=${q}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  // ==================== PROJECTS ====================
  async getProjects() {
    return fetchApi("/api/projects", {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async getProjectById(id) {
    return fetchApi(`/api/projects/${id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async createProject(name, description) {
    return fetchApi("/api/projects", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });
  },

  async updateProject(id, updates) {
    return fetchApi(`/api/projects/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  },

  async deleteProject(id) {
    return fetchApi(`/api/projects/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  },

  async getProjectMembers(projectId) {
    return fetchApi(`/api/projects/${projectId}/members`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async addMember(projectId, payload) {
    return fetchApi(`/api/projects/${projectId}/members`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async removeMember(projectId, memberId) {
    return fetchApi(`/api/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  },

  // ==================== TASKS ====================
  async getProjectTasks(projectId) {
    return fetchApi(`/api/tasks/project/${projectId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async getMyTasks() {
    return fetchApi("/api/tasks/my-tasks", {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async createTask(taskData) {
    return fetchApi("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(taskId, updates) {
    return fetchApi(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  },

  async deleteTask(taskId) {
    return fetchApi(`/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  },

  async assignTask(taskId, userId) {
    return fetchApi(`/api/tasks/${taskId}/assign`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
  },

  // ==================== COMMENTS ====================
  async getTaskComments(taskId) {
    return fetchApi(`/api/comments/task/${taskId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
  },

  async createComment(taskId, text) {
    return fetchApi(`/api/comments/task/${taskId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });
  },

  async deleteComment(commentId) {
    return fetchApi(`/api/comments/${commentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  },
};
