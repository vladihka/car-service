/**
 * Контроллер для работы с записями клиентов (Appointments)
 * Обрабатывает HTTP запросы для управления записями
 */

import { Response, NextFunction } from 'express';
import appointmentService from '../services/appointment.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validateZod } from '../middlewares/validation.middleware';
import {
  CreateAppointmentDtoSchema,
  UpdateAppointmentDtoSchema,
  UpdateAppointmentStatusDtoSchema,
  AssignAppointmentDtoSchema,
} from '../types/appointment.dto';
import { CreateAppointmentDto, UpdateAppointmentDto, UpdateAppointmentStatusDto, AssignAppointmentDto } from '../types/appointment.dto';
import { AppointmentStatus } from '../types';

/**
 * Контроллер записей
 */
export class AppointmentController {
  /**
   * POST /api/v1/appointments
   * Создать новую запись
   * Доступ: Client
   */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateAppointmentDto = req.body;
      
      const appointment = await appointmentService.create(data, req.user);
      
      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/appointments
   * Получить список записей
   * Доступ: Client (только свои), Manager/Owner (все в организации/филиале)
   */
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as AppointmentStatus | undefined;
      const branchId = req.query.branchId as string | undefined;
      
      const appointments = await appointmentService.findAll(req.user, { status, branchId });
      
      res.status(200).json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /api/v1/appointments/:id
   * Получить запись по ID
   */
  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const appointment = await appointmentService.findById(id, req.user);
      
      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/appointments/:id/status
   * Обновить статус записи
   * Доступ: Manager, Owner
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateAppointmentStatusDto = req.body;
      
      const appointment = await appointmentService.updateStatus(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/appointments/:id/assign
   * Назначить механика на запись
   * Доступ: Manager, Owner
   */
  async assignMechanic(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: AssignAppointmentDto = req.body;
      
      const appointment = await appointmentService.assignMechanic(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * PATCH /api/v1/appointments/:id
   * Обновить запись
   */
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateAppointmentDto = req.body;
      
      const appointment = await appointmentService.update(id, data, req.user);
      
      res.status(200).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AppointmentController();
