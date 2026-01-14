import { Router } from 'express';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import branchRoutes from './branch.routes';
import appointmentRoutes from './appointment.routes';
import serviceRoutes from './service.routes';
import workOrderRoutes from './work-order.routes';
import invoiceRoutes from './invoice.routes';
import paymentRoutes from './payment.routes';
import analyticsRoutes from './analytics.routes';
import notificationRoutes from './notification.routes';
import billingRoutes from './billing.routes';
import reportRoutes from './report.routes';
import partRoutes from './part.routes';
import stockRoutes from './stock.routes';
import purchaseOrderRoutes from './purchase-order.routes';
import clientRoutes from './client.routes';
import carRoutes from './car.routes';
import supplierRoutes from './supplier.routes';
import taxRoutes from './tax.routes';
import { healthCheck } from '../controllers/health.controller';

const router = Router();

// Health check endpoint
router.get('/health', healthCheck);

// Authentication routes
router.use('/auth', authRoutes);

// Organization routes
router.use('/organizations', organizationRoutes);

// Branch routes
router.use('/branches', branchRoutes);

// Appointment routes
router.use('/appointments', appointmentRoutes);

// Service routes
router.use('/services', serviceRoutes);

// Work Order routes
router.use('/work-orders', workOrderRoutes);

// Invoice routes
router.use('/invoices', invoiceRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Billing routes
router.use('/billing', billingRoutes);

// Reports routes
router.use('/reports', reportRoutes);

// Parts routes
router.use('/parts', partRoutes);

// Stock routes
router.use('/stock', stockRoutes);

// Purchase Order routes
router.use('/purchase-orders', purchaseOrderRoutes);

// Client routes
router.use('/clients', clientRoutes);

// Car routes
router.use('/cars', carRoutes);

// Supplier routes
router.use('/suppliers', supplierRoutes);

// Tax routes
router.use('/taxes', taxRoutes);

export default router;
