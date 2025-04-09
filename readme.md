# 🚀 XForce Devthon Learning Platform Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14.x_or_later-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-blue?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0.3-green?logo=mongodb)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-9.0.2-purple?logo=jsonwebtokens)](https://jwt.io/)

A robust, feature-rich backend API powering the XForce Devthon Learning Platform - a gamified educational platform for Sri Lankan A/L students. Built with Node.js, Express, and MongoDB, this API delivers comprehensive functionality for learning, quizzing, discussion, and reward management.

## ✨ Features

- **🔐 Authentication System**: JWT-based authentication with register, login, and password reset via email OTP
- **👥 User Management**: Profiles, progress tracking, XP/level system, leaderboards, and achievements
- **📚 Subject Management**: Hierarchical subjects with embedded topics structure
- **🧠 Quiz System**: Comprehensive quiz creation, attempt tracking, and scoring
- **📝 Resource Management**: Study materials with categorization, file uploads, and download tracking
- **💬 Forum System**: Categories, topics, replies with upvote/downvote and best answer capabilities
- **🏆 Rewards System**: Redeemable rewards with points system and stock management
- **📊 Dashboard Analytics**: User progress, achievements, and personalized recommendations
- **👮 Role-Based Access Control**: Admin and user role separation with middleware protection
- **📧 Email Integration**: Password reset and notification system via Brevo SMTP

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Security**: bcryptjs
- **Email Service**: Nodemailer with Brevo SMTP
- **File Uploads**: Multer
- **Security**: Helmet, Express Rate Limit, CORS
- **Validation**: Validator.js
- **Logging**: Morgan, Winston
- **Testing**: Jest, Supertest

## 📂 Project Structure

```
xforce-devthon-backend/
├── models/                 # Mongoose data models
│   ├── userModel.js        # User accounts and profiles
│   ├── subjectModel.js     # Learning subjects with embedded topics
│   ├── quizModel.js        # Quizzes with embedded questions/options
│   ├── resourceModel.js    # Learning resources and materials
│   ├── forumCategoryModel.js # Forum categories
│   ├── forumTopicModel.js  # Forum discussion topics
│   ├── forumReplyModel.js  # Forum replies to topics
│   ├── rewardModel.js      # Redeemable rewards
│   └── ...                 # Additional models
│
├── controllers/            # Business logic for routes
│   ├── authController.js   # Authentication functions
│   ├── userController.js   # User profile and progress functions
│   ├── subjectController.js # Subject and topic management
│   ├── quizController.js   # Quiz functions and attempts
│   ├── resourceController.js # Resource management and downloads
│   ├── forumController.js  # Forum functionality
│   ├── rewardController.js # Rewards management
│   └── ...
│
├── routes/                 # API route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── subjectRoutes.js
│   ├── quizRoutes.js
│   ├── resourceRoutes.js
│   ├── forumRoutes.js
│   ├── rewardRoutes.js
│   ├── uploadRoutes.js
│   └── ...
│
├── middleware/             # Express middleware
│   ├── authMiddleware.js   # Authentication and role-based access
│   ├── errorHandler.js     # Global error handling
│   ├── validation.js       # Request validation
│   └── ...
│
├── utils/                  # Utility functions
│   ├── email.js            # Email sending functionality
│   ├── seeder.js           # Database seeding
│   └── ...
│
├── public/                 # Static files (uploaded resources)
│   └── resources/          # Uploaded learning materials
│
├── server.js               # Application entry point
├── package.json            # Project metadata and dependencies
└── .env.example            # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14.x or later) - [Download & Install Node.js](https://nodejs.org/)
- **MongoDB** - [Download & Install MongoDB](https://www.mongodb.com/try/download/community) or create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cloud account
- **Email Service** - Create a [Brevo](https://www.brevo.com/) account (or another SMTP provider) for email functionality
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mehara-rothila/Xforce-devthon-backend.git
   cd Xforce-devthon-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create required directories**
   ```bash
   # Create directory for resource file uploads
   mkdir -p public/resources
   ```

4. **Configure Environment Variables**

   Create a `.env` file in the project root and set up the following variables:

   ```env
   # Server Configuration
   PORT=5000

   # MongoDB Database Connection
   MONGODB_URI=mongodb://localhost:27017/xforce
   # For MongoDB Atlas: MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/xforce?retryWrites=true&w=majority

   # JSON Web Token Configuration
   # Use a strong random string - generate with: 
   # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   JWT_SECRET=your_strong_random_jwt_secret_key_here
   JWT_EXPIRES_IN=90d

   # File Upload Configuration
   UPLOAD_PATH=./public/resources
   MAX_FILE_SIZE=52428800 # 50MB

   # Email Configuration (Brevo or another SMTP provider)
   SMTP_USER=your_smtp_username
   SMTP_PASSWORD=your_smtp_password
   EMAIL_FROM="XForce Learning <noreply@yourdomain.com>"

   # Optional: Google OAuth Configuration (uncomment if you implement OAuth)
   # GOOGLE_CLIENT_ID=your_google_client_id
   # GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

5. **Database Setup**

   **Option 1: Local MongoDB**
   - Make sure MongoDB service is running locally
   - The application will automatically create the database and collections

   **Option 2: MongoDB Atlas**
   - Create a cluster in MongoDB Atlas
   - Get your connection string from the Atlas dashboard
   - Replace `<username>`, `<password>`, and `cluster` in the MONGODB_URI with your details

6. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The server should start at `http://localhost:5000`

7. **Seed the database (optional)**
   ```bash
   # Seed basic data (subjects, quizzes, etc.)
   npm run seed
   
   # Seed forum data
   npm run seed:forum
   ```

## 🔧 Configuration Detail

### Email Service Setup (Brevo)

1. Create a [Brevo](https://www.brevo.com/) account
2. Navigate to SMTP & API in your Brevo account
3. Create an SMTP key
4. Use the provided SMTP details in your `.env` file:
   - SMTP_USER - Use your Brevo account email
   - SMTP_PASSWORD - Use the SMTP key generated

### JWT Security

Ensure you generate a strong random string for JWT_SECRET. You can use this command:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### File Upload Structure

Uploaded files will be stored in the `public/resources` directory. Ensure this path exists and has appropriate write permissions.

## 📝 API Documentation

The API can be explored using tools like Postman or Insomnia. Import the provided Postman collection in the `docs` folder (if available) or use the endpoint documentation below.

### Authentication
- `POST /api/auth/register` - Create new user account
  ```json
  {
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "passwordConfirm": "password123"
  }
  ```
- `POST /api/auth/login` - Authenticate user
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- `POST /api/auth/forgot-password` - Send password reset OTP via email
  ```json
  {
    "email": "test@example.com"
  }
  ```
- `POST /api/auth/reset-password` - Reset password using OTP
  ```json
  {
    "email": "test@example.com",
    "otp": "123456",
    "password": "newpassword123",
    "passwordConfirm": "newpassword123"
  }
  ```
- `GET /api/auth/me` - Get current user details (requires auth token)

### Users & Profiles
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile
- `GET /api/users/:id/progress` - Get learning progress across subjects
- `GET /api/users/:id/progress/:subjectId` - Get detailed subject progress
- `GET /api/users/:id/achievements` - Get user achievements
- `GET /api/users/:id/activity` - Get recent user activity
- `GET /api/users/:id/dashboard-summary` - Get dashboard overview data
- `GET /api/users/leaderboard` - Get user leaderboard

### Subjects & Topics
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create new subject (Admin)
  ```json
  {
    "name": "Mathematics",
    "description": "Study of numbers and their operations",
    "color": "#4F46E5",
    "icon": "calculator"
  }
  ```
- `GET /api/subjects/:id` - Get subject details with topics
- `PATCH /api/subjects/:id` - Update subject (Admin)
- `DELETE /api/subjects/:id` - Soft delete subject (Admin)
- `GET /api/subjects/:id/topics` - Get topics for subject
- `POST /api/subjects/:id/topics` - Add topic to subject (Admin)
  ```json
  {
    "name": "Algebra",
    "description": "Study of mathematical symbols and rules"
  }
  ```
- `PATCH /api/subjects/:id/topics/:topicId` - Update topic (Admin)
- `DELETE /api/subjects/:id/topics/:topicId` - Delete topic (Admin)

### Quizzes
- `GET /api/quizzes` - Get quizzes with filtering/sorting/pagination
- `POST /api/quizzes` - Create quiz (Admin)
- `GET /api/quizzes/:id` - Get quiz details
- `PATCH /api/quizzes/:id` - Update quiz (Admin)
- `DELETE /api/quizzes/:id` - Delete quiz (Admin)
- `POST /api/quizzes/:id/attempts` - Submit quiz attempt
- `GET /api/quizzes/subject/:subjectId/practice` - Get practice quizzes for subject

### Resources
- `GET /api/resources` - Get resources with filtering/sorting/pagination
- `POST /api/resources` - Create resource (Admin, requires file upload first)
- `GET /api/resources/:id` - Get resource details
- `PATCH /api/resources/:id` - Update resource (Admin)
- `DELETE /api/resources/:id` - Delete resource (Admin)
- `GET /api/resources/:id/download` - Download resource file
- `GET /api/resources/subject/:subjectId/materials` - Get study materials for subject
- `GET /api/resources/category-counts` - Get counts by category

### Forum
- `GET /api/forum/categories` - List forum categories
- `POST /api/forum/categories` - Create category (Admin)
- `PATCH /api/forum/categories/:id` - Update category (Admin)
- `DELETE /api/forum/categories/:id` - Delete category (Admin)
- `GET /api/forum/categories/:id/topics` - List topics in category
- `GET /api/forum/topics/:id` - Get topic with replies
- `POST /api/forum/topics` - Create new topic
- `DELETE /api/forum/topics/:id` - Delete topic (Admin)
- `POST /api/forum/topics/:topicId/replies` - Add reply to topic
- `POST /api/forum/replies/:id/vote` - Upvote/downvote reply
- `PATCH /api/forum/replies/:id/best` - Mark reply as best answer

### Rewards
- `GET /api/rewards` - List rewards with filtering
- `POST /api/rewards` - Create reward (Admin)
- `GET /api/rewards/:id` - Get reward details
- `PATCH /api/rewards/:id` - Update reward (Admin)
- `DELETE /api/rewards/:id` - Delete reward (Admin)
- `POST /api/rewards/:id/redeem` - Redeem a reward

### Uploads
- `POST /api/uploads/resource` - Upload resource file (multipart/form-data)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run forum-specific tests
npm run test:forum
```

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running locally
   - Verify MongoDB connection string in `.env`
   - For Atlas, ensure IP whitelist includes your current IP

2. **Email Sending Failures**
   - Confirm Brevo SMTP credentials are correct
   - Check if your Brevo account is active and not restricted

3. **JWT Authentication Issues**
   - Ensure JWT_SECRET is set correctly in `.env`
   - Check for token expiration in error messages

4. **File Upload Problems**
   - Verify `public/resources` directory exists and has write permissions
   - Check MAX_FILE_SIZE setting if large files are rejected

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Projects

- [XForce Devthon Frontend](https://github.com/mehara-rothila/Xforce-devthon) - The React frontend for this platform

---
