const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'gerant@dupont-fils.fr' },
    update: {},
    create: { email: 'gerant@dupont-fils.fr', password: hashedPassword, name: 'Jean Dupont', role: 'GERANT' },
  });
  await prisma.user.upsert({
    where: { email: 'magasinier@dupont-fils.fr' },
    update: {},
    create: { email: 'magasinier@dupont-fils.fr', password: hashedPassword, name: 'Pierre Martin', role: 'MAGASINIER' },
  });
  await prisma.user.upsert({
    where: { email: 'commercial@dupont-fils.fr' },
    update: {},
    create: { email: 'commercial@dupont-fils.fr', password: hashedPassword, name: 'Sophie Bernard', role: 'COMMERCIAL' },
  });

  const cat1 = await prisma.category.upsert({ where: { name: 'Papeterie' }, update: {}, create: { name: 'Papeterie' } });
  const cat2 = await prisma.category.upsert({ where: { name: 'Mobilier' }, update: {}, create: { name: 'Mobilier' } });

  const sup1 = await prisma.supplier.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Bureau Plus', email: 'contact@bureau-plus.fr', phone: '0123456789' },
  });

  const products = [
    { reference: 'PAP-001', name: 'Ramette de papier A4', price: 5.99, quantity: 150, minThreshold: 20, categoryId: cat1.id, supplierId: sup1.id },
    { reference: 'PAP-002', name: 'Stylo bille bleu (x10)', price: 3.49, quantity: 8, minThreshold: 15, categoryId: cat1.id, supplierId: sup1.id },
    { reference: 'PAP-003', name: 'Classeur A4', price: 2.99, quantity: 3, minThreshold: 10, categoryId: cat1.id, supplierId: sup1.id },
    { reference: 'MOB-001', name: 'Chaise de bureau', price: 199.99, quantity: 12, minThreshold: 3, categoryId: cat2.id, supplierId: sup1.id },
    { reference: 'MOB-002', name: 'Bureau réglable', price: 349.99, quantity: 0, minThreshold: 2, categoryId: cat2.id, supplierId: sup1.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { reference: p.reference }, update: {}, create: p });
  }

  console.log('Seed completed successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
