# TaskFlow — Full-Stack Project Management Application

A professional, full-featured project management application built with React, Node.js, Express, and MongoDB Atlas.

TaskFlow helps teams organize projects, manage tasks, collaborate with team members, and track progress through an intuitive dashboard interface.

---

## Features

### Authentication
- User registration with name, email, and password
- Secure login with JWT authentication (7-day tokens)
- Password hashing with bcryptjs
- Protected routes with automatic redirect
- Graceful handling of expired/invalid tokens
- User profile with real name and email display

### Dashboard
- Real-time project and task statistics
- Unique team member count across all projects
- Completed task tracking and completion percentage
- Recent projects quick view
- Recent activity feed from real project and task data
- Quick action buttons for common operations

### Project Management
- Create, view, edit, and delete projects
- Project search and filtering
- Owner/Member role display
- Project detail view with task and member management
- Cascade deletion (deleting a project removes all tasks and comments)

### Task Management
- Create, edit, and delete tasks within projects
- Assign tasks to project members
- Set task status: To Do, In Progress, Done
- Set task priority: Low, Medium, High
- Set due dates
- Quick status change via dropdown
- Task filtering by status with tab navigation
- Task search by title or description
- "My Tasks" view showing all tasks assigned to the current user (server-side filtering)

### Team & Members
- View all team members across projects
- Add members by email or from registered users list
- Remove members (owner only)
- Owner/Member role badges
- Automatic task unassignment when a member is removed
- Duplicate member prevention

### Comments
- Add comments to any task
- View threaded comments with author name and timestamp
- Delete own comments (or project owner can delete any)
- Project membership verification for comment access

### UI/UX
- Professional, modern dashboard design
- Responsive layout for desktop, tablet, and mobile
- Collapsible sidebar with mobile hamburger menu
- Loading states, empty states, and error handling
- Confirmation dialogs for all destructive actions
- Accessible focus states and keyboard navigation
- Consistent status badges and priority indicators

---

## Technology Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 19, Vite 8, JavaScript, CSS |
| Backend     | Node.js, Express 5                |
| Database    | MongoDB Atlas with Mongoose 9     |
| Auth        | JWT (jsonwebtoken), bcryptjs      |
| HTTP Client | Fetch API                         |
| Routing     | React Router DOM v7               |

---

## Project Structure

```
project-management-tool/
├── client/                     # Frontend (React + Vite)
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AddMemberModal.jsx
│   │   │   ├── CommentsModal.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TaskModal.jsx
│   │   ├── context/            # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Route pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyTasks.jsx
│   │   │   ├── ProjectDetails.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── Team.jsx
│   │   ├── services/           # API client
│   │   │   └── api.js
│   │   ├── App.jsx             # Router setup
│   │   ├── App.css             # Application styles
│   │   ├── NewProject.jsx      # Project create/edit modal
│   │   └── main.jsx            # Entry point
│   ├── .env                    # Frontend environment variables
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend (Node.js + Express)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── commentController.js
│   │   ├── projectController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Comment.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── commentRoutes.js
│   │   ├── projectRoutes.js
│   │   └── taskRoutes.js
│   ├── .env                    # Backend environment variables
│   ├── package.json
│   ├── server.js               # Express app entry point
│   └── test-suite.js           # Automated integration tests
│
└── README.md
```

---

## Installation

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB Atlas** account (or local MongoDB instance)

### 1. Clone the repository
```bash
git clone <repository-url>
cd project-management-tool
```

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Install frontend dependencies
```bash
cd ../client
npm install
```

### 4. Configure environment variables

#### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:5000
```

> **Security Note:** Never commit actual credentials to version control. The values above are placeholders.

---

## Running the Application

### Option A: From root directory (Unified Scripts)
```bash
# Build the frontend production bundle
npm run build

# Start the backend server
npm run start:server

# Start the frontend development server
npm run start:client
```

### Option B: Separate terminals

#### Start the backend server
```bash
cd server
node server.js
```
The API will be available at `http://localhost:5000`.

#### Start the frontend development server
```bash
cd client
npm run dev
```
The app will be available at `http://localhost:5173`.

#### Build the frontend for production
```bash
cd client
npm run build
```

---

## API Endpoint Summary

### Authentication
| Method | Endpoint              | Auth | Description             |
|--------|----------------------|------|-------------------------|
| POST   | `/api/auth/register` | No   | Register a new user     |
| POST   | `/api/auth/login`    | No   | Login and receive JWT   |
| GET    | `/api/auth/profile`  | Yes  | Get authenticated user  |
| GET    | `/api/auth/me`       | Yes  | Alias for profile       |
| GET    | `/api/auth/users`    | Yes  | Search registered users |

### Projects
| Method | Endpoint                                  | Auth | Description             |
|--------|------------------------------------------|------|-------------------------|
| POST   | `/api/projects`                          | Yes  | Create a project        |
| GET    | `/api/projects`                          | Yes  | Get user's projects     |
| GET    | `/api/projects/:id`                      | Yes  | Get project by ID       |
| PUT    | `/api/projects/:id`                      | Yes  | Update project          |
| DELETE | `/api/projects/:id`                      | Yes  | Delete project (owner)  |
| GET    | `/api/projects/:projectId/members`       | Yes  | Get project members     |
| PUT    | `/api/projects/:projectId/members`       | Yes  | Add member (owner)      |
| DELETE | `/api/projects/:projectId/members/:memberId` | Yes | Remove member       |

### Tasks
| Method | Endpoint                          | Auth | Description              |
|--------|----------------------------------|------|--------------------------|
| POST   | `/api/tasks`                     | Yes  | Create a task            |
| GET    | `/api/tasks/my-tasks`            | Yes  | Get tasks assigned to me |
| GET    | `/api/tasks/project/:projectId`  | Yes  | Get tasks for a project  |
| PUT    | `/api/tasks/:taskId`             | Yes  | Update a task            |
| DELETE | `/api/tasks/:taskId`             | Yes  | Delete a task            |
| PUT    | `/api/tasks/:taskId/assign`      | Yes  | Assign task to member    |

### Comments
| Method | Endpoint                        | Auth | Description           |
|--------|---------------------------------|------|-----------------------|
| POST   | `/api/comments/task/:taskId`    | Yes  | Add comment to task   |
| GET    | `/api/comments/task/:taskId`    | Yes  | Get task comments     |
| DELETE | `/api/comments/:commentId`      | Yes  | Delete own comment    |

---

## Testing

### Run automated backend tests
```bash
cd server
npm test
```

This runs a 25-test integration suite covering:
- User registration and login
- Duplicate registration rejection
- Invalid login handling
- JWT-protected routes
- Profile retrieval
- User search
- Project CRUD operations
- Member management
- Task CRUD operations
- "My Tasks" endpoint
- Comment CRUD operations
- Invalid ObjectId validation
- Cascade deletion

### Frontend lint check
```bash
cd client
npm run lint
```

### Frontend production build
```bash
cd client
npm run build
```

---

## Security

- All passwords are hashed using bcryptjs (10 rounds)
- JWT tokens expire after 7 days
- Protected routes require valid Bearer token
- Project membership is verified before data access
- Only project owners can add/remove members or delete projects
- Tasks can only be assigned to valid project members
- MongoDB ObjectIds are validated before database queries
- Password hashes are never returned to the frontend
- Environment variables are never exposed to the client

---

## License

ISC
