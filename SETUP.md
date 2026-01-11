# Setup Guide - Windows

## Prerequisites Installation

### 1. Install Node.js
1. Download Node.js 18+ from [nodejs.org](https://nodejs.org/)
2. Install with default settings
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

### 2. Install Git (if not already installed)
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Install with default settings

### 3. Set up MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 Free tier is sufficient for development)
4. Create a database user:
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create username and strong password
5. Whitelist your IP address:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" for development (0.0.0.0/0)
   - For production, whitelist only specific IPs
6. Get connection string:
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string (starts with `mongodb+srv://`)
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `car-service` or your preferred database name

## Project Setup

### Step 1: Clone/Navigate to Project
```powershell
cd C:\Users\vladi\OneDrive\Pulpit\car-service
```

### Step 2: Install Dependencies
```powershell
npm install
```

This installs dependencies for all workspaces (api, web, admin, shared).

### Step 3: Configure Environment Variables

#### Backend API
1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item apps\api\.env.example apps\api\.env
   ```
2. Edit `apps\api\.env` and update:
   - `MONGO_URI` - Your MongoDB Atlas connection string
   - `JWT_ACCESS_SECRET` - Generate a secure 64+ character string
   - `JWT_REFRESH_SECRET` - Generate a different secure 64+ character string
   - `SUPERADMIN_EMAIL` - Your admin email
   - `SUPERADMIN_PASSWORD` - Your secure password (min 12 chars)

#### Client Portal
```powershell
Copy-Item apps\web\.env.local.example apps\web\.env.local
```

#### Admin Panel
```powershell
Copy-Item apps\admin\.env.local.example apps\admin\.env.local
```

### Step 4: Seed Database
```powershell
npm run seed
```

This creates:
- SuperAdmin user (uses credentials from `.env`)
- Demo organization (AutoCare Network)
- Demo branches
- Demo users (Owner, Admin, Manager, Mechanic, Accountant)
- Demo clients and cars
- Demo parts and suppliers

### Step 5: Start Development Servers

#### Option A: Start All Apps
```powershell
npm run dev
```

This starts:
- API: http://localhost:3001
- Client Portal: http://localhost:3002
- Admin Panel: http://localhost:3003

#### Option B: Start Individual Apps

**Backend API:**
```powershell
cd apps\api
npm run dev
```

**Client Portal:**
```powershell
cd apps\web
npm run dev
```

**Admin Panel:**
```powershell
cd apps\admin
npm run dev
```

## Testing the Setup

### 1. Test API Health
Open browser: http://localhost:3001/api/v1/health

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "checks": {
    "mongodb": { "status": "healthy", "message": "MongoDB Atlas connection is active" },
    "jwt": { "status": "healthy", "message": "JWT secrets are configured and valid" }
  }
}
```

### 2. Test Login (Admin Panel)
1. Open: http://localhost:3003
2. Click "Admin Login"
3. Login with your SUPERADMIN credentials from `.env`

### 3. Test Login (Client Portal)
1. Open: http://localhost:3002
2. Click "Login"
3. Register a new account or use existing client credentials

## Troubleshooting

### Port Already in Use
If ports 3001, 3002, or 3003 are in use:
- Stop other applications using those ports
- Or change ports in `.env` files and `package.json`

### MongoDB Connection Error
- Ensure MongoDB Atlas cluster is running
- Check that your IP is whitelisted in MongoDB Atlas Network Access
- Verify connection string in `.env` is correct
- Check that database user credentials are correct

### Environment Validation Error
If the application fails to start:
- Check that all required environment variables are set
- Ensure JWT secrets are at least 64 characters
- Verify MONGO_URI starts with `mongodb+srv://`
- Check that SUPERADMIN_PASSWORD is plain text (not hashed)

### Node Modules Issues
If you encounter module errors:
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps\*\node_modules
Remove-Item -Recurse -Force packages\*\node_modules
npm install
```

### TypeScript Errors
```powershell
# Rebuild shared package
cd packages\shared
npm run build
```

## Development Workflow

### Making Changes
1. Code changes are hot-reloaded automatically
2. Backend: tsx watch mode auto-restarts on file changes
3. Frontend: Next.js auto-reloads on file changes

### Database Changes
- Models are in `apps/api/src/models/`
- Run seed again: `npm run seed` (will clear existing data)

### Adding Dependencies
```powershell
# Backend dependency
cd apps\api
npm install <package>

# Frontend dependency
cd apps\web
npm install <package>

# Shared dependency
cd packages\shared
npm install <package>
```

## Useful Commands

```powershell
# Run linting
npm run lint

# Build for production
npm run build

# Seed database
npm run seed
```

## Next Steps

1. ✅ Setup complete
2. Explore the codebase structure
3. Review API endpoints at http://localhost:3001/api/v1/health
4. Check README.md for architecture details
5. Review roadmap in README.md for development phases

## Support

For issues, check:
1. All ports are available
2. Environment variables are set correctly
3. MongoDB Atlas connection is working
4. Database is seeded
5. All dependencies are installed
