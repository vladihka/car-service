# Architecture Documentation

## System Overview

Car Service is a multi-tenant SaaS platform built with a microservices-ready monorepo architecture. The system is designed for scalability, security, and clean separation of concerns.

## Architecture Layers

### Backend Architecture

```
┌─────────────────────────────────────┐
│         Express Routes              │  ← HTTP Layer
├─────────────────────────────────────┤
│         Controllers                 │  ← Request/Response Handling
├─────────────────────────────────────┤
│         Services                    │  ← Business Logic
├─────────────────────────────────────┤
│         Repositories                │  ← Data Access
├─────────────────────────────────────┤
│         Models (Mongoose)           │  ← Database Schema
└─────────────────────────────────────┘
         MongoDB Database
```

#### Layer Responsibilities

1. **Routes** (`apps/api/src/routes/`)
   - Define API endpoints
   - Apply middleware (auth, RBAC, validation)
   - Route to controllers

2. **Controllers** (`apps/api/src/controllers/`)
   - Handle HTTP requests/responses
   - Extract and validate input
   - Call services
   - Format responses

3. **Services** (`apps/api/src/services/`)
   - Business logic orchestration
   - Cross-entity operations
   - Transaction management
   - External API calls

4. **Repositories** (`apps/api/src/repositories/`)
   - Database operations
   - Query building
   - Data transformation
   - Pagination logic

5. **Models** (`apps/api/src/models/`)
   - Mongoose schemas
   - Data validation
   - Indexes
   - Virtual fields

## Multi-Tenancy Architecture

### Tenant Hierarchy

```
Platform (SuperAdmin)
│
└── Organization (Car Service Network)
    │
    ├── Branch (Service Location 1)
    │   ├── Users (Staff)
    │   ├── Clients
    │   ├── Work Orders
    │   └── Inventory
    │
    └── Branch (Service Location 2)
        ├── Users (Staff)
        ├── Clients
        ├── Work Orders
        └── Inventory
```

### Data Isolation Strategy

**Strategy:** Row-level isolation using `organizationId` and `branchId`

- All tenant data includes `organizationId`
- Branch-specific data includes `branchId`
- Middleware automatically filters by tenant from JWT token
- SuperAdmin bypasses tenant restrictions

### Implementation

```typescript
// JWT Token includes tenant context
{
  userId: string;
  organizationId: string;
  branchId: string;
  role: string;
  permissions: string[];
}

// Repository queries automatically filter
async findByOrganization(organizationId: string) {
  return Model.find({ organizationId });
}
```

## Authentication & Authorization

### JWT Flow

```
┌─────────┐     Login     ┌─────────┐
│ Client  │ ───────────>  │   API   │
└─────────┘               └─────────┘
     │                         │
     │  Access Token (15min)   │
     │  Refresh Token (7days)  │
     │ <───────────────────────│
     │                         │
     │  Protected Request      │
     │ ───────────────────────>│
     │                         │
     │  Verify Token           │
     │  Check Permissions      │
     │  Filter by Tenant       │
     │                         │
     │  Response               │
     │ <───────────────────────│
```

### RBAC (Role-Based Access Control)

**Permission Model:**
- Permissions are granular: `resource:action`
- Roles have predefined permission sets
- Permissions stored in JWT for fast access
- Middleware checks permissions per request

**Example:**
```typescript
// Permission: 'workOrders:write'
// Allowed roles: Admin, Manager, Mechanic
can('workOrders:write') → checks JWT permissions
```

### Permission Matrix

See `apps/api/src/types/permissions.ts` for full matrix.

## Database Schema

### Entity Relationships

```
Organization
  ├── has many Branches
  ├── has many Users
  └── has many Clients

Branch
  ├── belongs to Organization
  ├── has many Users
  ├── has many Clients
  ├── has many Work Orders
  └── has many Parts (Inventory)

Client
  ├── belongs to Organization
  ├── belongs to Branch (optional)
  └── has many Cars

Car
  ├── belongs to Client
  ├── belongs to Organization
  └── has many Work Orders

Work Order
  ├── belongs to Organization
  ├── belongs to Branch
  ├── belongs to Client
  ├── belongs to Car
  ├── assigned to User (Mechanic/Manager)
  └── uses Parts

Part
  ├── belongs to Organization
  ├── belongs to Branch (optional)
  └── supplied by Supplier

Invoice
  ├── belongs to Organization
  ├── belongs to Branch
  ├── belongs to Client
  └── linked to Work Order (optional)
```

### Indexes Strategy

- **Tenant Isolation:** `organizationId`, `branchId` indexes on all tenant data
- **Lookups:** `email`, `phone`, `vin`, `sku` unique indexes
- **Performance:** Composite indexes for common queries
- **Sorting:** Indexes on `createdAt`, `updatedAt`

## Frontend Architecture

### Next.js App Router Structure

```
apps/web/ or apps/admin/
├── src/app/
│   ├── (auth)/          # Auth pages (login, register)
│   ├── (dashboard)/     # Protected pages
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── src/components/      # Reusable components
├── src/lib/             # Utilities, API client
├── src/hooks/           # Custom React hooks
└── src/types/           # TypeScript types
```

### Client-Side State Management

- **Auth State:** localStorage (tokens)
- **User State:** Context API or React Query (future)
- **API Calls:** Fetch API with ApiClient utility

### Role-Based Routing

- Routes protected by middleware/guards
- Layouts vary by role
- Navigation menus filtered by permissions

## Security

### Authentication Security
- ✅ JWT with short-lived access tokens
- ✅ Refresh token rotation
- ✅ Password hashing (bcrypt)
- ✅ Token storage in httpOnly cookies (future)

### Authorization Security
- ✅ RBAC with granular permissions
- ✅ Multi-tenant data isolation
- ✅ Permission checks on every request

### Input Security
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (Mongoose)
- ✅ XSS protection (Helmet)
- ✅ CORS configuration

### Data Security
- ✅ Environment variables for secrets
- ✅ Audit logging for all operations
- ✅ Data encryption at rest (MongoDB)

## Scalability Considerations

### Current Architecture (Monolith)
- Single Express API
- Shared MongoDB database
- Row-level multi-tenancy

### Future Scalability Options

1. **Horizontal Scaling**
   - Load balancer
   - Multiple API instances
   - Stateless JWT authentication

2. **Database Scaling**
   - Read replicas
   - Sharding by organizationId
   - Caching layer (Redis)

3. **Microservices Migration**
   - Separate services per domain
   - API Gateway
   - Service mesh

4. **Caching Strategy**
   - Redis for sessions
   - CDN for static assets
   - Query result caching

## Error Handling

### Error Flow

```
Request → Controller → Service → Repository → Database
                                          ↓
                                    Error Thrown
                                          ↓
                            Error Middleware Catches
                                          ↓
                          Format & Log Error
                                          ↓
                              Return Response
```

### Error Types

- `ValidationError` (400) - Invalid input
- `UnauthorizedError` (401) - Not authenticated
- `ForbiddenError` (403) - No permission
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `AppError` (500) - Server error

## Logging & Monitoring

### Logging Strategy

- **Winston** for structured logging
- **Morgan** for HTTP request logging
- **Audit Logs** for all data changes
- Log levels: error, warn, info, debug

### Log Storage

- Development: Console + files
- Production: Centralized logging service (future)

### Monitoring (Future)

- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Metrics collection (Prometheus)
- Health checks and alerts

## API Design

### RESTful Conventions

- `GET /api/v1/resource` - List resources
- `GET /api/v1/resource/:id` - Get resource
- `POST /api/v1/resource` - Create resource
- `PUT /api/v1/resource/:id` - Update resource
- `DELETE /api/v1/resource/:id` - Delete resource

### Response Format

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: {
    message: string;
    statusCode: number;
  }
}

// Paginated
{
  success: true,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

## Deployment Architecture

### Development
- Docker Compose for local services
- Hot reload for all apps
- Local MongoDB and Redis

### Production (Future)
- Container orchestration (Kubernetes)
- Managed databases
- CDN for static assets
- CI/CD pipeline
- Blue-green deployments

## Testing Strategy (Future)

### Unit Tests
- Services and repositories
- Utility functions
- Models validation

### Integration Tests
- API endpoints
- Database operations
- Authentication flow

### E2E Tests
- User workflows
- Multi-tenant scenarios
- Role-based access

## Performance Optimization

### Current
- Database indexes
- Efficient queries
- Connection pooling

### Future
- Redis caching
- Query optimization
- Database query analysis
- API response compression
- CDN for static assets
