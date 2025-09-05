# GLS Tracking App

A comprehensive package tracking application built with React frontend and Node.js backend.

## Features

- User Authentication (Register, Login, Password Reset)
- Package Tracking with Real-time Updates
- Admin Dashboard for Package Management
- Role-based Access Control
- Secure API with JWT Authentication
- PostgreSQL Database Integration
- Real-time Notifications
- Responsive Design

## Tech Stack

### Frontend
- React 18
- TypeScript
- Material-UI
- React Router
- Axios
- Socket.IO Client

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Socket.IO
- bcrypt
- Rate Limiting

## Project Structure

```
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   └── package.json
└── package.json           # Root package.json
```

## Installation

1. Install root dependencies:
```bash
npm run install-deps
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in the server directory
   - Configure database connection and JWT secrets

3. Set up database:
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

## Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

Or run individually:
- Backend: `npm run server`
- Frontend: `npm run client`

## Environment Variables

### Server (.env)
```
DATABASE_URL="postgresql://username:password@localhost:5432/gls_tracking"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
PORT=5000
NODE_ENV=development
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/refresh` - Refresh token
- POST `/api/auth/logout` - User logout
- POST `/api/auth/forgot-password` - Password reset request
- POST `/api/auth/reset-password` - Password reset

### Packages
- GET `/api/packages` - Get user packages
- POST `/api/packages` - Create package (admin)
- GET `/api/packages/:id` - Get package details
- PUT `/api/packages/:id` - Update package (admin)
- DELETE `/api/packages/:id` - Delete package (admin)
- GET `/api/packages/track/:trackingNumber` - Track package

### Admin
- GET `/api/admin/users` - Get all users
- GET `/api/admin/packages` - Get all packages
- PUT `/api/admin/users/:id` - Update user
- DELETE `/api/admin/users/:id` - Delete user

## Security Features

- JWT Authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- SQL injection prevention with Prisma

## License

MIT
