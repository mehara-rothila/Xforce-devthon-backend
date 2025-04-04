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

## Project Structure

```
xforce-devthon-backend/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Express middleware
├── models/             # MongoDB schema models
├── routes/             # API routes
└── utils/              # Utility functions
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
