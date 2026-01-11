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
├── docker/
│   └── Dockerfiles
├── docker-compose.yml
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
- Docker & Docker Compose
- MongoDB
- Redis (planned)

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
- Docker Desktop (Windows)
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

3. **Set up environment variables**
   
   Copy `.env.example` files in each app:
   ```powershell
   # Backend
   Copy-Item apps\api\.env.example apps\api\.env
   
   # Frontend apps
   Copy-Item apps\web\.env.example apps\web\.env
   Copy-Item apps\admin\.env.example apps\admin\.env
   ```
   
   Edit `.env` files with your configuration.

4. **Start Docker services**
   ```powershell
   docker-compose up -d
   ```
   
   This starts:
   - MongoDB (port 27017)
   - Redis (port 6379)

5. **Seed the database**
   ```powershell
   npm run seed
   ```
   
   Creates:
   - SuperAdmin user (email: superadmin@car-service.com, password: SuperAdmin123!)
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
```env
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/car-service

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (future)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# Frontend URLs
WEB_URL=http://localhost:3002
ADMIN_URL=http://localhost:3003
```

#### Client Portal (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

#### Admin Panel (`apps/admin/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3003
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

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs

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

- JWT with refresh token rotation
- RBAC with granular permissions
- Multi-tenant data isolation
- Audit logging for all operations
- Input validation & sanitization
- CORS configuration
- Rate limiting (planned)
- 2FA support (planned)

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

### Docker Production

```powershell
docker-compose -f docker-compose.prod.yml up -d
```

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
