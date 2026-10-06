import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@financeapp.com' },
    update: {},
    create: {
      email: 'admin@financeapp.com',
      name: 'Admin User',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // Seed Accounts (PSAK Standard Base)
  const accountsData = [
    { code: '1000', name: 'Kas', category: 'ASET', type: 'KAS' },
    { code: '1100', name: 'Bank', category: 'ASET', type: 'KAS' },
    { code: '1200', name: 'Piutang Usaha', category: 'ASET', type: 'PIUTANG' },
    { code: '2000', name: 'Utang Usaha', category: 'LIABILITAS', type: 'UTANG' },
    { code: '3000', name: 'Modal Pemilik', category: 'EKUITAS', type: 'EKUITAS' },
    { code: '3100', name: 'Laba Ditahan', category: 'EKUITAS', type: 'EKUITAS' },
    { code: '4000', name: 'Pendapatan Jasa', category: 'PENDAPATAN', type: 'PENDAPATAN' },
    { code: '5000', name: 'Beban Gaji', category: 'BEBAN', type: 'BEBAN_OPERASIONAL' },
    { code: '5100', name: 'Beban Sewa', category: 'BEBAN', type: 'BEBAN_OPERASIONAL' },
    { code: '6000', name: 'Laba/Rugi Selisih Kurs', category: 'PENDAPATAN', type: 'PENDAPATAN_LAIN' },
  ] as const;

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        type: acc.type,
      },
    });
  }

  // Seed Exchange Rates
  await prisma.exchangeRate.upsert({
    where: { date_currencyFrom_currencyTo: { date: new Date('2024-01-01T00:00:00Z'), currencyFrom: 'USD', currencyTo: 'IDR' } },
    update: {},
    create: {
      date: new Date('2024-01-01T00:00:00Z'),
      currencyFrom: 'USD',
      currencyTo: 'IDR',
      rate: 15500,
      createdById: admin.id,
    }
  });

  console.log('Seed completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
