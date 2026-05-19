import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const roles = [
  {
    id: 'admin-role',
    name: 'Admin',
    permissions: JSON.stringify(['*']),
  },
  {
    id: 'manager-role',
    name: 'Manager',
    permissions: JSON.stringify([
      'users:read', 'users:update',
      'tables:read', 'tables:create', 'tables:update', 'tables:delete',
      'menu:read', 'menu:create', 'menu:update', 'menu:delete',
      'orders:read', 'orders:create', 'orders:update',
      'payments:read', 'payments:create',
    ]),
  },
  {
    id: 'staff-role',
    name: 'Staff',
    permissions: JSON.stringify([
      'tables:read', 'tables:update',
      'menu:read',
      'orders:read', 'orders:create', 'orders:update',
      'payments:read', 'payments:create',
    ]),
  },
  {
    id: 'kitchen-role',
    name: 'Kitchen',
    permissions: JSON.stringify([
      'orders:read',
      'orders:status:update',
    ]),
  },
];

const users = [
  {
    id: 'admin-user',
    email: 'admin@restaurant.com',
    password: bcrypt.hashSync('admin123', 12),
    name: 'Admin User',
    roleId: 'admin-role',
  },
];

const categories = [
  { id: '1a2b3c4d-1111-4444-a000-000000000001', name: 'Appetizers', sortOrder: 0 },
  { id: '1a2b3c4d-1111-4444-b000-000000000002', name: 'Main Courses', sortOrder: 1 },
  { id: '1a2b3c4d-1111-4444-c000-000000000003', name: 'Drinks', sortOrder: 2 },
  { id: '1a2b3c4d-1111-4444-d000-000000000004', name: 'Desserts', sortOrder: 3 },
];

const menuItems = [
  { id: '2a2b3c4d-1111-4444-a001-000000000001', name: 'Buffalo Wings', price: 9.99, categoryId: '1a2b3c4d-1111-4444-a000-000000000001', sortOrder: 0 },
  { id: '2a2b3c4d-1111-4444-a001-000000000002', name: 'Loaded Fries', price: 6.99, categoryId: '1a2b3c4d-1111-4444-a000-000000000001', sortOrder: 1 },
  { id: '2a2b3c4d-1111-4444-a001-000000000003', name: 'Soup of the Day', price: 4.99, categoryId: '1a2b3c4d-1111-4444-a000-000000000001', sortOrder: 2 },
  { id: '2a2b3c4d-1111-4444-b001-000000000004', name: 'Classic Burger', price: 12.99, categoryId: '1a2b3c4d-1111-4444-b000-000000000002', sortOrder: 0 },
  { id: '2a2b3c4d-1111-4444-b001-000000000005', name: 'Grilled Ribeye', price: 24.99, categoryId: '1a2b3c4d-1111-4444-b000-000000000002', sortOrder: 1 },
  { id: '2a2b3c4d-1111-4444-b001-000000000006', name: 'Carbonara Pasta', price: 14.99, categoryId: '1a2b3c4d-1111-4444-b000-000000000002', sortOrder: 2 },
  { id: '2a2b3c4d-1111-4444-c001-000000000007', name: 'Cola', price: 2.49, categoryId: '1a2b3c4d-1111-4444-c000-000000000003', sortOrder: 0 },
  { id: '2a2b3c4d-1111-4444-c001-000000000008', name: 'Fresh Lemonade', price: 3.49, categoryId: '1a2b3c4d-1111-4444-c000-000000000003', sortOrder: 1 },
  { id: '2a2b3c4d-1111-4444-c001-000000000009', name: 'Coffee', price: 2.99, categoryId: '1a2b3c4d-1111-4444-c000-000000000003', sortOrder: 2 },
  { id: '2a2b3c4d-1111-4444-d001-00000000000a', name: 'Cheesecake', price: 5.99, categoryId: '1a2b3c4d-1111-4444-d000-000000000004', sortOrder: 0 },
  { id: '2a2b3c4d-1111-4444-d001-00000000000b', name: 'Ice Cream Sundae', price: 4.99, categoryId: '1a2b3c4d-1111-4444-d000-000000000004', sortOrder: 1 },
];

const tables = [
  { id: '3a2b3c4d-1111-4444-a010-000000000001', number: 1, capacity: 2 },
  { id: '3a2b3c4d-1111-4444-a010-000000000002', number: 2, capacity: 4 },
  { id: '3a2b3c4d-1111-4444-a010-000000000003', number: 3, capacity: 4 },
  { id: '3a2b3c4d-1111-4444-a010-000000000004', number: 4, capacity: 6 },
  { id: '3a2b3c4d-1111-4444-a010-000000000005', number: 5, capacity: 2 },
  { id: '3a2b3c4d-1111-4444-a010-000000000006', number: 6, capacity: 8 },
];

async function main() {
  console.log('Seeding database...');

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: role,
      create: role,
    });
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }

  for (const table of tables) {
    await prisma.table.upsert({
      where: { id: table.id },
      update: table,
      create: table,
    });
  }

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
