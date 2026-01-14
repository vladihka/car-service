/**
 * Сервис для работы с клиентами
 * Реализует бизнес-логику для управления клиентами
 */

import Client, { IClient } from '../models/Client';
import Car from '../models/Car';
import Appointment from '../models/Appointment';
import WorkOrder from '../models/WorkOrder';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { CreateClientDto, UpdateClientDto, GetClientsQueryDto, ClientResponse, ClientListResponse } from '../types/client.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class ClientService {
  /**
   * Создать нового клиента
   * Owner, Manager, Admin могут создавать клиентов
   */
  async create(data: CreateClientDto, user: AuthRequest['user']): Promise<ClientResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для создания клиентов');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверка уникальности email в рамках организации (если указан)
    if (data.email && data.email.trim()) {
      const existingClient = await Client.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        email: data.email.toLowerCase().trim(),
        isActive: true,
      });

      if (existingClient) {
        throw new ConflictError(`Клиент с email ${data.email} уже существует`);
      }
    }

    // Проверка уникальности телефона в рамках организации
    const existingClientByPhone = await Client.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      phone: data.phone.trim(),
      isActive: true,
    });

    if (existingClientByPhone) {
      throw new ConflictError(`Клиент с телефоном ${data.phone} уже существует`);
    }

    // Определить branchId
    const branchId = data.branchId
      ? new mongoose.Types.ObjectId(data.branchId)
      : user.branchId
        ? new mongoose.Types.ObjectId(user.branchId)
        : undefined;

    // Создать клиента
    const client = new Client({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      branchId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email?.trim() || undefined,
      phone: data.phone.trim(),
      address: data.address
        ? {
            street: data.address.street?.trim(),
            city: data.address.city?.trim(),
            state: data.address.state?.trim(),
            zipCode: data.address.zipCode?.trim(),
            country: data.address.country?.trim(),
          }
        : undefined,
      notes: data.notes?.trim(),
      isActive: true,
    });

    await client.save();

    logger.info(`Client created: ${client.firstName} ${client.lastName} by ${user.userId}`);

    return this.mapToResponse(client);
  }

  /**
   * Получить список клиентов с фильтрацией и пагинацией
   */
  async findAll(user: AuthRequest['user'], query: GetClientsQueryDto): Promise<ClientListResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (user.role === UserRole.CLIENT) {
      // Клиент может видеть только свой профиль
      throw new ForbiddenError('Недостаточно прав для просмотра списка клиентов');
    }

    const filter: any = tenantFilter(user, { isActive: query.isActive !== false });

    // Применить фильтр по филиалу
    if (query.branchId) {
      filter.branchId = new mongoose.Types.ObjectId(query.branchId);
    } else if (user.branchId && user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      // Для не-владельцев фильтруем по своему филиалу
      filter.branchId = new mongoose.Types.ObjectId(user.branchId);
    }

    // Поиск по имени, фамилии, email, телефону
    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Фильтр по email
    if (query.email) {
      filter.email = query.email.toLowerCase().trim();
    }

    // Фильтр по телефону
    if (query.phone) {
      filter.phone = query.phone.trim();
    }

    // Поиск по VIN автомобиля
    if (query.vin) {
      const cars = await Car.find({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        vin: { $regex: query.vin, $options: 'i' },
      }).select('clientId');

      const clientIds = [...new Set(cars.map((car) => car.clientId.toString()))];
      if (clientIds.length > 0) {
        filter._id = { $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)) };
      } else {
        // Если не найдено автомобилей с таким VIN, возвращаем пустой результат
        return {
          clients: [],
          pagination: {
            page: query.page || 1,
            limit: query.limit || 20,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }

    // Пагинация
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Получить общее количество
    const total = await Client.countDocuments(filter);

    // Получить клиентов
    const clients = await Client.find(filter)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit);

    // Получить статистику для каждого клиента
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const stats = await this.getClientStats(client._id.toString(), user.organizationId!);
        return { ...this.mapToResponse(client), ...stats };
      })
    );

    return {
      clients: clientsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить клиента по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<ClientResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Клиент не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });

    // Если пользователь - клиент, он может видеть только свой профиль
    // Связь User и Client через email или phone
    if (user.role === UserRole.CLIENT) {
      const clientFilter: any = {
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        _id: new mongoose.Types.ObjectId(id),
      };

      // Найти клиента по email или phone
      const orConditions: any[] = [];
      if (user.email) {
        orConditions.push({ email: user.email.toLowerCase() });
      }
      if (user.phone) {
        orConditions.push({ phone: user.phone });
      }

      if (orConditions.length > 0) {
        clientFilter.$or = orConditions;
      }

      const client = await Client.findOne(clientFilter);

      if (!client || client._id.toString() !== id) {
        throw new ForbiddenError('Доступ запрещен. Клиенты могут просматривать только свой профиль');
      }

      // Получить статистику
      const stats = await this.getClientStats(id, user.organizationId!);
      return { ...this.mapToResponse(client), ...stats };
    }

    const client = await Client.findOne(filter);

    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }

    // Получить статистику
    const stats = await this.getClientStats(id, user.organizationId!);

    return { ...this.mapToResponse(client), ...stats };
  }

  /**
   * Обновить клиента
   */
  async update(id: string, data: UpdateClientDto, user: AuthRequest['user']): Promise<ClientResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для обновления клиентов');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Клиент не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const client = await Client.findOne(filter);

    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }

    // Проверка уникальности email (если изменяется)
    if (data.email && data.email.trim() && data.email !== client.email) {
      const existingClient = await Client.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        email: data.email.toLowerCase().trim(),
        isActive: true,
        _id: { $ne: client._id },
      });

      if (existingClient) {
        throw new ConflictError(`Клиент с email ${data.email} уже существует`);
      }
    }

    // Проверка уникальности телефона (если изменяется)
    if (data.phone && data.phone.trim() !== client.phone) {
      const existingClientByPhone = await Client.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        phone: data.phone.trim(),
        isActive: true,
        _id: { $ne: client._id },
      });

      if (existingClientByPhone) {
        throw new ConflictError(`Клиент с телефоном ${data.phone} уже существует`);
      }
    }

    // Обновить поля
    if (data.firstName !== undefined) {
      client.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      client.lastName = data.lastName.trim();
    }
    if (data.email !== undefined) {
      client.email = data.email?.trim() || undefined;
    }
    if (data.phone !== undefined) {
      client.phone = data.phone.trim();
    }
    if (data.branchId !== undefined) {
      client.branchId = data.branchId ? new mongoose.Types.ObjectId(data.branchId) : undefined;
    }
    if (data.address !== undefined) {
      client.address = data.address
        ? {
            street: data.address.street?.trim(),
            city: data.address.city?.trim(),
            state: data.address.state?.trim(),
            zipCode: data.address.zipCode?.trim(),
            country: data.address.country?.trim(),
          }
        : undefined;
    }
    if (data.notes !== undefined) {
      client.notes = data.notes?.trim();
    }

    await client.save();

    logger.info(`Client updated: ${client.firstName} ${client.lastName} by ${user.userId}`);

    // Получить статистику
    const stats = await this.getClientStats(id, user.organizationId!);

    return { ...this.mapToResponse(client), ...stats };
  }

  /**
   * Удалить клиента (soft delete)
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и SuperAdmin могут удалять клиентов
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для удаления клиентов');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Клиент не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const client = await Client.findOne(filter);

    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }

    // Проверить, есть ли связанные записи
    const hasCars = await Car.countDocuments({ clientId: client._id });
    const hasAppointments = await Appointment.countDocuments({ clientId: client._id });
    const hasWorkOrders = await WorkOrder.countDocuments({ clientId: client._id });
    const hasInvoices = await Invoice.countDocuments({ clientId: client._id });

    if (hasCars > 0 || hasAppointments > 0 || hasWorkOrders > 0 || hasInvoices > 0) {
      throw new BadRequestError(
        'Невозможно удалить клиента, так как у него есть связанные записи (автомобили, записи, заказы, счета)'
      );
    }

    // Soft delete
    client.isActive = false;
    await client.save();

    logger.info(`Client deleted: ${client.firstName} ${client.lastName} by ${user.userId}`);
  }

  /**
   * Получить статистику клиента
   */
  private async getClientStats(clientId: string, organizationId: string): Promise<{
    carsCount: number;
    appointmentsCount: number;
    workOrdersCount: number;
    invoicesCount: number;
  }> {
    const [carsCount, appointmentsCount, workOrdersCount, invoicesCount] = await Promise.all([
      Car.countDocuments({
        clientId: new mongoose.Types.ObjectId(clientId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      }),
      Appointment.countDocuments({
        clientId: new mongoose.Types.ObjectId(clientId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      }),
      WorkOrder.countDocuments({
        clientId: new mongoose.Types.ObjectId(clientId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      }),
      Invoice.countDocuments({
        clientId: new mongoose.Types.ObjectId(clientId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      }),
    ]);

    return {
      carsCount,
      appointmentsCount,
      workOrdersCount,
      invoicesCount,
    };
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(client: IClient): ClientResponse {
    return {
      id: client._id.toString(),
      organizationId: client.organizationId.toString(),
      branchId: client.branchId?.toString(),
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}

export default new ClientService();
