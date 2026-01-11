# Troubleshooting Guide

## "Failed to fetch" Error

Эта ошибка означает, что frontend не может подключиться к API серверу.

### Причины и решения:

#### 1. API сервер не запущен

**Симптом:** Ошибка "Failed to fetch" в консоли браузера

**Решение:**
```powershell
# Запустить API сервер
cd apps/api
npm run dev
```

Или из корня проекта:
```powershell
npm run dev --workspace=apps/api
```

**Проверка:**
Откройте в браузере: http://localhost:3001/api/v1/health
Должен вернуть JSON с информацией о состоянии сервера.

#### 2. Отсутствует файл .env

**Симптом:** API сервер не запускается или падает с ошибкой

**Решение:**
1. Создайте файл `apps/api/.env`:
```env
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# MongoDB Atlas (обязательно!)
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/car-service?retryWrites=true&w=majority

# JWT Secrets (обязательно! минимум 64 символа)
JWT_ACCESS_SECRET=your-super-secret-access-token-key-minimum-64-characters-long-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-minimum-64-characters-long-change-in-production

# SuperAdmin (обязательно!)
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=YourSecurePassword123!
```

2. Сгенерируйте JWT secrets:
```powershell
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

#### 3. MongoDB не подключен

**Симптом:** API запускается, но падает с ошибкой подключения к MongoDB

**Решение:**
1. Убедитесь, что `MONGO_URI` правильный
2. Проверьте, что IP адрес добавлен в whitelist MongoDB Atlas
3. Убедитесь, что кластер запущен

#### 4. CORS ошибка

**Симптом:** В консоли браузера ошибка CORS

**Решение:**
Убедитесь, что в `apps/api/.env` указаны правильные URL:
```env
WEB_URL=http://localhost:3002
ADMIN_URL=http://localhost:3003
```

Или вручную через CORS_ORIGIN:
```env
CORS_ORIGIN=http://localhost:3002,http://localhost:3003
```

#### 5. Порт занят

**Симптом:** Ошибка "Port 3001 is already in use"

**Решение:**
1. Найти процесс, использующий порт:
```powershell
netstat -ano | findstr :3001
```

2. Завершить процесс:
```powershell
taskkill /PID <PID> /F
```

Или изменить порт в `apps/api/.env`:
```env
PORT=3001
```

## Быстрая проверка

1. **Проверить, запущен ли API:**
```powershell
curl http://localhost:3001/api/v1/health
```

2. **Проверить логи API сервера:**
Смотрите в консоль, где запущен `npm run dev`

3. **Проверить переменные окружения:**
```powershell
cd apps/api
node -e "require('dotenv').config(); console.log(process.env.MONGO_URI ? 'MONGO_URI: OK' : 'MONGO_URI: MISSING')"
```

## Порядок запуска

1. **Создать .env файл** (если не создан)
2. **Запустить API сервер:**
   ```powershell
   cd apps/api
   npm run dev
   ```
3. **Проверить health endpoint:**
   ```powershell
   curl http://localhost:3001/api/v1/health
   ```
4. **Запустить frontend:**
   ```powershell
   cd apps/web
   npm run dev
   ```

## Дополнительная помощь

Если проблема не решена:
1. Проверьте логи API сервера
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все зависимости установлены: `npm install`
4. Убедитесь, что используется правильная версия Node.js (18+)
