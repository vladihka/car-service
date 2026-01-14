/**
 * Сервис для работы с автомобилями
 * Реализует бизнес-логику для управления автомобилями
 */

import Car, { ICar } from '../models/Car';
import Client from '../models/Client';
import Appointment from '../models/Appointment';
import WorkOrder from '../models/WorkOrder';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middlewares/auth.middleware';
import { combinedFilter, tenantFilter } from '../middlewares/tenant.middleware';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../utils/errors';
import { CreateCarDto, UpdateCarDto, GetCarsQueryDto, CarResponse, CarListResponse } from '../types/car.dto';
import { UserRole } from '../types';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class CarService {
  /**
   * Создать новый автомобиль
   * Owner, Manager, Admin могут создавать автомобили
   */
  async create(data: CreateCarDto, user: AuthRequest['user']): Promise<CarResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для создания автомобилей');
    }

    if (!user.organizationId) {
      throw new ForbiddenError('Требуется организация');
    }

    // Проверить, что клиент существует и принадлежит организации
    const client = await Client.findOne({
      _id: new mongoose.Types.ObjectId(data.clientId),
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      isActive: true,
    });

    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }

    // Проверить уникальность VIN в рамках организации
    const existingCar = await Car.findOne({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      vin: data.vin.toUpperCase().trim(),
    });

    if (existingCar) {
      throw new ConflictError(`Автомобиль с VIN ${data.vin} уже существует`);
    }

    // Проверить уникальность номера (если указан)
    if (data.licensePlate && data.licensePlate.trim()) {
      const existingCarByPlate = await Car.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        licensePlate: data.licensePlate.toUpperCase().trim(),
      });

      if (existingCarByPlate) {
        throw new ConflictError(`Автомобиль с номером ${data.licensePlate} уже существует`);
      }
    }

    // Создать автомобиль
    const car = new Car({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      clientId: new mongoose.Types.ObjectId(data.clientId),
      vin: data.vin.toUpperCase().trim(),
      make: data.make.trim(),
      model: data.model.trim(),
      year: data.year,
      color: data.color?.trim(),
      licensePlate: data.licensePlate?.toUpperCase().trim(),
      mileage: data.mileage,
      serviceHistory: [],
    });

    await car.save();

    logger.info(`Car created: ${car.vin} by ${user.userId}`);

    return this.mapToResponse(car);
  }

  /**
   * Получить список автомобилей с фильтрацией и пагинацией
   */
  async findAll(user: AuthRequest['user'], query: GetCarsQueryDto): Promise<CarListResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    const filter: any = tenantFilter(user, {});

    // Если пользователь - клиент, он может видеть только свои автомобили
    if (user.role === UserRole.CLIENT) {
      // Найти клиента по email или phone из User
      const clientFilter: any = {
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
      };

      const orConditions: any[] = [];
      if (user.email) {
        orConditions.push({ email: user.email.toLowerCase() });
      }
      if (user.phone) {
        orConditions.push({ phone: user.phone });
      }

      if (orConditions.length > 0) {
        clientFilter.$or = orConditions;
      } else {
        throw new ForbiddenError('Недостаточно прав для просмотра списка автомобилей');
      }

      const client = await Client.findOne(clientFilter);
      if (!client) {
        return {
          cars: [],
          pagination: {
            page: query.page || 1,
            limit: query.limit || 20,
            total: 0,
            totalPages: 0,
          },
        };
      }

      filter.clientId = client._id;
    } else if (query.clientId) {
      // Фильтр по клиенту (для других ролей)
      filter.clientId = new mongoose.Types.ObjectId(query.clientId);
    }

    // Поиск по VIN, марке, модели
    if (query.search) {
      filter.$or = [
        { vin: { $regex: query.search, $options: 'i' } },
        { make: { $regex: query.search, $options: 'i' } },
        { model: { $regex: query.search, $options: 'i' } },
        { licensePlate: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Фильтр по VIN
    if (query.vin) {
      filter.vin = { $regex: query.vin, $options: 'i' };
    }

    // Фильтр по марке
    if (query.make) {
      filter.make = { $regex: query.make, $options: 'i' };
    }

    // Фильтр по модели
    if (query.model) {
      filter.model = { $regex: query.model, $options: 'i' };
    }

    // Фильтр по году
    if (query.year) {
      filter.year = query.year;
    }

    // Фильтр по номеру
    if (query.licensePlate) {
      filter.licensePlate = { $regex: query.licensePlate, $options: 'i' };
    }

    // Пагинация
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Получить общее количество
    const total = await Car.countDocuments(filter);

    // Получить автомобили
    const cars = await Car.find(filter)
      .populate('clientId', 'firstName lastName')
      .sort({ make: 1, model: 1, year: -1 })
      .skip(skip)
      .limit(limit);

    // Получить статистику для каждого автомобиля
    const carsWithStats = await Promise.all(
      cars.map(async (car) => {
        const stats = await this.getCarStats(car._id.toString(), user.organizationId!);
        return { ...this.mapToResponse(car), ...stats };
      })
    );

    return {
      cars: carsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить автомобиль по ID
   */
  async findById(id: string, user: AuthRequest['user']): Promise<CarResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Автомобиль не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });

    // Если пользователь - клиент, он может видеть только свои автомобили
    if (user.role === UserRole.CLIENT) {
      const clientFilter: any = {
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
      };

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
      if (!client) {
        throw new ForbiddenError('Доступ запрещен');
      }

      filter.clientId = client._id;
    }

    const car = await Car.findOne(filter).populate('clientId', 'firstName lastName');

    if (!car) {
      throw new NotFoundError('Автомобиль не найден');
    }

    // Получить статистику
    const stats = await this.getCarStats(id, user.organizationId!);

    return { ...this.mapToResponse(car), ...stats };
  }

  /**
   * Обновить автомобиль
   */
  async update(id: string, data: UpdateCarDto, user: AuthRequest['user']): Promise<CarResponse> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Проверка прав доступа
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Недостаточно прав для обновления автомобилей');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Автомобиль не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const car = await Car.findOne(filter);

    if (!car) {
      throw new NotFoundError('Автомобиль не найден');
    }

    // Проверить уникальность VIN (если изменяется)
    if (data.vin && data.vin.toUpperCase().trim() !== car.vin) {
      const existingCar = await Car.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        vin: data.vin.toUpperCase().trim(),
        _id: { $ne: car._id },
      });

      if (existingCar) {
        throw new ConflictError(`Автомобиль с VIN ${data.vin} уже существует`);
      }
    }

    // Проверить уникальность номера (если изменяется)
    if (data.licensePlate && data.licensePlate.toUpperCase().trim() !== car.licensePlate) {
      const existingCarByPlate = await Car.findOne({
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        licensePlate: data.licensePlate.toUpperCase().trim(),
        _id: { $ne: car._id },
      });

      if (existingCarByPlate) {
        throw new ConflictError(`Автомобиль с номером ${data.licensePlate} уже существует`);
      }
    }

    // Проверить клиента (если изменяется)
    if (data.clientId && data.clientId !== car.clientId.toString()) {
      const client = await Client.findOne({
        _id: new mongoose.Types.ObjectId(data.clientId),
        organizationId: new mongoose.Types.ObjectId(user.organizationId),
        isActive: true,
      });

      if (!client) {
        throw new NotFoundError('Клиент не найден');
      }

      car.clientId = new mongoose.Types.ObjectId(data.clientId);
    }

    // Обновить поля
    if (data.vin !== undefined) {
      car.vin = data.vin.toUpperCase().trim();
    }
    if (data.make !== undefined) {
      car.make = data.make.trim();
    }
    if (data.model !== undefined) {
      car.model = data.model.trim();
    }
    if (data.year !== undefined) {
      car.year = data.year;
    }
    if (data.color !== undefined) {
      car.color = data.color?.trim();
    }
    if (data.licensePlate !== undefined) {
      car.licensePlate = data.licensePlate?.toUpperCase().trim();
    }
    if (data.mileage !== undefined) {
      car.mileage = data.mileage;
    }

    await car.save();

    logger.info(`Car updated: ${car.vin} by ${user.userId}`);

    // Получить статистику
    const stats = await this.getCarStats(id, user.organizationId!);

    return { ...this.mapToResponse(car), ...stats };
  }

  /**
   * Удалить автомобиль
   */
  async delete(id: string, user: AuthRequest['user']): Promise<void> {
    if (!user) {
      throw new ForbiddenError('Требуется аутентификация');
    }

    // Только Owner и SuperAdmin могут удалять автомобили
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('Недостаточно прав для удаления автомобилей');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Автомобиль не найден');
    }

    const filter = combinedFilter(user, { _id: new mongoose.Types.ObjectId(id) });
    const car = await Car.findOne(filter);

    if (!car) {
      throw new NotFoundError('Автомобиль не найден');
    }

    // Проверить, есть ли связанные записи
    const hasAppointments = await Appointment.countDocuments({ 
      organizationId: car.organizationId,
      'car.vin': car.vin,
    });
    const hasWorkOrders = await WorkOrder.countDocuments({ carId: car._id });
    const hasInvoices = await Invoice.countDocuments({ 
      organizationId: car.organizationId,
      workOrderId: { $in: await WorkOrder.find({ carId: car._id }).distinct('_id') },
    });

    if (hasAppointments > 0 || hasWorkOrders > 0 || hasInvoices > 0) {
      throw new BadRequestError(
        'Невозможно удалить автомобиль, так как у него есть связанные записи (записи, заказы, счета)'
      );
    }

    await Car.deleteOne({ _id: car._id });

    logger.info(`Car deleted: ${car.vin} by ${user.userId}`);
  }

  /**
   * Получить статистику автомобиля
   */
  private async getCarStats(carId: string, organizationId: string): Promise<{
    appointmentsCount: number;
    workOrdersCount: number;
    invoicesCount: number;
  }> {
    const car = await Car.findById(carId);
    if (!car) {
      return { appointmentsCount: 0, workOrdersCount: 0, invoicesCount: 0 };
    }

    // Найти записи по VIN
    const appointmentsCount = await Appointment.countDocuments({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      'car.vin': car.vin,
    });

    // Найти заказы по carId
    const workOrdersCount = await WorkOrder.countDocuments({
      carId: new mongoose.Types.ObjectId(carId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    // Найти счета через заказы
    const workOrderIds = await WorkOrder.find({
      carId: new mongoose.Types.ObjectId(carId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).distinct('_id');

    const invoicesCount = workOrderIds.length > 0
      ? await Invoice.countDocuments({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          workOrderId: { $in: workOrderIds },
        })
      : 0;

    return {
      appointmentsCount,
      workOrdersCount,
      invoicesCount,
    };
  }

  /**
   * Маппинг модели в DTO для ответа
   */
  private mapToResponse(car: ICar & { clientId?: any }): CarResponse {
    return {
      id: car._id.toString(),
      organizationId: car.organizationId.toString(),
      clientId: car.clientId._id?.toString() || car.clientId.toString(),
      clientName: car.clientId?.firstName && car.clientId?.lastName
        ? `${car.clientId.firstName} ${car.clientId.lastName}`
        : undefined,
      vin: car.vin,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      licensePlate: car.licensePlate,
      mileage: car.mileage,
      serviceHistory: car.serviceHistory || [],
      createdAt: car.createdAt,
      updatedAt: car.updatedAt,
    };
  }
}

export default new CarService();
