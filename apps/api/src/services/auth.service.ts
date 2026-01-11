import userRepository from '../repositories/user.repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors';
import { UserRole } from '../types';
import { getPermissionsByRole } from '../types/permissions';
import { RegisterDto, AuthResponse, RefreshTokenResponse } from '../types/auth.dto';
import Organization from '../models/Organization';
import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Сервис аутентификации
 * Обрабатывает регистрацию, вход, обновление токенов и выход
 */
export class AuthService {
  /**
   * Вход пользователя
   * @param email Email пользователя
   * @param password Пароль (plain text)
   * @returns Токены и информация о пользователе
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Найти пользователя по email (с паролем)
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedError('Неверный email или пароль');
    }
    
    if (!user.isActive) {
      logger.warn(`Login attempt for inactive account: ${email}`);
      throw new UnauthorizedError('Аккаунт деактивирован');
    }
    
    // Проверить пароль
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Invalid password attempt for: ${email}`);
      throw new UnauthorizedError('Неверный email или пароль');
    }
    
    // Обновить время последнего входа
    await userRepository.updateLastLogin(user._id.toString());
    
    // Сформировать JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions: user.permissions.length > 0 
        ? user.permissions 
        : getPermissionsByRole(user.role),
    };
    
    // Сгенерировать токены
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Сохранить refresh token в базе
    await userRepository.addRefreshToken(user._id.toString(), refreshToken);
    
    // Вернуть данные пользователя без пароля и refresh tokens
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    
    logger.info(`User logged in: ${email} (${user.role})`);
    
    return {
      user: {
        id: userObject._id.toString(),
        email: userObject.email,
        firstName: userObject.firstName,
        lastName: userObject.lastName,
        role: userObject.role,
        organizationId: userObject.organizationId?.toString(),
        branchId: userObject.branchId?.toString(),
        isActive: userObject.isActive,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt,
      },
      accessToken,
      refreshToken,
    };
  }
  
  /**
   * Регистрация нового пользователя
   * Автоматически назначает роль CLIENT если не указана
   * Поддерживает multi-tenant через organizationId
   * @param data Данные для регистрации
   * @returns Токены и информация о пользователе
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    // Проверить уникальность email
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Пользователь с таким email уже существует');
    }
    
    // Если указан organizationId, проверить что организация существует и активна
    if (data.organizationId) {
      const organization = await Organization.findById(data.organizationId);
      if (!organization) {
        throw new NotFoundError('Организация не найдена');
      }
      if (!organization.isActive) {
        throw new UnauthorizedError('Организация неактивна');
      }
    }
    
    // Автоматически назначить роль CLIENT если не указана
    const role = data.role || UserRole.CLIENT;
    
    // Получить права доступа для роли
    const permissions = getPermissionsByRole(role);
    
    // Создать пользователя (пароль будет автоматически захеширован в User model pre-save hook)
    const user = await userRepository.create({
      email: data.email.toLowerCase().trim(),
      password: data.password, // Plain text - будет захеширован в модели
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim(),
      organizationId: data.organizationId 
        ? new mongoose.Types.ObjectId(data.organizationId) 
        : undefined,
      branchId: data.branchId 
        ? new mongoose.Types.ObjectId(data.branchId) 
        : undefined,
      role,
      permissions,
      isActive: true,
    });
    
    // Сформировать JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions,
    };
    
    // Сгенерировать токены
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Сохранить refresh token
    await userRepository.addRefreshToken(user._id.toString(), refreshToken);
    
    // Вернуть данные пользователя без пароля и refresh tokens
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    
    logger.info(`User registered: ${data.email} (${role})`);
    
    return {
      user: {
        id: userObject._id.toString(),
        email: userObject.email,
        firstName: userObject.firstName,
        lastName: userObject.lastName,
        role: userObject.role,
        organizationId: userObject.organizationId?.toString(),
        branchId: userObject.branchId?.toString(),
        isActive: userObject.isActive,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt,
      },
      accessToken,
      refreshToken,
    };
  }
  
  /**
   * Обновление access token через refresh token
   * Реализует ротацию refresh токенов для безопасности
   * @param refreshToken Текущий refresh token
   * @returns Новые access и refresh токены
   */
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    // Верифицировать refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      logger.warn('Invalid refresh token provided');
      throw new UnauthorizedError('Недействительный или истекший refresh token');
    }
    
    // Найти пользователя
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Аккаунт деактивирован');
    }
    
    // Проверить что refresh token все еще в списке активных токенов пользователя
    if (!user.refreshTokens.includes(refreshToken)) {
      logger.warn(`Refresh token reuse attempt for user: ${user.email}`);
      // Если токен был использован повторно - это атака, удаляем все токены пользователя
      await userRepository.clearAllRefreshTokens(user._id.toString());
      throw new UnauthorizedError('Недействительный refresh token. Возможна попытка повторного использования.');
    }
    
    // Сформировать новый JWT payload
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions: user.permissions.length > 0 
        ? user.permissions 
        : getPermissionsByRole(user.role),
    };
    
    // Сгенерировать новые токены
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    
    // Ротация токенов: удалить старый и добавить новый
    await userRepository.removeRefreshToken(user._id.toString(), refreshToken);
    await userRepository.addRefreshToken(user._id.toString(), newRefreshToken);
    
    logger.info(`Tokens refreshed for user: ${user.email}`);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
  
  /**
   * Выход пользователя
   * Инвалидирует refresh token
   * @param userId ID пользователя
   * @param refreshToken Refresh token для удаления
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    await userRepository.removeRefreshToken(userId, refreshToken);
    logger.info(`User logged out: ${userId}`);
  }
  
  /**
   * Получить информацию о текущем пользователе
   * @param userId ID пользователя
   * @returns Информация о пользователе
   */
  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }
    
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    
    return {
      id: userObject._id.toString(),
      email: userObject.email,
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      phone: userObject.phone,
      role: userObject.role,
      permissions: userObject.permissions,
      organizationId: userObject.organizationId?.toString(),
      branchId: userObject.branchId?.toString(),
      isActive: userObject.isActive,
      lastLogin: userObject.lastLogin,
      createdAt: userObject.createdAt,
      updatedAt: userObject.updatedAt,
    };
  }
}

export default new AuthService();
