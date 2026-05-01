import { PrismaClient, UserRole, CampaignStatus, DonationStatus, ActionStatus, ActionType, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@jbaybff.org';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMeSoon!';
  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Org Admin',
      password: hash,
      role: UserRole.ADMIN,
    },
  });

  const donor = await prisma.user.upsert({
    where: { email: 'donor@example.com' },
    update: {},
    create: {
      email: 'donor@example.com',
      name: 'Demo Donor',
      password: await bcrypt.hash('DonorDemo!1', 12),
      role: UserRole.DONOR,
    },
  });

  let sponsorUser = await prisma.user.findUnique({
    where: { email: 'sponsor@example.com' },
  });
  if (!sponsorUser) {
    sponsorUser = await prisma.user.create({
      data: {
        email: 'sponsor@example.com',
        name: 'Demo Sponsor Org',
        password: await bcrypt.hash('SponsorDemo!1', 12),
        role: UserRole.SPONSOR,
      },
    });
    await prisma.sponsorProfile.create({
      data: {
        userId: sponsorUser.id,
        companyName: 'Ocean Trails Co.',
        description: 'Supporting coastal conservation in Jeffreys Bay.',
        website: 'https://example.com',
      },
    });
  }

  await prisma.blogCategory.createMany({
    skipDuplicates: true,
    data: [
      { name: 'News', slug: 'news' },
      { name: 'Ocean', slug: 'ocean' },
    ],
  });

  await prisma.tag.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Blue Flag', slug: 'blue-flag' },
      { name: 'Community', slug: 'community' },
    ],
  });

  const oceanCat = await prisma.blogCategory.findFirst({ where: { slug: 'ocean' } });

  const existingPost = await prisma.blogPost.findFirst({ where: { slug: 'protecting-jbay-shores' } });
  if (!existingPost) {
    await prisma.blogPost.create({
      data: {
        title: 'Protecting Jeffreys Bay shores',
        slug: 'protecting-jbay-shores',
        excerpt: 'How the Blue Flag programme helps locals and visitors care for our coastline.',
        content:
          '<p>Our foundation works with partners to keep beaches clean, educate visitors, and fund community stewardship.</p>',
        published: true,
        publishedAt: new Date(),
        metaTitle: 'Protecting Jeffreys Bay shores | JBay BFF',
        metaDescription:
          'Learn how Jeffreys Bay Blue Flag Foundation supports ocean conservation.',
        categoryId: oceanCat?.id,
      },
    });
  }

  const sponsorProf = await prisma.sponsorProfile.findFirst({
    where: { userId: sponsorUser!.id },
  });

  const campSlug = 'beach-cleanup-drive';
  let camp = await prisma.campaign.findUnique({ where: { slug: campSlug } });
  if (!camp) {
    camp = await prisma.campaign.create({
      data: {
        title: 'Community Beach Clean-up',
        slug: campSlug,
        description:
          'Monthly volunteer-led clean-ups along Dolphin Beach and Paradise Beach.',
        status: CampaignStatus.ACTIVE,
        featured: true,
        published: true,
        publishedAt: new Date(),
        fundingGoal: 50000,
        metaTitle: 'Beach Clean-up Drive | JBay BFF',
        metaDescription: 'Join our campaign to keep Jeffreys Bay beaches pristine.',
      },
    });
  }

  if (sponsorProf && camp) {
    await prisma.campaignOnSponsors.upsert({
      where: {
        campaignId_sponsorId: { campaignId: camp.id, sponsorId: sponsorProf.id },
      },
      update: {},
      create: { campaignId: camp.id, sponsorId: sponsorProf.id },
    });
  }

  const donationCount = await prisma.donation.count();
  if (donationCount === 0 && camp) {
    await prisma.donation.create({
      data: {
        userId: donor.id,
        donorEmail: donor.email,
        donorName: donor.name,
        amount: 250,
        currency: 'ZAR',
        campaignId: camp.id,
        status: DonationStatus.COMPLETED,
        metadata: { note: 'Seed donation' },
      },
    });
  }

  const chapter = await prisma.chapter.upsert({
    where: { slug: 'jbay-central' },
    update: {},
    create: {
      name: 'JBay Central Chapter',
      slug: 'jbay-central',
      zone: 'Central Jeffreys Bay',
      description: 'Neighbourhood chapter coordinating beach stewardship and school outreach.',
      contactEmail: 'info@jbaybff.org.za',
      active: true,
    },
  });

  if (camp) {
    await prisma.action.upsert({
      where: { slug: 'protect-dune-corridors' },
      update: {},
      create: {
        title: 'Protect dune corridors',
        slug: 'protect-dune-corridors',
        summary: 'Support municipal dune protection and safe access management.',
        description: 'Sign the local pledge and help keep dune ecosystems resilient.',
        type: ActionType.PLEDGE,
        status: ActionStatus.ACTIVE,
        published: true,
        campaignId: camp.id,
      },
    });
  }

  await prisma.communityEvent.upsert({
    where: { slug: 'jbay-monthly-cleanup' },
    update: {},
    create: {
      title: 'JBay Monthly Cleanup',
      slug: 'jbay-monthly-cleanup',
      description: 'Community beach cleanup and recycling sorting.',
      location: 'Main Beach, Jeffreys Bay',
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      status: EventStatus.PUBLISHED,
      published: true,
      chapterId: chapter.id,
      campaignId: camp?.id,
    },
  });

  console.log('Seed complete. Admin:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
