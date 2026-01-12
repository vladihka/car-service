# Архитектура ролей и организаций (RBAC + Multi-Tenant)

## Обзор

Проект реализует полноценную систему ролей (RBAC) и мульти-организационную архитектуру (multi-tenant) для SaaS-платформы автосервисов.

## Роли пользователей (RBAC)

### SuperAdmin
- **Описание**: Супер-администратор платформы
- **Доступ**: Полный доступ ко всем организациям и данным
- **Может**:
  - Создавать и управлять организациями
  - Видеть все данные всех организаций
  - Управлять пользователями платформы
  - Выполнять административные операции

### Owner
- **Описание**: Владелец организации
- **Доступ**: Полный доступ к своей организации и всем её филиалам
- **Может**:
  - Управлять своей организацией
  - Создавать и управлять филиалами в своей организации
  - Управлять пользователями своей организации
  - Видеть все данные своей организации

### Manager
- **Описание**: Менеджер филиала
- **Доступ**: Доступ к своему филиалу
- **Может**:
  - Управлять данными своего филиала
  - Просматривать данные своего филиала
  - Управлять заказами в своем филиале

### Mechanic
- **Описание**: Механик
- **Доступ**: Доступ к назначенным заказам
- **Может**:
  - Просматривать назначенные заказы
  - Обновлять статус заказов
  - Работать с инвентарем своего филиала

### Client
- **Описание**: Клиент автосервиса
- **Доступ**: Доступ только к своим данным
- **Может**:
  - Просматривать свои заказы
  - Просматривать свои автомобили
  - Просматривать свои счета

## Мульти-организационная архитектура (Multi-Tenant)

### Структура данных

```
Organization (Организация)
├── ownerId (User с ролью Owner)
├── name
├── email
├── subscription (план подписки)
└── branches[] (Филиалы)

Branch (Филиал)
├── organizationId (ссылка на Organization)
├── name
├── address
└── users[] (Пользователи, привязанные к филиалу)

User (Пользователь)
├── organizationId (ссылка на Organization)
├── branchId (опционально, ссылка на Branch)
├── role (SuperAdmin, Owner, Manager, Mechanic, Client)
└── permissions[]
```

### Ограничения доступа

#### SuperAdmin
- Видит все организации и все данные
- Может создавать организации
- Может удалять организации

#### Owner
- Видит только свою организацию
- Может создавать филиалы в своей организации
- Может управлять пользователями своей организации
- Видит все данные своей организации

#### Manager
- Видит только свой филиал
- Может управлять данными своего филиала
- Не может создавать филиалы
- Не может управлять организацией

#### Mechanic
- Видит только назначенные заказы
- Может обновлять статус заказов
- Не может создавать филиалы
- Не может управлять организацией

#### Client
- Видит только свои данные
- Может просматривать свои заказы и счета
- Не может создавать филиалы
- Не может управлять организацией

## JWT Payload

JWT токен содержит следующую информацию:

```typescript
interface JWTPayload {
  userId: string;          // ID пользователя
  email: string;           // Email пользователя
  role: string;            // Роль пользователя
  organizationId?: string; // ID организации (если есть)
  branchId?: string;       // ID филиала (если есть)
  permissions: string[];   // Список разрешений
}
```

## Middleware и Guards

### authenticate (Auth Middleware)
Проверяет наличие и валидность JWT токена. Добавляет информацию о пользователе в `req.user`.

```typescript
router.get('/protected', authenticate, handler);
```

### isRole (RBAC Middleware)
Проверяет, что пользователь имеет одну из указанных ролей.

```typescript
router.delete('/users/:id', authenticate, isRole(UserRole.SUPER_ADMIN, UserRole.OWNER), handler);
```

### can (Permission Middleware)
Проверяет, что пользователь имеет указанное разрешение.

```typescript
router.get('/users', authenticate, can('users:read'), handler);
```

### tenantFilter (Tenant Filter Function)
Автоматически фильтрует данные по `organizationId` в зависимости от роли пользователя.

```typescript
const filter = tenantFilter(req.user, {});
const users = await User.find(filter);
```

### branchFilter (Branch Filter Function)
Автоматически фильтрует данные по `branchId` в зависимости от роли пользователя.

```typescript
const filter = branchFilter(req.user, {});
const workOrders = await WorkOrder.find(filter);
```

### combinedFilter (Combined Filter Function)
Комбинирует `tenantFilter` и `branchFilter` для комплексной фильтрации данных.

```typescript
const filter = combinedFilter(req.user, {});
const data = await Model.find(filter);
```

## Примеры защищенных роутов

### Организации

```typescript
// POST /api/v1/organizations - Создать организацию (только SuperAdmin)
router.post('/', authenticate, isRole(UserRole.SUPER_ADMIN), createOrganization);

// GET /api/v1/organizations - Получить список организаций
// SuperAdmin видит все, Owner видит только свою
router.get('/', authenticate, getOrganizations);

// GET /api/v1/organizations/:id - Получить организацию по ID
router.get('/:id', authenticate, getOrganization);

// PATCH /api/v1/organizations/:id - Обновить организацию
router.patch('/:id', authenticate, updateOrganization);

// DELETE /api/v1/organizations/:id - Удалить организацию (только SuperAdmin)
router.delete('/:id', authenticate, isRole(UserRole.SUPER_ADMIN), deleteOrganization);
```

### Филиалы

```typescript
// POST /api/v1/branches - Создать филиал (SuperAdmin, Owner)
router.post('/', authenticate, createBranch);

// GET /api/v1/branches - Получить список филиалов
// SuperAdmin видит все, Owner видит все своей организации, Manager видит только свой
router.get('/', authenticate, getBranches);

// GET /api/v1/branches/:id - Получить филиал по ID
router.get('/:id', authenticate, getBranch);

// PATCH /api/v1/branches/:id - Обновить филиал
router.patch('/:id', authenticate, updateBranch);

// DELETE /api/v1/branches/:id - Удалить филиал (SuperAdmin, Owner)
router.delete('/:id', authenticate, deleteBranch);
```

### Пользователи

```typescript
// GET /api/v1/users - Получить список пользователей
// Owner видит всех пользователей своей организации
// Manager видит пользователей своего филиала
router.get('/', authenticate, can('users:read'), getUsers);

// POST /api/v1/users - Создать пользователя (SuperAdmin, Owner)
router.post('/', authenticate, can('users:write'), createUser);
```

### Заказы (Work Orders)

```typescript
// GET /api/v1/work-orders - Получить список заказов
// Owner видит все заказы своей организации
// Manager видит заказы своего филиала
// Mechanic видит назначенные заказы
// Client видит только свои заказы
router.get('/', authenticate, can('workOrders:read'), getWorkOrders);

// POST /api/v1/work-orders - Создать заказ
router.post('/', authenticate, can('workOrders:write'), createWorkOrder);
```

## Использование фильтров в сервисах

### Пример сервиса с tenantFilter

```typescript
export class UserService {
  async findAll(user: AuthRequest['user']): Promise<UserResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Автоматическая фильтрация по organizationId
    const filter = tenantFilter(user, {});
    const users = await User.find(filter);
    
    return users.map(user => this.mapToResponse(user));
  }
  
  async findById(id: string, user: AuthRequest['user']): Promise<UserResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Фильтрация по organizationId + id
    const filter = tenantFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const user = await User.findOne(filter);
    
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }
    
    return this.mapToResponse(user);
  }
}
```

### Пример сервиса с combinedFilter

```typescript
export class WorkOrderService {
  async findAll(user: AuthRequest['user']): Promise<WorkOrderResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Client видит только свои заказы
    if (user.role === UserRole.CLIENT) {
      filter.clientId = new mongoose.Types.ObjectId(user.userId);
    } else {
      // Для остальных применяем tenant + branch фильтры
      filter = combinedFilter(user, filter);
    }
    
    const workOrders = await WorkOrder.find(filter);
    
    return workOrders.map(order => this.mapToResponse(order));
  }
}
```

## Разрешения (Permissions)

Разрешения определяют, какие операции может выполнять пользователь с определенной ролью.

### Список разрешений

- `users:read` - Просмотр пользователей
- `users:write` - Создание/редактирование пользователей
- `users:delete` - Удаление пользователей
- `organizations:read` - Просмотр организаций
- `organizations:write` - Создание/редактирование организаций
- `organizations:delete` - Удаление организаций
- `branches:read` - Просмотр филиалов
- `branches:write` - Создание/редактирование филиалов
- `branches:delete` - Удаление филиалов
- `workOrders:read` - Просмотр заказов
- `workOrders:write` - Создание/редактирование заказов
- `workOrders:delete` - Удаление заказов
- И другие...

Разрешения для каждой роли определены в `apps/api/src/types/permissions.ts`.

## Миграция данных

При изменении структуры организаций (например, добавление `ownerId`) необходимо:

1. Обновить схему Mongoose
2. Создать миграцию для обновления существующих данных
3. Обновить seed скрипт

## Безопасность

### Важные моменты

1. **Всегда проверяйте права доступа в сервисах**, даже если роут защищен middleware
2. **Используйте tenantFilter/branchFilter** для автоматической фильтрации данных
3. **Не доверяйте client-side данным** - всегда проверяйте `organizationId` и `branchId` на сервере
4. **SuperAdmin имеет особые права** - будьте осторожны при работе с этой ролью
5. **Используйте JWT токены** для аутентификации и авторизации
6. **Храните токены безопасно** на клиенте (httpOnly cookies или secure localStorage)

## Примеры запросов

### Создание организации (SuperAdmin)

```http
POST /api/v1/organizations
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "name": "Автосервис 'Мотор'",
  "ownerId": "507f1f77bcf86cd799439011",
  "email": "info@motor-service.ru",
  "phone": "+7 (495) 123-45-67",
  "address": {
    "street": "ул. Ленина, д. 1",
    "city": "Москва",
    "state": "Московская область",
    "zipCode": "101000",
    "country": "Россия"
  }
}
```

### Создание филиала (Owner)

```http
POST /api/v1/branches
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "name": "Филиал на Соколе",
  "email": "sokol@motor-service.ru",
  "phone": "+7 (495) 123-45-68",
  "address": {
    "street": "Ленинградский пр-т, д. 10",
    "city": "Москва",
    "state": "Московская область",
    "zipCode": "101001",
    "country": "Россия"
  }
}
```

### Получение списка филиалов (Manager)

```http
GET /api/v1/branches
Authorization: Bearer <manager_token>
```

Ответ будет содержать только филиал, к которому привязан Manager (благодаря `combinedFilter`).

## Дополнительные ресурсы

- [Документация по аутентификации](./AUTH.md)
- [Типы и интерфейсы](./src/types/)
- [Middleware](./src/middlewares/)
- [Сервисы](./src/services/)
- [Контроллеры](./src/controllers/)
