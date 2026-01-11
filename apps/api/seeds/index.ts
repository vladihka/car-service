import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from '../src/config/database';
import Organization from '../src/models/Organization';
import Branch from '../src/models/Branch';
import User from '../src/models/User';
import Client from '../src/models/Client';
import Car from '../src/models/Car';
import Part from '../src/models/Part';
import Supplier from '../src/models/Supplier';
import { UserRole, SubscriptionPlan, SubscriptionStatus } from '../src/types';
import { getPermissionsByRole } from '../src/types/permissions';

dotenv.config({ path: path.join(__dirname, '../.env') });

const seed = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seed...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Organization.deleteMany({});
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Client.deleteMany({});
    await Car.deleteMany({});
    await Part.deleteMany({});
    await Supplier.deleteMany({});
    
    // 1. Create SuperAdmin user (platform owner)
    console.log('👤 Creating SuperAdmin...');
    const superAdmin = await User.create({
      email: 'superadmin@car-service.com',
      password: 'SuperAdmin123!',
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      permissions: getPermissionsByRole(UserRole.SUPER_ADMIN),
      isActive: true,
    });
    console.log('✅ SuperAdmin created:', superAdmin.email);
    
    // 2. Create Demo Organization
    console.log('🏢 Creating demo organization...');
    const organization = await Organization.create({
      name: 'AutoCare Network',
      email: 'info@autocare-network.com',
      phone: '+1-555-0100',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      subscription: {
        plan: SubscriptionPlan.PROFESSIONAL,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        maxBranches: 5,
        maxUsers: 25,
      },
      isActive: true,
    });
    console.log('✅ Organization created:', organization.name);
    
    // 3. Create Branches
    console.log('🏪 Creating branches...');
    const branch1 = await Branch.create({
      organizationId: organization._id,
      name: 'Downtown Branch',
      email: 'downtown@autocare-network.com',
      phone: '+1-555-0101',
      address: {
        street: '456 Downtown Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        country: 'USA',
      },
      isActive: true,
    });
    
    const branch2 = await Branch.create({
      organizationId: organization._id,
      name: 'Uptown Branch',
      email: 'uptown@autocare-network.com',
      phone: '+1-555-0102',
      address: {
        street: '789 Uptown Blvd',
        city: 'New York',
        state: 'NY',
        zipCode: '10003',
        country: 'USA',
      },
      isActive: true,
    });
    console.log('✅ Branches created');
    
    // 4. Create Users for organization
    console.log('👥 Creating users...');
    
    // Owner
    const owner = await User.create({
      organizationId: organization._id,
      email: 'owner@autocare-network.com',
      password: 'Owner123!',
      firstName: 'John',
      lastName: 'Owner',
      role: UserRole.OWNER,
      permissions: getPermissionsByRole(UserRole.OWNER),
      isActive: true,
    });
    
    // Admin
    const admin = await User.create({
      organizationId: organization._id,
      branchId: branch1._id,
      email: 'admin@autocare-network.com',
      password: 'Admin123!',
      firstName: 'Jane',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      permissions: getPermissionsByRole(UserRole.ADMIN),
      isActive: true,
    });
    
    // Manager
    const manager = await User.create({
      organizationId: organization._id,
      branchId: branch1._id,
      email: 'manager@autocare-network.com',
      password: 'Manager123!',
      firstName: 'Bob',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      permissions: getPermissionsByRole(UserRole.MANAGER),
      isActive: true,
    });
    
    // Mechanic
    const mechanic = await User.create({
      organizationId: organization._id,
      branchId: branch1._id,
      email: 'mechanic@autocare-network.com',
      password: 'Mechanic123!',
      firstName: 'Alice',
      lastName: 'Mechanic',
      role: UserRole.MECHANIC,
      permissions: getPermissionsByRole(UserRole.MECHANIC),
      isActive: true,
    });
    
    // Accountant
    const accountant = await User.create({
      organizationId: organization._id,
      email: 'accountant@autocare-network.com',
      password: 'Accountant123!',
      firstName: 'Carol',
      lastName: 'Accountant',
      role: UserRole.ACCOUNTANT,
      permissions: getPermissionsByRole(UserRole.ACCOUNTANT),
      isActive: true,
    });
    
    console.log('✅ Users created');
    
    // 5. Create Supplier
    console.log('🏭 Creating suppliers...');
    const supplier = await Supplier.create({
      organizationId: organization._id,
      name: 'AutoParts Distributors Inc.',
      email: 'sales@autoparts-dist.com',
      phone: '+1-555-0200',
      contactPerson: 'Mike Supplier',
      address: {
        street: '100 Industrial Way',
        city: 'New Jersey',
        state: 'NJ',
        zipCode: '07001',
        country: 'USA',
      },
      paymentTerms: 'Net 30',
      isActive: true,
    });
    console.log('✅ Supplier created');
    
    // 6. Create Parts
    console.log('🔧 Creating parts...');
    const part1 = await Part.create({
      organizationId: organization._id,
      branchId: branch1._id,
      name: 'Oil Filter - Premium',
      sku: 'OIL-FILT-PREM-001',
      description: 'Premium quality oil filter',
      category: 'Filters',
      supplierId: supplier._id,
      cost: 8.50,
      price: 15.99,
      stock: 50,
      minStock: 10,
      unit: 'pcs',
      location: 'A-1-2',
      isActive: true,
    });
    
    const part2 = await Part.create({
      organizationId: organization._id,
      branchId: branch1._id,
      name: 'Brake Pads - Front',
      sku: 'BRAKE-PAD-FRONT-001',
      description: 'Ceramic brake pads for front wheels',
      category: 'Brakes',
      supplierId: supplier._id,
      cost: 45.00,
      price: 89.99,
      stock: 25,
      minStock: 5,
      unit: 'set',
      location: 'B-2-3',
      isActive: true,
    });
    console.log('✅ Parts created');
    
    // 7. Create Clients
    console.log('👤 Creating clients...');
    const client1 = await Client.create({
      organizationId: organization._id,
      branchId: branch1._id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-1000',
      address: {
        street: '123 Customer St',
        city: 'New York',
        state: 'NY',
        zipCode: '10004',
        country: 'USA',
      },
      notes: 'Regular customer, prefers premium service',
      isActive: true,
    });
    
    const client2 = await Client.create({
      organizationId: organization._id,
      branchId: branch1._id,
      firstName: 'Mary',
      lastName: 'Smith',
      email: 'mary.smith@example.com',
      phone: '+1-555-1001',
      address: {
        street: '456 Client Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10005',
        country: 'USA',
      },
      isActive: true,
    });
    console.log('✅ Clients created');
    
    // 8. Create Cars
    console.log('🚗 Creating cars...');
    const car1 = await Car.create({
      organizationId: organization._id,
      clientId: client1._id,
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Accord',
      year: 2020,
      color: 'Silver',
      licensePlate: 'ABC-1234',
      mileage: 45000,
      serviceHistory: [
        {
          date: new Date('2023-01-15'),
          description: 'Oil change and tire rotation',
          mileage: 30000,
          cost: 89.99,
        },
        {
          date: new Date('2023-07-20'),
          description: 'Brake inspection',
          mileage: 40000,
          cost: 49.99,
        },
      ],
    });
    
    const car2 = await Car.create({
      organizationId: organization._id,
      clientId: client2._id,
      vin: '5YJ3E1EA1KF123456',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      color: 'Red',
      licensePlate: 'XYZ-5678',
      mileage: 25000,
      serviceHistory: [
        {
          date: new Date('2023-05-10'),
          description: 'Battery check and tire inspection',
          mileage: 20000,
          cost: 149.99,
        },
      ],
    });
    console.log('✅ Cars created');
    
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SuperAdmin: superadmin@car-service.com / SuperAdmin123!');
    console.log('Owner:      owner@autocare-network.com / Owner123!');
    console.log('Admin:      admin@autocare-network.com / Admin123!');
    console.log('Manager:    manager@autocare-network.com / Manager123!');
    console.log('Mechanic:   mechanic@autocare-network.com / Mechanic123!');
    console.log('Accountant: accountant@autocare-network.com / Accountant123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
