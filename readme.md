# Xforce-devthon Backend

Backend API for Xforce-devthon Platform - A gamified learning platform for Sri Lankan A/L students.

## Project Overview

This backend powers a comprehensive learning platform for Advanced Level students with features including:

- User authentication and profile management
- Subject-based learning modules
- Interactive quizzes with progress tracking
- Gamification with achievements and rewards
- Discussion forums for peer learning
- Resource library with educational materials

## Technology Stack

- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT
- **File Storage**: Multer/GridFS
- **Testing**: Jest
- **Logging**: Winston/Morgan

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/mehara-rothila/Xforce-devthon-backend.git
   cd xforce-devthon-backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/xforce
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=90d
   ```

4. Start the development server
   ```
   npm run dev
   ```

## API Documentation

The API is organized around REST. All requests and responses use JSON format.

### Base URL

```
http://localhost:5000/api
```

For full API documentation, see [API.md](API.md)

# xforce-devthon-backend Project Structure

```
xforce-devthon-backend/
├── .env                       # Environment variables
├── .gitignore                 # Git ignore file
├── package.json               # Package configuration
├── package-lock.json          # Package dependency lock
├── readme.md                  # Project documentation
├── server.js                  # Main application entry point
│
├── config/                    # Configuration files
│   ├── config.js              # Application configuration
│   └── db.js                  # Database connection settings
│
├── controllers/               # Business logic controllers
│   ├── authController.js      # Authentication logic
│   ├── forumController.js     # Forum management
│   ├── quizController.js      # Quiz functionality
│   ├── resourceController.js  # Learning resources
│   ├── rewardController.js    # Reward system
│   ├── subjectController.js   # Subject management
│   └── userController.js      # User management
│
├── middleware/                # Application middleware
│   ├── auth.js                # Authentication middleware
│   ├── errorHandler.js        # Error handling
│   └── validation.js          # Input validation
│
├── models/                    # Data models
│   ├── achievementModel.js    # Achievement data model
│   ├── forumCategoryModel.js  # Forum category model
│   ├── forumModel.js          # Main forum model
│   ├── forumReplyModel.js     # Forum replies model
│   ├── forumTopicModel.js     # Forum topics model
│   ├── quizModel.js           # Quiz data model
│   ├── resourceModel.js       # Learning resources model
│   ├── rewardModel.js         # Rewards model
│   ├── subjectModel.js        # Subject model
│   ├── topicModel.js          # Topic model
│   └── userModel.js           # User data model
│
├── node_modules/              # Dependencies (not shown)
│
├── -p/                        # Unknown purpose folder
│
├── public/                    # Public assets
│   └── resources/             # Resource files/uploads
│
├── routes/                    # API route definitions
│   ├── authRoutes.js          # Authentication routes
│   ├── forumRoutes.js         # Forum routes
│   ├── quizRoutes.js          # Quiz routes
│   ├── resourceRoutes.js      # Resource routes
│   ├── rewardRoutes.js        # Reward routes
│   ├── subjectRoutes.js       # Subject routes
│   └── userRoutes.js          # User routes
│
├── test/                      # Testing
│   └── api.test.js            # API tests
│
└── utils/                     # Utility functions
    ├── forumSeeder.js         # Script to seed initial forum data
    ├── forumtest.js           # Utilities or scripts specific to forum testing (?)
    ├── helpers.js             # General helper functions (e.g., formatting, calculations)
    ├── logger.js              # Application logging utility
    ├── seeder.js              # General data seeding script runner/handler
    └── validators.js          # Reusable validation logic/functions (potentially used by middleware)

```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
