/**
 * Seed script — runs against `DATABASE_URL`.
 *
 * Idempotent by design: every upsert keys off `slug` / `email` so re-runs
 * don't duplicate rows. Safe for local dev and for first-time prod boot.
 *
 * Usage:
 *   pnpm --filter @jbaybff/prisma prisma:seed
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('▸ Seeding fund allocations...');
  const allocations: Array<{
    slug: string;
    label: string;
    percentage: number;
    colorToken: string;
    description: string;
    position: number;
  }> = [
    {
      slug: 'cleanup-teams',
      label: 'Cleanup Teams',
      percentage: 30,
      colorToken: 'oceanBlue',
      description: 'Daily beach + dune cleanup crews along Main Beach and Dolphin Beach.',
      position: 0,
    },
    {
      slug: 'education-outreach',
      label: 'Education & Outreach',
      percentage: 20,
      colorToken: 'teal',
      description: 'School visits, lifeguard programmes, and Blue Flag awareness drives.',
      position: 1,
    },
    {
      slug: 'infrastructure',
      label: 'Infrastructure',
      percentage: 10,
      colorToken: 'coralRed',
      description: 'Boardwalk repair, bin replacement, signage, and accessibility upgrades.',
      position: 2,
    },
    {
      slug: 'water-quality-monitoring',
      label: 'Water Quality Monitoring',
      percentage: 15,
      colorToken: 'sand',
      description: 'Independent lab testing and Blue Flag compliance audits.',
      position: 3,
    },
    {
      slug: 'safety-lifeguards',
      label: 'Safety & Lifeguards',
      percentage: 15,
      colorToken: 'sun',
      description: 'Trained lifeguard coverage during peak season.',
      position: 4,
    },
    {
      slug: 'admin-overhead',
      label: 'Admin & Compliance',
      percentage: 10,
      colorToken: 'oceanBlue',
      description: 'Audit, accounting, banking fees, and legal compliance (incl. SARS 18A).',
      position: 5,
    },
  ];

  for (const a of allocations) {
    await prisma.fundAllocation.upsert({
      where: { slug: a.slug },
      update: { ...a },
      create: { ...a },
    });
  }

  console.log('▸ Seeding admin user (placeholder — passwordless until Step 4)...');
  await prisma.user.upsert({
    where: { email: 'admin@jbaybff.org.za' },
    update: {},
    create: {
      email: 'admin@jbaybff.org.za',
      name: 'JBay BFF Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('▸ Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'tier1.giftThresholdCents' },
    update: { value: 100000 },
    create: { key: 'tier1.giftThresholdCents', value: 100000 },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'org.profile' },
    update: {
      value: {
        legalName: 'Jeffreys Bay Blue Flag Foundation NPC',
        mission:
          'To obtain and maintain Blue Flag status for Jeffreys Bay through cleanups, education, water-quality monitoring, and infrastructure upgrades.',
      },
    },
    create: {
      key: 'org.profile',
      value: {
        legalName: 'Jeffreys Bay Blue Flag Foundation NPC',
        mission:
          'To obtain and maintain Blue Flag status for Jeffreys Bay through cleanups, education, water-quality monitoring, and infrastructure upgrades.',
      },
    },
  });

  console.log('✓ Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
