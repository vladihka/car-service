# Быстрый старт: Аутентификация

## Быстрая проверка работоспособности

### 1. Регистрация пользователя

```bash
POST http://localhost:3001/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123",
  "firstName": "Тест",
  "lastName": "Пользователь"
}
```

**Ожидаемый результат:** 
- Статус: `201 Created`
- В ответе: `accessToken`, `refreshToken`, информация о пользователе
- Роль автоматически установлена: `Client`

### 2. Вход

```bash
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123"
}
```

**Ожидаемый результат:**
- Статус: `200 OK`
- В ответе: `accessToken`, `refreshToken`, информация о пользователе

### 3. Получение информации о себе

```bash
GET http://localhost:3001/api/v1/auth/me
Authorization: Bearer <accessToken>
```

**Ожидаемый результат:**
- Статус: `200 OK`
- В ответе: полная информация о пользователе (без пароля)

### 4. Обновление токена

```bash
POST http://localhost:3001/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

**Ожидаемый результат:**
- Статус: `200 OK`
- В ответе: новые `accessToken` и `refreshToken`
- Старый refresh token больше не работает (ротация)

### 5. Выход

```bash
POST http://localhost:3001/api/v1/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

**Ожидаемый результат:**
- Статус: `200 OK`
- Refresh token инвалидирован

## Проверка защищенных роутов

### Пример защищенного роута

```typescript
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { can } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

// Требует только аутентификации
router.get('/profile', authenticate, getProfile);

// Требует определенную роль
router.delete('/users/:id', authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.OWNER), deleteUser);

// Требует определенное право доступа
router.get('/users', authenticate, can('users:read'), getUsers);
```

## Типичные ошибки

### 401 Unauthorized
- **Причина:** Неверный токен или токен истек
- **Решение:** Обновить токен через `/auth/refresh`

### 400 Bad Request
- **Причина:** Ошибка валидации данных
- **Решение:** Проверить формат данных согласно DTO

### 409 Conflict
- **Причина:** Email уже существует
- **Решение:** Использовать другой email или войти через `/auth/login`

### 403 Forbidden
- **Причина:** Недостаточно прав доступа
- **Решение:** Проверить роль и права пользователя

## Структура проекта

```
apps/api/src/
├── types/
│   └── auth.dto.ts          # DTO для аутентификации
├── services/
│   └── auth.service.ts      # Бизнес-логика
├── controllers/
│   └── auth.controller.ts   # HTTP обработчики
├── middlewares/
│   ├── auth.middleware.ts   # JWT аутентификация
│   ├── rbac.middleware.ts   # RBAC проверки
│   └── validation.middleware.ts # Валидация Zod
├── routes/
│   └── auth.routes.ts       # Маршруты
└── models/
    └── User.ts              # Модель пользователя
```

## Дополнительная документация

Полная документация: `apps/api/AUTH.md`
Примеры запросов: `apps/api/api-examples.http`
