# Car Service - Multi-Tenant SaaS Platform

Enterprise-grade multi-tenant SaaS platform for managing networks of car service centers.

## 🏗️ Architecture

### Monorepo Structure
```
car-service/
├── apps/
│   ├── api/          # Express.js Backend API
│   ├── web/          # Next.js Client Portal
│   └── admin/        # Next.js Admin Panel
├── packages/
│   └── shared/       # Shared types, utils, auth
└── README.md
```

### Technology Stack

**Backend:**
- Node.js 18+
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT (access + refresh tokens)
- RBAC (Role-Based Access Control)

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- React 18+
- Tailwind CSS

**Infrastructure:**
- MongoDB Atlas (cloud database)

### Multi-Tenancy Model

```
Platform (SuperAdmin)
└── Organizations (car service networks)
    └── Branches (service locations)
        └── Users (with roles)
            └── Clients & Work Orders
```

**Data Isolation:** All tenant data is isolated by `organizationId` and `branchId`.

### Roles & Permissions

| Role | Level | Description |
|------|-------|-------------|
| SuperAdmin | Platform | Platform owner, manages all organizations |
| Owner | Organization | Network owner, manages branches |
| Admin | Branch | Branch administrator |
| Manager | Branch | Service advisor, manages work orders |
| Mechanic | Branch | Performs repairs, updates work orders |
| Accountant | Organization | Handles finances and invoices |
| Client | Organization | Portal access to own vehicles/orders |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- MongoDB Atlas account (free tier available)
- Git

### Windows Setup

1. **Clone the repository**
   ```powershell
   git clone <repository-url>
   cd car-service
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Set up MongoDB Atlas**
   
   The application uses MongoDB Atlas (cloud MongoDB) and does not include a local MongoDB container.
   
   **Create MongoDB Atlas Cluster:**
   1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
   2. Create a new cluster (M0 Free tier is sufficient for development)
   3. Create a database user:
      - Go to "Database Access" → "Add New Database User"
      - Choose "Password" authentication
      - Create username and strong password
   4. Whitelist your IP address:
      - Go to "Network Access" → "Add IP Address"
      - Click "Allow Access from Anywhere" for development (0.0.0.0/0)
      - For production, whitelist only specific IPs
   5. Get connection string:
      - Go to "Database" → "Connect"
      - Choose "Connect your application"
      - Copy the connection string (starts with `mongodb+srv://`)
      - Replace `<password>` with your database user password
      - Replace `<dbname>` with `car-service` or your preferred database name
   
   Example connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/car-service?retryWrites=true&w=majority
   ```

4. **Set up environment variables**
   
   Copy `.env.example` files to create your `.env` files:
   ```powershell
   # Backend API
   Copy-Item apps\api\.env.example apps\api\.env
   
   # Frontend apps (Next.js uses .env.local)
   Copy-Item apps\web\.env.local.example apps\web\.env.local
   Copy-Item apps\admin\.env.local.example apps\admin\.env.local
   ```
   
   Edit each `.env` file with your configuration (see Environment Variables section below).
   
   **⚠️ Security Warning:**
   - **NEVER commit `.env` or `.env.local` files to version control**
   - `.env` files are already in `.gitignore`
   - `.env.example` files are safe to commit (they contain placeholders)
   - Use strong, unique values for all secrets in production
   - Different environments (development, staging, production) should use different secrets

5. **Seed the database**
   ```powershell
   npm run seed --workspace=apps/api
   ```
   
   Creates:
   - SuperAdmin user (uses SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD from .env)
   - Demo organization with branches
   - Demo users with different roles
   - Sample clients and cars

6. **Start development servers**
   ```powershell
   npm run dev
   ```
   
   This starts:
   - API: http://localhost:3001
   - Client Portal: http://localhost:3002
   - Admin Panel: http://localhost:3003

### Environment Variables

#### Backend (`apps/api/.env`)

**⚠️ Required Variables (application will not start without them):**

```env
# Node Environment (required)
NODE_ENV=development
# Must be: development, staging, or production

# Server (optional - defaults provided)
PORT=3001
API_URL=http://localhost:3001

# MongoDB Atlas Connection (REQUIRED)
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/car-service?retryWrites=true&w=majority
# Must start with mongodb+srv:// (MongoDB Atlas only)
# Get connection string from MongoDB Atlas Dashboard → Connect → Connect your application

# JWT Secrets (REQUIRED)
JWT_ACCESS_SECRET=your-super-secret-access-token-key-minimum-64-characters-long-change-in-production-use-strong-random-string
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-minimum-64-characters-long-change-in-production-use-strong-random-string
# Minimum 64 characters each
# Must be different from each other
# Generate secure secrets (see Security section below)

# JWT Expiration (optional - defaults provided)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
# Format: number + unit (s=seconds, m=minutes, h=hours, d=days)
# Examples: 15m, 1h, 7d, 30d

# SuperAdmin Credentials (REQUIRED)
SUPERADMIN_EMAIL=admin@yourcompany.com
SUPERADMIN_PASSWORD=YourSecurePassword123!
# Email must be valid email format
# Password must be minimum 12 characters
# Password must be PLAIN TEXT (not bcrypt hash) - will be hashed automatically

# Bcrypt Salt Rounds (optional - defaults to 10)
BCRYPT_SALT_ROUNDS=10
# Recommended: 10-12 for production (higher = more secure but slower)

# CORS Origin (optional - defaults to WEB_URL and ADMIN_URL)
CORS_ORIGIN=
# Comma-separated list of allowed origins (e.g., "http://localhost:3002,http://localhost:3003")
# Leave empty to use WEB_URL and ADMIN_URL from above

# SMTP Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# Frontend URLs (optional - defaults provided)
WEB_URL=http://localhost:3002
ADMIN_URL=http://localhost:3003
```

**🔒 Generating Secure JWT Secrets:**

**On Windows (PowerShell):**
```powershell
# Generate 64-character random string for JWT_ACCESS_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Generate 64-character random string for JWT_REFRESH_SECRET (different from access secret)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**On Linux/Mac:**
```bash
# Generate 64-character random string for JWT_ACCESS_SECRET
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# Generate 64-character random string for JWT_REFRESH_SECRET
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
```

**Or use Node.js:**
```javascript
require('crypto').randomBytes(64).toString('hex')
```

#### Client Portal (`apps/web/.env.local`)

**Note:** Next.js automatically loads `.env.local` files - no `dotenv` package needed.

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application Name
NEXT_PUBLIC_APP_NAME=Car Service Portal

# Stripe Publishable Key (Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
```

#### Admin Panel (`apps/admin/.env.local`)

**Note:** Next.js automatically loads `.env.local` files - no `dotenv` package needed.

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application Name
NEXT_PUBLIC_APP_NAME=Car Service Admin
```

## 📁 Project Structure

### Backend (`apps/api`)

```
apps/api/
├── src/
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── models/           # Mongoose schemas
│   ├── middlewares/      # Auth, RBAC, tenant, audit
│   ├── routes/           # API routes
│   ├── types/            # TypeScript types
│   ├── utils/            # Helpers
│   ├── validators/       # Request validation
│   ├── config/           # Configuration
│   └── app.ts            # Express app setup
├── seeds/                # Database seed scripts
├── package.json
└── tsconfig.json
```

**Architecture Layers:**
1. **Controllers** - Handle HTTP requests/responses
2. **Services** - Business logic and orchestration
3. **Repositories** - Database operations (Mongoose)
4. **Models** - Database schemas

### Frontend (`apps/web` & `apps/admin`)

```
apps/web/ or apps/admin/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Auth pages
│   │   ├── (dashboard)/  # Protected pages
│   │   └── layout.tsx
│   ├── components/       # React components
│   ├── lib/              # Utilities, API client
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript types
│   └── styles/           # Global styles
├── public/               # Static assets
├── package.json
└── next.config.js
```

## 🔐 Authentication & Authorization

### JWT Flow

1. **Login** → Returns `accessToken` (15min) + `refreshToken` (7days)
2. **Protected Routes** → Require `Authorization: Bearer <accessToken>`
3. **Token Refresh** → Use refresh token to get new access token
4. **Logout** → Invalidates refresh token

### RBAC Permissions

Permissions are granular and role-based:

```typescript
// Example permissions
{
  "users:read": ["SuperAdmin", "Owner", "Admin"],
  "users:write": ["SuperAdmin", "Owner"],
  "workOrders:read": ["Admin", "Manager", "Mechanic", "Client"],
  "workOrders:write": ["Admin", "Manager", "Mechanic"],
  "invoices:read": ["Admin", "Accountant", "Owner"],
  "invoices:write": ["Admin", "Accountant"]
}
```

### Multi-Tenant Middleware

Automatically filters data by `organizationId` and `branchId` from JWT token.

## 📊 Database Schema

### Core Entities

- **Organization** - Service network
- **Branch** - Service location
- **User** - System users with roles
- **Role** - Permission definitions
- **Client** - Customers
- **Car** - Vehicles (VIN tracking)
- **WorkOrder** - Service jobs (Kanban)
- **Part** - Inventory items
- **Supplier** - Parts suppliers
- **Invoice** - Billing documents
- **Payment** - Payment records
- **Subscription** - SaaS subscriptions
- **AuditLog** - Activity tracking

## 🛠️ Scripts

```powershell
# Development
npm run dev              # Start all apps in dev mode

# Backend only
cd apps/api
npm run dev              # Start API server
npm run seed             # Seed database

# Frontend only
cd apps/web
npm run dev              # Start client portal
cd apps/admin
npm run dev              # Start admin panel

# Build
npm run build            # Build all apps
```

## 📈 Development Roadmap

### Month 1: Foundation (Current Sprint)
- ✅ Monorepo setup
- ✅ Backend architecture
- ✅ Authentication & RBAC
- ✅ Multi-tenancy core
- ✅ Basic CRUD for Organizations, Branches, Users
- ✅ Client Portal foundation
- ✅ Admin Panel foundation

### Month 2: Core Features
- Work Orders management (Kanban)
- Client & Car management
- Inventory basics
- Basic reporting

### Month 3: Operations
- Advanced Work Orders (assignments, statuses)
- Inventory management (stock, suppliers)
- Client portal enhancements
- Mobile responsiveness

### Month 4: Finance
- Invoicing system
- Payment processing
- Financial reporting
- Accountant role features

### Month 5: Analytics & Automation
- Advanced analytics dashboard
- Automated notifications (email/SMS)
- Audit logs viewer
- Subscription management UI

### Month 6: Enterprise Features
- Multi-branch analytics
- Advanced reporting
- API documentation
- Performance optimization
- Security hardening

## 🔒 Security

### Security Features

- **JWT Authentication** with refresh token rotation
- **RBAC** with granular permissions
- **Multi-tenant data isolation**
- **Audit logging** for all operations
- **Input validation & sanitization**
- **CORS configuration**
- **Environment validation** on startup (fail-fast)
- **Strong password requirements** for SuperAdmin
- **MongoDB Atlas** connection (encrypted, cloud-managed)
- Rate limiting (planned)
- 2FA support (planned)

### Environment Configuration & Fail-Fast Validation

The application uses **fail-fast** validation on startup:

- **Environment variables are validated using Zod schema**
- **Application will NOT start if required variables are missing or invalid**
- **Clear error messages** guide you to fix configuration issues
- **Typed configuration** ensures type safety across the application

**Fail-fast validation checks:**
- `MONGO_URI` must be present and start with `mongodb+srv://`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be at least 64 characters
- `SUPERADMIN_EMAIL` must be a valid email format
- `SUPERADMIN_PASSWORD` must be at least 12 characters and plain text (not hashed)
- `NODE_ENV` must be one of: `development`, `staging`, `production`
- JWT secrets must be different from each other
- JWT expiration formats must match pattern (e.g., `15m`, `7d`)
- `BCRYPT_SALT_ROUNDS` must be between 10 and 12

**All services import from `config` module, never `process.env` directly.**

### Security Best Practices

#### Environment Variables

**⚠️ NEVER commit `.env` files to version control**

- All `.env` and `.env.local` files are in `.gitignore`
- `.env.example` files are safe to commit (they contain placeholders only)
- Copy `.env.example` to `.env` and fill in actual values
- Use different secrets for each environment (development, staging, production)
- Rotate secrets regularly in production
- Use strong, randomly generated secrets (minimum 64 characters for JWT)

## 📝 API Documentation

API endpoints follow RESTful conventions:

- `GET /api/v1/{resource}` - List resources
- `GET /api/v1/{resource}/:id` - Get single resource
- `POST /api/v1/{resource}` - Create resource
- `PUT /api/v1/{resource}/:id` - Update resource
- `DELETE /api/v1/{resource}/:id` - Delete resource

Authentication required for all endpoints except:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

## 🧪 Testing

```powershell
# Run tests (when implemented)
npm test

# Backend tests
cd apps/api
npm test

# Frontend tests
cd apps/web
npm test
```

## 📦 Deployment

### Production Checklist

- [ ] Change all JWT secrets
- [ ] Set secure MongoDB connection
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up CI/CD

### Production Deployment

The application runs directly with Node.js and connects to MongoDB Atlas. No Docker or Redis required.

**Production Deployment Steps:**

1. **Set environment variables:**
   ```powershell
   NODE_ENV=production
   MONGO_URI=<your-production-mongodb-atlas-uri>
   # ... other required variables
   ```

2. **Build the application:**
   ```powershell
   npm run build
   ```

3. **Start with process manager (PM2):**
   ```powershell
   npm install -g pm2
   cd apps/api
   pm2 start dist/index.js --name car-service-api
   ```

4. **Set up reverse proxy (nginx) if needed** for production domains.

5. **Configure monitoring and backups** for MongoDB Atlas.

## 🤝 Contributing

This is an enterprise SaaS platform. All code should follow:
- TypeScript strict mode
- ESLint rules
- Layered architecture
- RBAC principles
- Multi-tenant isolation

## 📄 License

Proprietary - All rights reserved

## 👥 Support

For issues and questions, contact the development team.

---

**Built for scalability, security, and enterprise use.**
