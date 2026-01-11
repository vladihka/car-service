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

### 2. Install Docker Desktop
1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Install and restart your computer
3. Start Docker Desktop
4. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

### 3. Install Git (if not already installed)
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Install with default settings

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
2. Edit `apps\api\.env` and update if needed (defaults work for local dev)

#### Client Portal
```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
```

#### Admin Panel
```powershell
Copy-Item apps\admin\.env.example apps\admin\.env.local
```

### Step 4: Start Docker Services
```powershell
docker-compose -f docker-compose.dev.yml up -d
```

This starts:
- MongoDB on port 27017
- Redis on port 6379

Verify containers are running:
```powershell
docker ps
```

### Step 5: Seed Database
```powershell
npm run seed
```

This creates:
- SuperAdmin user
- Demo organization (AutoCare Network)
- Demo branches
- Demo users (Owner, Admin, Manager, Mechanic, Accountant)
- Demo clients and cars
- Demo parts and suppliers

### Step 6: Start Development Servers

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
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

### 2. Test Login (Admin Panel)
1. Open: http://localhost:3003
2. Click "Admin Login"
3. Login with:
   - Email: `admin@autocare-network.com`
   - Password: `Admin123!`

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
- Ensure Docker Desktop is running
- Check container: `docker ps`
- Restart MongoDB: `docker restart car-service-mongodb`
- Check logs: `docker logs car-service-mongodb`

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
2. Backend: Restart API server if needed
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
# View Docker logs
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop Docker services
docker-compose -f docker-compose.dev.yml down

# Clear Docker volumes (⚠️ Deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Rebuild Docker containers
docker-compose -f docker-compose.dev.yml up -d --build

# Run linting
npm run lint

# Build for production
npm run build
```

## Next Steps

1. ✅ Setup complete
2. Explore the codebase structure
3. Review API endpoints at http://localhost:3001/api/v1/health
4. Check README.md for architecture details
5. Review roadmap in README.md for development phases

## Support

For issues, check:
1. Docker Desktop is running
2. All ports are available
3. Environment variables are set correctly
4. Database is seeded
5. All dependencies are installed
