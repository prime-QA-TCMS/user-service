# Getting Started

**✅ Phase 1 Specification Compliant - Production Ready**

This guide walks you through setting up the User Service on your local machine, from cloning the repository to running and testing the application.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **npm** 10.x or higher (comes with Node.js)
- **MongoDB** 7.x or higher ([Download](https://www.mongodb.com/try/download/community))
- **Git** ([Download](https://git-scm.com/downloads))
- **Code Editor** (VS Code recommended)

### Verify Prerequisites

```bash
node --version    # Should show v20.x or higher
npm --version     # Should show 10.x or higher
mongod --version  # Should show 7.x or higher
git --version     # Should show 2.x or higher
```

---

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url> user-service
cd user-service

# If using SSH
git clone git@github.com:your-org/user-service.git user-service
cd user-service
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js (web framework)
- Mongoose (MongoDB ODM)
- JWT, bcrypt (authentication)
- Prime QA API Common (shared middleware)
- Development tools (TypeScript, Jest, etc.)

---

## Step 3: Start MongoDB

### Windows

**Using MongoDB Community Server:**
```powershell
# MongoDB should start automatically as a Windows Service
# Verify it's running:
Get-Service MongoDB

# If not running, start it:
Start-Service MongoDB

# MongoDB will be available at: mongodb://localhost:27017
```

**Using MongoDB in Docker:**
```powershell
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### Linux/macOS

**Using System Service:**
```bash
# Start MongoDB
sudo systemctl start mongod    # Linux
brew services start mongodb-community  # macOS

# Verify it's running
sudo systemctl status mongod   # Linux
brew services list             # macOS
```

**Using Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### Verify MongoDB Connection

```bash
# Connect using mongosh
mongosh

# You should see a prompt like:
# test>

# List databases
show dbs

# Exit
exit
```

---

## Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# Linux/macOS
touch .env
```

Add the following configuration to `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/user-service

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# Optional: Logging
LOG_LEVEL=debug
```

**Important:** Never commit `.env` to version control. It's already in `.gitignore`.

### Generate Secure JWT Secret

For production, generate a strong random secret:

```bash
# Linux/macOS
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))

# Node.js (any platform)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## Step 5: Seed the Database

The application requires initial data (permissions, roles, tenants) to function. Run the seed script:

```bash
npm run seed
```

This will create:
- **Permissions:** Basic CRUD permissions for users, roles, tenants
- **Roles:** super-admin, admin, user, viewer
- **Tenant:** Default tenant "Default Tenant"
- **Users:** Admin user for testing

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

You'll see output like:
```
✅ Seeded 12 permissions
✅ Seeded 4 roles
✅ Seeded 1 tenant
✅ Seeded 1 user
Database seeding completed successfully!
```

---

## Step 6: Build the Application

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates a `dist/` folder with compiled JavaScript files.

---

## Step 7: Start the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `ts-node-dev` to:
- Run TypeScript directly without building
- Automatically restart on file changes
- Show detailed error messages

You should see:
```
✅ User Service running on port 3000
```

### Production Mode

```bash
npm start
```

This runs the compiled JavaScript from `dist/` folder.

---

## Step 8: Verify the Application is Running

### Check Health Endpoint

Open your browser or use curl:

```bash
# Browser
http://localhost:3000/health

# curl (Linux/macOS)
curl http://localhost:3000/health

# PowerShell
Invoke-RestMethod http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "uptime": 5.234,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "name": "user-service"
  },
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "64MB",
    "rss": "120MB"
  }
}
```

### Check Other Health Endpoints

```bash
# Liveness probe
curl http://localhost:3000/health/live

# Readiness probe
curl http://localhost:3000/health/ready
```

---

## Step 9: Test Authentication

### Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "roleId": "<role-id-from-seed>",
    "tenantId": "<tenant-id-from-seed>"
  }'
```

### Login with Admin User

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

**PowerShell:**
```powershell
$response = Invoke-RestMethod -Uri http://localhost:3000/auth/login `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin123!"}'

$response
$token = $response.data.accessToken
```

**Expected Response:**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "64b7e...",
      "email": "admin@example.com",
      "role": "super-admin",
      "tenantId": "64b7f..."
    }
  }
}
```

### Make Authenticated Requests

Use the `accessToken` from login response:

```bash
# Get all users
curl http://localhost:3000/users \
  -H "Authorization: Bearer <your-access-token>"

# PowerShell
Invoke-RestMethod -Uri http://localhost:3000/users `
  -Headers @{Authorization="Bearer $token"}
```

---

## Step 10: Run Tests

### Run All Tests

```bash
npm test
```

You should see:
```
Test Suites: 18 passed, 18 total
Tests:       536 passed, 2 skipped, 538 total
```

### Run Tests with Coverage

```bash
npm run test:unit
```

This generates a coverage report in `coverage/` folder.

### Run Specific Test File

```bash
npm test -- --testPathPattern="auth.spec"
```

---

## Once Deployed and Running

### Accessing the API

Your User Service is now running at `http://localhost:3000`

**Base Endpoints:**
- `/health` - Health check with details
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/auth/*` - Authentication endpoints
- `/users/*` - User management
- `/roles/*` - Role management
- `/tenants/*` - Tenant management

### API Documentation

See the `documentation/` folder for detailed endpoint documentation:
- [Auth Endpoints](auth.md)
- [User Endpoints](users.md)
- [Role Endpoints](roles.md)
- [Tenant Endpoints](tenants.md)

### Using Postman or Insomnia

1. **Import Collection:**
   - Create a new collection
   - Set base URL: `http://localhost:3000`
   
2. **Setup Environment Variables:**
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: (will be set after login)

3. **Login Flow:**
   - POST `/auth/login` with credentials
   - Extract `accessToken` from response
   - Add to Authorization header: `Bearer {{accessToken}}`

4. **Test Endpoints:**
   - GET `/users` - List users (requires `user.read` permission)
   - POST `/users` - Create user (requires `user.create` permission)
   - GET `/roles` - List roles (requires `role.read` permission)
   - GET `/tenants` - List tenants (requires `tenant.read` permission)

### Database Management

**View Database Contents:**

```bash
# Connect to MongoDB
mongosh

# Switch to user-service database
use user-service

# View collections
show collections

# Query users
db.users.find().pretty()

# Query roles
db.roles.find().pretty()

# Query tenants
db.tenants.find().pretty()

# Query permissions
db.permissions.find().pretty()

# Exit
exit
```

**Using MongoDB Compass:**

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to: `mongodb://localhost:27017`
3. Browse `user-service` database
4. View and edit documents with GUI

### Monitoring Logs

**Development Mode:**
```bash
# Logs are output to console automatically
npm run dev
```

**Production Mode with PM2:**
```bash
# View logs
pm2 logs user-service

# View last 100 lines
pm2 logs user-service --lines 100

# Clear logs
pm2 flush
```

### Common Tasks

#### Reset Database

```bash
# Drop the database and reseed
mongosh --eval "use user-service; db.dropDatabase();"
npm run seed
```

#### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest
```

#### Rebuild Application

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

#### Check for Errors

```bash
# TypeScript type checking
npx tsc --noEmit

# Run linter (if configured)
npm run lint
```

### API Testing Flow

**Complete workflow example:**

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}')

# 2. Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

# 3. Get users list
curl http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN"

# 4. Create new user
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "NewUser123!",
    "roleId": "64b7e...",
    "tenantId": "64b7f..."
  }'

# 5. Get user by ID
curl http://localhost:3000/users/64b7e... \
  -H "Authorization: Bearer $TOKEN"

# 6. Update user
curl -X PUT http://localhost:3000/users/64b7e... \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "updated@example.com"}'

# 7. Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

**PowerShell version:**

```powershell
# 1. Login
$loginResponse = Invoke-RestMethod -Uri http://localhost:3000/auth/login `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin123!"}'

$token = $loginResponse.data.accessToken
$headers = @{Authorization="Bearer $token"}

# 2. Get users
$users = Invoke-RestMethod -Uri http://localhost:3000/users -Headers $headers
$users.data

# 3. Create user (replace IDs with actual values from seed)
$newUser = Invoke-RestMethod -Uri http://localhost:3000/users `
  -Method POST -Headers $headers -ContentType "application/json" `
  -Body '{"email":"newuser@example.com","password":"NewUser123!","roleId":"64b7e...","tenantId":"64b7f..."}'

# 4. Get specific user
$userId = $newUser.data._id
$user = Invoke-RestMethod -Uri "http://localhost:3000/users/$userId" -Headers $headers
```

---

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <process-id> /F

# Linux/macOS
lsof -ti:3000
kill -9 $(lsof -ti:3000)

# Or change port in .env
PORT=3001
```

### MongoDB Connection Error

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```bash
# Check if MongoDB is running
# Windows
Get-Service MongoDB

# Linux
sudo systemctl status mongod

# Start MongoDB if not running
# Windows
Start-Service MongoDB

# Linux
sudo systemctl start mongod

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/user-service
```

### JWT Secret Not Set

**Error:** `JWT_SECRET is not defined`

**Solution:**
- Ensure `.env` file exists in project root
- Verify `JWT_SECRET` is set in `.env`
- Restart the application after editing `.env`

### TypeScript Compilation Errors

**Error:** `TS2304: Cannot find name...`

**Solution:**
```bash
# Clean and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Tests Failing

**Error:** Various test failures

**Solution:**
```bash
# Ensure MongoDB is running
# Reset test database
npm test -- --clearCache
npm test
```

### Permission Denied Errors

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER .

# Or run with proper permissions
sudo npm install
```

---

## Next Steps

### Development

- Review [API Documentation](auth.md) for endpoint details
- Check [Authorization Matrix](../AUTHORIZATION-MATRIX.md) for permission requirements
- Explore test files in `__tests__/` for usage examples
- Review models in `src/models/` to understand data structure

### Deployment

- See [Hosting Requirements](hosting-requirements.md) for deployment guides
- Configure environment for production
- Set up monitoring and logging
- Configure SSL/TLS certificates
- Set up automated backups

### Customization

- Add new endpoints in `src/routes/`
- Add business logic in `src/services/`
- Add validation rules in `src/rules/`
- Add new permissions in seed script
- Add integration tests in `__tests__/`

---

## Getting Help

- Check existing tests for usage examples
- Review error messages in console
- Check MongoDB logs for database issues
- Review `package.json` scripts for available commands
- Consult API documentation in `documentation/` folder

---

## Quick Reference

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:unit

# Seed database
npm run seed

# Docker commands
docker-compose up -d      # Start with Docker
docker-compose down       # Stop containers
docker-compose logs -f    # View logs
```

**Environment Variables:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/user-service
JWT_SECRET=your-secret-key
```

**Default Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

**Health Check:**
- http://localhost:3000/health
- http://localhost:3000/health/live
- http://localhost:3000/health/ready
