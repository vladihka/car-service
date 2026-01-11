# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites Check

```powershell
node --version    # Should be 18+
npm --version     # Should be 9+
```

## Fast Setup

### 1. Install Dependencies
```powershell
npm install
```

### 2. Set up MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0 tier)
3. Create database user and whitelist your IP (0.0.0.0/0 for development)
4. Get connection string (starts with `mongodb+srv://`)

### 3. Configure Environment
```powershell
# Backend
Copy-Item apps\api\.env.example apps\api\.env

# Edit apps\api\.env and add:
# - MONGO_URI (your MongoDB Atlas connection string)
# - JWT_ACCESS_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
# - JWT_REFRESH_SECRET (generate another one)
# - SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD

# Frontend (optional - defaults work)
Copy-Item apps\web\.env.local.example apps\web\.env.local
Copy-Item apps\admin\.env.local.example apps\admin\.env.local
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
- Use your SUPERADMIN credentials from `.env` file

### Client Portal
- Register a new account or use existing client credentials

## Troubleshooting

**Port in use?**
- Change ports in `.env` files

**MongoDB connection error?**
- Verify your MongoDB Atlas connection string in `.env`
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure cluster is running

**Environment validation error?**
- Check that all required variables are set in `.env`
- Ensure JWT secrets are 64+ characters
- Verify MONGO_URI starts with `mongodb+srv://`

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
