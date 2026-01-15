# Car Service - Client Portal (Web App)

Frontend application for clients to manage their vehicles and service appointments.

## Features

- ✅ **Authentication System**
  - Login, Register, Forgot Password, Reset Password
  - JWT token management with auto-refresh
  - Persistent sessions via cookies
  - RBAC-based route protection

- ✅ **Dashboard**
  - Metrics cards with trends
  - Quick actions
  - Recent activity feed
  - Responsive design

- ✅ **Navigation**
  - RBAC-aware sidebar menu
  - Dynamic menu based on user role/permissions
  - Mobile-responsive with hamburger menu

- ✅ **Module Pages**
  - Appointments, Work Orders, Invoices, etc.
  - Loading, Error, and Empty states
  - Integrated with backend API

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **UI Components**: Custom components + shared UI package
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WEB_URL=http://localhost:3002
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, register, etc.)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── layout.tsx         # Root layout
│   │   └── providers.tsx      # App providers (Auth, Toast)
│   ├── components/
│   │   ├── common/            # Reusable components (Loading, Error, Empty)
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── icons/             # SVG icon components
│   │   └── layouts/           # Layout components (AuthLayout, DashboardLayout)
│   └── lib/
│       ├── auth/              # Auth API and context
│       ├── hooks/             # Custom React hooks
│       ├── navigation.ts      # Navigation configuration
│       ├── schemas/           # Zod validation schemas
│       ├── api-client.ts      # API client instance
│       └── config.ts          # App configuration
└── public/                    # Static assets
```

## Adding New Modules

### 1. Add Navigation Item

Edit `src/lib/navigation.ts`:

```typescript
{
  label: 'New Module',
  href: '/dashboard/new-module',
  icon: 'icon-name',
  roles: [UserRole.OWNER, UserRole.MANAGER],
  permission: 'module:read',
}
```

### 2. Create Page

Create `src/app/(dashboard)/new-module/page.tsx`:

```typescript
'use client';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useRouteGuard } from '@/lib/hooks/use-route-guard';

export default function NewModulePage() {
  useRouteGuard({
    allowedRoles: [UserRole.OWNER, UserRole.MANAGER],
    requiredPermission: 'module:read',
  });

  return (
    <DashboardLayout>
      {/* Page content */}
    </DashboardLayout>
  );
}
```

### 3. Add API Methods

Create `src/lib/api/new-module.ts`:

```typescript
import { apiClient } from '../api-client';

export async function getModules() {
  return apiClient.get('/api/v1/modules');
}
```

## Route Protection

Use the `useRouteGuard` hook to protect routes:

```typescript
useRouteGuard({
  allowedRoles: [UserRole.OWNER],
  requiredPermission: 'resource:write',
  redirectTo: '/login',
});
```

## Authentication

The app uses JWT tokens stored in HTTP-only cookies (via js-cookie). The API client automatically:

- Adds access token to all requests
- Refreshes token on 401 errors
- Clears tokens on logout

## RBAC (Role-Based Access Control)

Navigation items and routes are automatically filtered based on:
- User role (SuperAdmin, Owner, Manager, etc.)
- User permissions (from backend)

Use `useAuth()` hook to check roles/permissions:

```typescript
const { user, hasRole, hasPermission } = useAuth();

if (hasRole(UserRole.OWNER)) {
  // Show owner-only features
}

if (hasPermission('invoices:write')) {
  // Show write access
}
```

## Styling

The app uses Tailwind CSS with a custom color palette. Primary colors are defined in `tailwind.config.js`.

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deployment

The app can be deployed to Vercel, Netlify, or any Node.js hosting platform.

Build command: `npm run build`
Output directory: `.next`
