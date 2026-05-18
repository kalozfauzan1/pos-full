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