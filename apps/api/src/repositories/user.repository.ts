import User, { IUser } from '../models/User';
import { UserRole } from '../types';
import { PaginationParams, PaginatedResponse } from '../types';

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).populate('organizationId branchId').exec();
  }
  
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() })
      .populate('organizationId branchId')
      .select('+password')
      .exec();
  }
  
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }
  
  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('organizationId branchId')
      .exec();
  }
  
  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id).exec();
    return !!result;
  }
  
  async findByOrganization(
    organizationId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<IUser>> {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    
    const query = User.find({ organizationId });
    const total = await User.countDocuments({ organizationId }).exec();
    
    const data = await query
      .populate('organizationId branchId')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  async addRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $push: { refreshTokens: token },
    }).exec();
  }
  
  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: token },
    }).exec();
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    }).exec();
  }
  
  /**
   * Очистить все refresh токены пользователя
   * Используется при обнаружении повторного использования токена
   */
  async clearAllRefreshTokens(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    }).exec();
  }
}

export default new UserRepository();
