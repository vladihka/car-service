# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites Check

```powershell
node --version    # Should be 18+
npm --version     # Should be 9+
docker --version  # Docker Desktop must be running
```

## Fast Setup

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start Database (Docker)
```powershell
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Configure Environment
```powershell
# Backend
Copy-Item apps\api\.env.example apps\api\.env

# Frontend (optional - defaults work)
Copy-Item apps\web\.env.example apps\web\.env.local
Copy-Item apps\admin\.env.example apps\admin\.env.local
```

### 4. Seed Database
```powershell
npm run seed
```

Wait for: `✅ Seed completed successfully!`

### 5. Start Development Servers
```powershell
npm run dev
```

## Access the Platform

- **API:** http://localhost:3001/api/v1/health
- **Client Portal:** http://localhost:3002
- **Admin Panel:** http://localhost:3003

## Quick Login

### Admin Panel
- Email: `admin@autocare-network.com`
- Password: `Admin123!`

### Client Portal
- Register a new account or use existing client credentials

## All Demo Users

| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | superadmin@car-service.com | SuperAdmin123! |
| Owner | owner@autocare-network.com | Owner123! |
| Admin | admin@autocare-network.com | Admin123! |
| Manager | manager@autocare-network.com | Manager123! |
| Mechanic | mechanic@autocare-network.com | Mechanic123! |
| Accountant | accountant@autocare-network.com | Accountant123! |

## Troubleshooting

**Port in use?**
- Change ports in `.env` files

**MongoDB connection error?**
- Ensure Docker Desktop is running
- Check: `docker ps`

**Module errors?**
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

## Next Steps

1. ✅ You're ready to develop!
2. Explore the codebase
3. Check `ARCHITECTURE.md` for details
4. Review `README.md` for roadmap

Happy coding! 🚀
