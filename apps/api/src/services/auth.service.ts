import userRepository from '../repositories/user.repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors';
import { UserRole } from '../types';
import { getPermissionsByRole } from '../types/permissions';

export class AuthService {
  async login(email: string, password: string): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    // Update last login
    await userRepository.updateLastLogin(user._id.toString());
    
    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions: user.permissions.length > 0 ? user.permissions : getPermissionsByRole(user.role),
    };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Store refresh token
    await userRepository.addRefreshToken(user._id.toString(), refreshToken);
    
    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    
    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }
  
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId?: string;
    branchId?: string;
    role: UserRole;
  }): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    // Check if user exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }
    
    // Get permissions for role
    const permissions = getPermissionsByRole(data.role);
    
    // Create user
    const user = await userRepository.create({
      ...data,
      permissions,
    });
    
    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions,
    };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Store refresh token
    await userRepository.addRefreshToken(user._id.toString(), refreshToken);
    
    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    
    return {
      user: userObject,
      accessToken,
      refreshToken,
    };
  }
  
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);
    
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }
    
    // Verify refresh token is still in user's refresh tokens
    if (!user.refreshTokens.includes(refreshToken)) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    
    // Generate new tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId?.toString(),
      branchId: user.branchId?.toString(),
      role: user.role,
      permissions: user.permissions.length > 0 ? user.permissions : getPermissionsByRole(user.role),
    };
    
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    
    // Replace old refresh token with new one
    await userRepository.removeRefreshToken(user._id.toString(), refreshToken);
    await userRepository.addRefreshToken(user._id.toString(), newRefreshToken);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
  
  async logout(userId: string, refreshToken: string): Promise<void> {
    await userRepository.removeRefreshToken(userId, refreshToken);
  }
}

export default new AuthService();
