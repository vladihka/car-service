# Документация по системе аутентификации

## Обзор

Система аутентификации реализована с использованием JWT (JSON Web Tokens) и поддерживает:
- Регистрацию пользователей
- Вход (login)
- Обновление токенов (refresh)
- Выход (logout)
- Получение информации о текущем пользователе
- Multi-tenant архитектуру (привязка к organization)
- RBAC (Role-Based Access Control)

## Архитектура

### Компоненты

1. **DTO (Data Transfer Objects)** - `apps/api/src/types/auth.dto.ts`
   - Строгая типизация запросов и ответов
   - Валидация с использованием Zod

2. **Сервис** - `apps/api/src/services/auth.service.ts`
   - Бизнес-логика аутентификации
   - Работа с базой данных
   - Генерация и валидация токенов

3. **Контроллер** - `apps/api/src/controllers/auth.controller.ts`
   - Обработка HTTP запросов
   - Валидация входных данных
   - Формирование ответов

4. **Middleware**
   - `auth.middleware.ts` - аутентификация JWT
   - `rbac.middleware.ts` - проверка прав доступа и ролей
   - `validation.middleware.ts` - валидация с Zod

5. **Модель User** - `apps/api/src/models/User.ts`
   - Схема пользователя в MongoDB
   - Автоматическое хеширование паролей
   - Хранение refresh токенов

## API Endpoints

### 1. Регистрация

**POST** `/api/v1/auth/register`

**Описание:** Регистрация нового пользователя. Автоматически назначает роль `CLIENT` если не указана.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Иван",
  "lastName": "Иванов",
  "phone": "+7-999-123-45-67",  // опционально
  "organizationId": "507f1f77bcf86cd799439011",  // опционально (multi-tenant)
  "branchId": "507f1f77bcf86cd799439012",  // опционально
  "role": "Client"  // опционально, по умолчанию CLIENT
}
```

**Валидация:**
- `email`: валидный email адрес
- `password`: минимум 8 символов, должна содержать заглавную букву, строчную букву и цифру
- `firstName`: обязательное поле, минимум 1 символ
- `lastName`: обязательное поле, минимум 1 символ

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Пользователь успешно зарегистрирован",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "Иван",
      "lastName": "Иванов",
      "role": "Client",
      "organizationId": "507f1f77bcf86cd799439011",
      "branchId": "507f1f77bcf86cd799439012",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Ошибки:**
- `400` - Ошибка валидации
- `409` - Пользователь с таким email уже существует

---

### 2. Вход

**POST** `/api/v1/auth/login`

**Описание:** Вход пользователя в систему.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Валидация:**
- `email`: валидный email адрес
- `password`: обязательное поле

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "Иван",
      "lastName": "Иванов",
      "role": "Client",
      "organizationId": "507f1f77bcf86cd799439011",
      "branchId": "507f1f77bcf86cd799439012",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Ошибки:**
- `400` - Ошибка валидации
- `401` - Неверный email или пароль
- `401` - Аккаунт деактивирован

---

### 3. Обновление токена

**POST** `/api/v1/auth/refresh`

**Описание:** Обновление access token через refresh token. Реализует ротацию refresh токенов для безопасности.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Валидация:**
- `refreshToken`: обязательное поле

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Особенности:**
- При обновлении токена старый refresh token удаляется и создается новый (ротация)
- При попытке повторного использования refresh token все токены пользователя инвалидируются

**Ошибки:**
- `400` - Ошибка валидации
- `401` - Недействительный или истекший refresh token
- `401` - Попытка повторного использования токена (все токены инвалидированы)
- `404` - Пользователь не найден

---

### 4. Получение текущего пользователя

**GET** `/api/v1/auth/me`

**Описание:** Получение информации о текущем аутентифицированном пользователе.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "Иван",
    "lastName": "Иванов",
    "phone": "+7-999-123-45-67",
    "role": "Client",
    "permissions": ["clients:read", "cars:read", "workOrders:read"],
    "organizationId": "507f1f77bcf86cd799439011",
    "branchId": "507f1f77bcf86cd799439012",
    "isActive": true,
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Ошибки:**
- `401` - Токен не предоставлен
- `401` - Недействительный или истекший токен
- `404` - Пользователь не найден

---

### 5. Выход

**POST** `/api/v1/auth/logout`

**Описание:** Выход пользователя из системы. Инвалидирует refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Валидация:**
- `refreshToken`: обязательное поле

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Выход выполнен успешно"
}
```

**Ошибки:**
- `400` - Ошибка валидации
- `401` - Токен не предоставлен
- `404` - Пользователь не аутентифицирован

---

## Middleware

### authenticate (authenticateJWT)

Проверяет наличие и валидность access token в заголовке `Authorization`.

**Использование:**
```typescript
import { authenticate } from '../middlewares/auth.middleware';

router.get('/protected', authenticate, handler);
```

**Требования:**
- Заголовок: `Authorization: Bearer <token>`

### authorizeRoles (isRole)

Проверяет, что пользователь имеет одну из указанных ролей.

**Использование:**
```typescript
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { UserRole } from '../types';

router.delete('/users/:id', authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.OWNER), handler);
```

### can (permission check)

Проверяет, что пользователь имеет указанное право доступа.

**Использование:**
```typescript
import { can } from '../middlewares/rbac.middleware';

router.get('/users', authenticate, can('users:read'), handler);
```

---

## Безопасность

### Пароли

- Пароли хешируются с использованием `bcrypt` (10-12 раундов)
- Минимальная длина: 8 символов
- Требования: заглавная буква, строчная буква, цифра
- Пароли никогда не возвращаются в ответах API

### Токены

- **Access Token**: короткоживущий (по умолчанию 15 минут)
- **Refresh Token**: долгоживущий (по умолчанию 7 дней)
- Refresh токены хранятся в базе данных
- Реализована ротация refresh токенов
- При обнаружении повторного использования токена все токены пользователя инвалидируются

### Валидация

- Все входные данные валидируются с использованием Zod
- Email проверяется на уникальность
- Строгая типизация TypeScript

### Multi-tenant

- Пользователи могут быть привязаны к организации (`organizationId`)
- При регистрации проверяется существование и активность организации
- Поддержка привязки к филиалу (`branchId`)

---

## Примеры использования

См. файл `apps/api/api-examples.http` для примеров запросов в формате REST Client.

### Полный сценарий

1. **Регистрация:**
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "Иван",
  "lastName": "Иванов"
}
```

2. **Сохранение токенов** из ответа регистрации

3. **Использование access token** для защищенных запросов:
```bash
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

4. **Обновление токенов** когда access token истечет:
```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "<refresh_token>"
}
```

5. **Выход:**
```bash
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
{
  "refreshToken": "<refresh_token>"
}
```

---

## Обработка ошибок

Все ошибки возвращаются в стандартизированном формате:

```json
{
  "success": false,
  "error": {
    "message": "Описание ошибки",
    "statusCode": 400
  }
}
```

### HTTP коды

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Ошибка валидации
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `409` - Конфликт (например, email уже существует)
- `500` - Внутренняя ошибка сервера

---

## Типы и интерфейсы

Все типы определены в `apps/api/src/types/auth.dto.ts`:

- `RegisterDto` - данные для регистрации
- `LoginDto` - данные для входа
- `RefreshTokenDto` - данные для обновления токена
- `LogoutDto` - данные для выхода
- `AuthResponse` - ответ с токенами и пользователем
- `RefreshTokenResponse` - ответ с новыми токенами
- `MeResponse` - информация о пользователе

---

## Логирование

Все операции аутентификации логируются:
- Успешные входы
- Неудачные попытки входа
- Регистрации
- Обновления токенов
- Выходы
- Попытки повторного использования токенов

Логи доступны через Winston logger.
