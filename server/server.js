const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// Validate critical environment variables in production
if (!process.env.MONGO_URI) {
  console.warn("WARNING: MONGO_URI environment variable is not defined!");
}
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not defined!");
}

// Configurable CORS for production & development
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// API Health & Status check endpoint
app.get("/api/health", (req, res) => {
  const stateMap = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = stateMap[mongoose.connection.readyState] || "unknown";
  res.status(200).json({
    status: "ok",
    server: "running",
    database: dbState,
    connected: mongoose.connection.readyState === 1,
    environment: process.env.NODE_ENV || "development",
  });
});

// Middleware to verify database connectivity before processing API routes
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();

  if (mongoose.connection.readyState !== 1) {
    const stateMap = ["disconnected", "connected", "connecting", "disconnecting"];
    const currentDbState = stateMap[mongoose.connection.readyState] || "unknown";

    return res.status(503).json({
      message:
        "Database is currently unavailable. Please check your MongoDB Atlas Network Access IP whitelist (allow your current IP or 0.0.0.0/0).",
      databaseState: currentDbState,
    });
  }
  next();
});

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);

// Optional: Serve frontend production build if client/dist exists (Unified Full-Stack Deployment)
const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    next();
  });
} else {
  // Root welcome check if frontend is deployed separately
  app.get("/", (req, res) => {
    res.send("Project Management API is running!");
  });
}

// Global 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// MongoDB Connection management
let isConnecting = false;
const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.log("Tip: Check MongoDB Atlas -> Network Access -> IP Access List to ensure your IP is whitelisted (or allow 0.0.0.0/0).");
  } finally {
    isConnecting = false;
  }
};

// Start Express server on 0.0.0.0 for cloud platform compatibility
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, HOST, () => {
    console.log(`TaskFlow Server running on http://${HOST}:${PORT}`);
    connectDB();
  });

  // Periodically retry database connection if disconnected
  setInterval(() => {
    if (mongoose.connection.readyState === 0 && !isConnecting) {
      connectDB();
    }
  }, 10000);
}

module.exports = app;