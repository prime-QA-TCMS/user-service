# Postman Collection

This folder contains Postman collection and environment files for testing the User Service API.

## Files

- **User-Service.postman_collection.json** - Complete API collection with all endpoints
- **User-Service-Local.postman_environment.json** - Local development environment (localhost:3000)
- **User-Service-Production.postman_environment.json** - Production environment template

## Quick Start

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `User-Service.postman_collection.json`
4. Collection will appear in your workspace

### 2. Import Environment

1. Click **Import** button again
2. Select `User-Service-Local.postman_environment.json`
3. Select the environment from the dropdown (top right)

### 3. Get Started

The collection is organized into folders:
- **Health** - Health check endpoints (no auth required)
- **Auth** - Register, login, refresh, logout
- **Users** - User CRUD operations
- **Roles** - Role management
- **Tenants** - Tenant management

## Recommended Workflow

### First Time Setup

1. **Check Health**
   - Run `Health > Health Check` to verify service is running
   - Should return 200 OK with database status

2. **Get IDs for Testing**
   - Run `Tenants > List Tenants` - automatically saves first tenant ID
   - Run `Roles > List Roles` - automatically saves first role ID
   
3. **Login**
   - Run `Auth > Login` with default admin credentials
   - Automatically saves `accessToken` and `refreshToken` to environment
   - All subsequent requests will use this token

### Daily Usage

1. **Login** first to get fresh tokens
2. Use any authenticated endpoint
3. **Refresh Token** when access token expires
4. **Logout** when done

## Environment Variables

### Automatic Variables
These are set automatically by test scripts:

| Variable | Set By | Description |
|----------|--------|-------------|
| `accessToken` | Login/Refresh | JWT access token for authentication |
| `refreshToken` | Login/Refresh | Refresh token for getting new access token |
| `currentUserId` | Login | Logged in user's ID |
| `currentUserEmail` | Login | Logged in user's email |
| `currentUserRole` | Login | Logged in user's role |
| `roleId` | List Roles | First role ID from list |
| `tenantId` | List Tenants | First tenant ID from list |
| `createdUserId` | Create User | Newly created user ID |
| `createdRoleId` | Create Role | Newly created role ID |
| `createdTenantId` | Create Tenant | Newly created tenant ID |

### Manual Variables
You can customize these in the environment:

| Variable | Default | Description |
|----------|---------|-------------|
| `baseURL` | http://localhost:3000 | API base URL |
| `loginEmail` | admin@example.com | Email for login |
| `loginPassword` | Admin123! | Password for login |
| `newUserEmail` | newuser@example.com | Email for new user creation |
| `newUserPassword` | NewUser123! | Password for new user |
| `updateUserEmail` | updated@example.com | Email for user updates |
| `updateUserPassword` | Updated123! | Password for updates |
| `roleName` | developer | Name for new role |
| `roleDescription` | Developer role... | Description for new role |
| `rolePermissions` | ["user.read",...] | Permissions array (JSON) |
| `tenantName` | Acme Corporation | Name for new tenant |
| `tenantDomain` | acme.com | Domain for new tenant |
| `userId` | (empty) | User ID for operations |
| `page` | 1 | Pagination page number |
| `limit` | 20 | Pagination limit |

## Authentication

The collection uses Bearer Token authentication automatically.

### How It Works

1. Login request saves `accessToken` to environment
2. Collection-level auth is set to Bearer Token using `{{accessToken}}`
3. All requests inherit this auth (except Auth endpoints which override it)
4. Token is sent as: `Authorization: Bearer <token>`

### Manual Token Entry

If needed, you can manually set the token:
1. Go to Environment settings
2. Find `accessToken` variable
3. Paste your token value

## Request Examples

### Creating a User

1. Ensure you have `roleId` and `tenantId` set:
   - Run `Roles > List Roles`
   - Run `Tenants > List Tenants`

2. Customize user details in environment:
   - `newUserEmail`: desired email
   - `newUserPassword`: desired password

3. Run `Users > Create User`

### Using Created Resources

After creating a resource, its ID is saved automatically:
- Created user ID → `createdUserId`
- Created role ID → `createdRoleId`
- Created tenant ID → `createdTenantId`

Use these in subsequent requests by changing:
- `{{userId}}` to `{{createdUserId}}`
- `{{roleId}}` to `{{createdRoleId}}`
- etc.

## Test Scripts

The collection includes test scripts that:

### Login Request
```javascript
// Saves tokens and user info to environment
pm.environment.set('accessToken', response.data.accessToken);
pm.environment.set('refreshToken', response.data.refreshToken);
pm.environment.set('currentUserId', response.data.user.id);
```

### List Roles Request
```javascript
// Saves first role ID for use in other requests
pm.environment.set('roleId', response.data.items[0]._id);
```

### Create User Request
```javascript
// Saves created user ID for immediate use
pm.environment.set('createdUserId', response.data._id);
```

## Production Environment

To use with production:

1. Import `User-Service-Production.postman_environment.json`
2. Update `baseURL` to your production URL
3. Update `loginEmail` and `loginPassword` with production credentials
4. Clear any IDs that were saved from local testing
5. Switch to Production environment in Postman

## Troubleshooting

### 401 Unauthorized

**Problem:** Request returns 401 Unauthorized

**Solution:**
1. Run `Auth > Login` to get fresh token
2. Verify `accessToken` is set in environment
3. Check token hasn't expired (tokens expire after 1 hour)
4. Run `Auth > Refresh Token` if token expired

### Missing Variable

**Problem:** Request shows `{{variableName}}` in URL or body

**Solution:**
1. Check environment is selected (dropdown in top right)
2. Verify variable exists in environment settings
3. Run prerequisite requests (e.g., List Roles before Create User)

### 403 Forbidden

**Problem:** Request returns 403 Forbidden

**Solution:**
- User doesn't have required permission
- Login with admin account: `admin@example.com` / `Admin123!`
- Or assign proper permissions to your role

### Invalid ObjectId

**Problem:** 400/500 error about invalid ObjectId

**Solution:**
1. Run `Tenants > List Tenants` to get valid tenant ID
2. Run `Roles > List Roles` to get valid role ID
3. Verify IDs in environment are 24-character hex strings

## Tips

1. **Use Console**: Open Postman Console (View > Show Postman Console) to see automatic variable updates

2. **Pre-request Scripts**: You can add pre-request scripts to generate dynamic data:
```javascript
pm.environment.set('timestamp', Date.now());
pm.environment.set('randomEmail', `user${Date.now()}@example.com`);
```

3. **Collection Runner**: Use Collection Runner to run entire folders sequentially

4. **Export/Share**: Export environments without sensitive data before sharing:
   - Edit environment
   - Clear `accessToken`, `refreshToken`, passwords
   - Export

5. **Multiple Environments**: Create separate environments for different tenants or user roles

## Support

- See [API Documentation](auth.md) for endpoint details
- Check [Getting Started](getting-started.md) for setup instructions
- Review test files in `__tests__/` for example usage
