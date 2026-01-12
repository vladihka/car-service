/**
 * Сервис для работы с записями клиентов (Appointments)
 * Реализует бизнес-логику для управления записями
 */

import Appointment, { IAppointment } from '../models/Appointment';
import Client from '../models/Client';
import Branch from '../models/Branch';
import Service from '../models/Service';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
  AssignAppointmentDto,
  AppointmentResponse,
} from '../types/appointment.dto';
import { AppointmentStatus } from '../types';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class AppointmentService {
  /**
   * Создать новую запись
   * Client может создавать записи
   * 
   * @param data - Данные для создания записи
   * @param user - Пользователь, создающий запись
   * @returns Созданная запись
   */
  async create(data: CreateAppointmentDto, user: AuthRequest['user']): Promise<AppointmentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Проверить, что Client может создавать записи
    if (user.role !== UserRole.CLIENT) {
      throw new ForbiddenError('Только клиенты могут создавать записи');
    }
    
    // Проверить, что клиент существует и принадлежит организации пользователя
    const client = await Client.findById(data.clientId);
    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }
    
    // Проверить, что филиал существует
    const branch = await Branch.findById(data.branchId);
    if (!branch) {
      throw new NotFoundError('Филиал не найден');
    }
    
    // Проверить, что филиал принадлежит организации пользователя
    if (user.organizationId && branch.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Филиал не принадлежит вашей организации');
    }
    
    // Проверить, что клиент принадлежит организации пользователя
    if (user.organizationId && client.organizationId.toString() !== user.organizationId) {
      throw new ForbiddenError('Клиент не принадлежит вашей организации');
    }
    
    // Проверить, что услуги существуют и принадлежат организации
    const services = await Service.find({
      _id: { $in: data.services.map(id => new mongoose.Types.ObjectId(id)) },
      organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : branch.organizationId,
      isActive: true,
    });
    
    if (services.length !== data.services.length) {
      throw new NotFoundError('Одна или несколько услуг не найдены');
    }
    
    // Проверить, что дата записи в будущем
    if (data.preferredDate < new Date()) {
      throw new BadRequestError('Дата записи не может быть в прошлом');
    }
    
    // Создать запись
    const appointment = new Appointment({
      organizationId: user.organizationId 
        ? new mongoose.Types.ObjectId(user.organizationId)
        : branch.organizationId,
      branchId: new mongoose.Types.ObjectId(data.branchId),
      clientId: new mongoose.Types.ObjectId(data.clientId),
      car: data.car,
      services: data.services.map(id => new mongoose.Types.ObjectId(id)),
      preferredDate: data.preferredDate,
      status: AppointmentStatus.PENDING,
      notes: data.notes,
    });
    
    await appointment.save();
    
    logger.info(`Appointment created: ${appointment._id} by ${user.userId}`);
    
    return this.mapToResponse(appointment);
  }
  
  /**
   * Получить список записей
   * Client видит только свои записи
   * Manager/Owner видят записи своей организации/филиала
   * 
   * @param user - Пользователь, запрашивающий список
   * @param filters - Опциональные фильтры
   * @returns Список записей
   */
  async findAll(user: AuthRequest['user'], filters?: { status?: AppointmentStatus; branchId?: string }): Promise<AppointmentResponse[]> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    let filter: any = {};
    
    // Client видит только свои записи (нужно найти Client по userId)
    if (user.role === UserRole.CLIENT) {
      // Найти Client по email User
      const client = await Client.findOne({
        email: user.email,
        organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
      });
      
      if (client) {
        filter.clientId = client._id;
      } else {
        // Если Client не найден, вернуть пустой список
        return [];
      }
    } else {
      // Для других ролей применяем tenant + branch фильтры
      filter = combinedFilter(user, filter);
    }
    
    // Применить дополнительные фильтры
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.branchId) {
      filter.branchId = new mongoose.Types.ObjectId(filters.branchId);
    }
    
    const appointments = await Appointment.find(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate('services', 'name basePrice durationMinutes')
      .populate('assignedMechanicId', 'firstName lastName email')
      .sort({ preferredDate: 1 });
    
    return appointments.map(appointment => this.mapToResponse(appointment));
  }
  
  /**
   * Получить запись по ID
   * 
   * @param id - ID записи
   * @param user - Пользователь, запрашивающий запись
   * @returns Запись
   */
  async findById(id: string, user: AuthRequest['user']): Promise<AppointmentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запись не найдена');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Client видит только свои записи
    if (user.role === UserRole.CLIENT) {
      const client = await Client.findOne({
        email: user.email,
        organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
      });
      
      if (client) {
        filter.clientId = client._id;
      } else {
        throw new NotFoundError('Запись не найдена');
      }
    } else {
      filter = combinedFilter(user, filter);
    }
    
    const appointment = await Appointment.findOne(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate('services', 'name basePrice durationMinutes')
      .populate('assignedMechanicId', 'firstName lastName email');
    
    if (!appointment) {
      throw new NotFoundError('Запись не найдена');
    }
    
    return this.mapToResponse(appointment);
  }
  
  /**
   * Обновить статус записи
   * Manager может обновлять статус
   * 
   * @param id - ID записи
   * @param data - Данные для обновления статуса
   * @param user - Пользователь, обновляющий статус
   * @returns Обновленная запись
   */
  async updateStatus(id: string, data: UpdateAppointmentStatusDto, user: AuthRequest['user']): Promise<AppointmentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager и Owner могут обновлять статус
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для обновления статуса');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запись не найдена');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const appointment = await Appointment.findOne(filter);
    
    if (!appointment) {
      throw new NotFoundError('Запись не найдена');
    }
    
    appointment.status = data.status;
    await appointment.save();
    
    logger.info(`Appointment status updated: ${id} to ${data.status} by ${user.userId}`);
    
    return this.mapToResponse(appointment);
  }
  
  /**
   * Назначить механика на запись
   * Manager может назначать механика
   * 
   * @param id - ID записи
   * @param data - Данные для назначения
   * @param user - Пользователь, назначающий механика
   * @returns Обновленная запись
   */
  async assignMechanic(id: string, data: AssignAppointmentDto, user: AuthRequest['user']): Promise<AppointmentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    // Только Manager и Owner могут назначать механика
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для назначения механика');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запись не найдена');
    }
    
    // Проверить, что механик существует и имеет роль Mechanic
    const mechanic = await User.findById(data.mechanicId);
    if (!mechanic) {
      throw new NotFoundError('Механик не найден');
    }
    
    if (mechanic.role !== UserRole.MECHANIC) {
      throw new BadRequestError('Пользователь не является механиком');
    }
    
    // Проверить, что механик принадлежит организации
    if (user.organizationId && mechanic.organizationId?.toString() !== user.organizationId) {
      throw new ForbiddenError('Механик не принадлежит вашей организации');
    }
    
    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const appointment = await Appointment.findOne(filter);
    
    if (!appointment) {
      throw new NotFoundError('Запись не найдена');
    }
    
    appointment.assignedMechanicId = new mongoose.Types.ObjectId(data.mechanicId);
    await appointment.save();
    
    logger.info(`Mechanic assigned to appointment: ${id} by ${user.userId}`);
    
    return this.mapToResponse(appointment);
  }
  
  /**
   * Обновить запись
   * 
   * @param id - ID записи
   * @param data - Данные для обновления
   * @param user - Пользователь, обновляющий запись
   * @returns Обновленная запись
   */
  async update(id: string, data: UpdateAppointmentDto, user: AuthRequest['user']): Promise<AppointmentResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Запись не найдена');
    }
    
    let filter: any = { _id: new mongoose.Types.ObjectId(id) };
    
    // Client может обновлять только свои записи
    if (user.role === UserRole.CLIENT) {
      const client = await Client.findOne({
        email: user.email,
        organizationId: user.organizationId ? new mongoose.Types.ObjectId(user.organizationId) : undefined,
      });
      
      if (client) {
        filter.clientId = client._id;
      } else {
        throw new NotFoundError('Запись не найдена');
      }
    } else {
      filter = combinedFilter(user, filter);
    }
    
    const appointment = await Appointment.findOne(filter);
    
    if (!appointment) {
      throw new NotFoundError('Запись не найдена');
    }
    
    // Обновить поля
    if (data.preferredDate) {
      appointment.preferredDate = data.preferredDate;
    }
    if (data.notes !== undefined) {
      appointment.notes = data.notes;
    }
    
    await appointment.save();
    
    logger.info(`Appointment updated: ${id} by ${user.userId}`);
    
    return this.mapToResponse(appointment);
  }
  
  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(appointment: IAppointment): AppointmentResponse {
    return {
      id: appointment._id.toString(),
      organizationId: appointment.organizationId.toString(),
      branchId: appointment.branchId.toString(),
      clientId: appointment.clientId.toString(),
      car: appointment.car,
      services: appointment.services.map(id => id.toString()),
      preferredDate: appointment.preferredDate,
      status: appointment.status,
      assignedMechanicId: appointment.assignedMechanicId?.toString(),
      notes: appointment.notes,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}

export default new AppointmentService();
