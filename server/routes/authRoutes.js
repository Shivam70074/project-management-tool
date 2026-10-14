const express = require("express");

const {
  registerUser,
  loginUser,
  getUserProfile,
  searchUsers,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/profile", protect, getUserProfile);
router.get("/me", protect, getUserProfile);

router.get("/users", protect, searchUsers);

module.exports = router;