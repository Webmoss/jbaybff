import {
  ActionStatus,
  ActionType,
  CampaignStatus,
  DonationStatus,
  EventStatus,
  PrismaClient,
  RecurringDonationInterval,
  RecurringDonationStatus,
  RetentionMessageChannel,
  RetentionMessageStatus,
  RetentionTriggerKey,
  ShopFulfillmentStatus,
  ShopInventoryStatus,
  ShopOrderStatus,
  ShopPaymentStatus,
  ShopProductStatus,
  UserRole,
  VolunteerStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function ensureUser(email: string, name: string, role: UserRole, plainPassword: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role,
      password: await bcrypt.hash(plainPassword, 12),
    },
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@jbaybff.org';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMeSoon!';

  const admin = await ensureUser(adminEmail, 'Org Admin', UserRole.ADMIN, adminPassword);

  const donorUsers = await Promise.all([
    ensureUser('donor@example.com', 'Demo Donor', UserRole.DONOR, 'DonorDemo!1'),
    ensureUser('amahle.donor@example.com', 'Amahle Ndlovu', UserRole.DONOR, 'DonorDemo!1'),
    ensureUser('liam.donor@example.com', 'Liam van Rensburg', UserRole.DONOR, 'DonorDemo!1'),
  ]);

  const sponsorUsers = await Promise.all([
    ensureUser('sponsor@example.com', 'Ocean Trails Co.', UserRole.SPONSOR, 'SponsorDemo!1'),
    ensureUser('sponsor.ripple@example.com', 'Ripple Electric', UserRole.SPONSOR, 'SponsorDemo!1'),
    ensureUser('sponsor.swell@example.com', 'Swell Collective', UserRole.SPONSOR, 'SponsorDemo!1'),
    ensureUser('sponsor.bayside@example.com', 'Bayside Foods', UserRole.SPONSOR, 'SponsorDemo!1'),
    ensureUser('sponsor.seafoam@example.com', 'Seafoam Labs', UserRole.SPONSOR, 'SponsorDemo!1'),
  ]);

  const sponsorProfiles = [
    {
      user: sponsorUsers[0],
      companyName: 'Ocean Trails Co.',
      description: 'Supporting coastal conservation in Jeffreys Bay.',
      website: 'https://example.com/ocean-trails',
    },
    {
      user: sponsorUsers[1],
      companyName: 'Ripple Electric',
      description: 'Backing shoreline lighting and safe-access initiatives.',
      website: 'https://example.com/ripple-electric',
    },
    {
      user: sponsorUsers[2],
      companyName: 'Swell Collective',
      description: 'Community-led surf and youth stewardship support.',
      website: 'https://example.com/swell-collective',
    },
    {
      user: sponsorUsers[3],
      companyName: 'Bayside Foods',
      description: 'Funding waste-reduction and clean beach events.',
      website: 'https://example.com/bayside-foods',
    },
    {
      user: sponsorUsers[4],
      companyName: 'Seafoam Labs',
      description: 'Data and monitoring support for marine health projects.',
      website: 'https://example.com/seafoam-labs',
    },
  ];

  for (const item of sponsorProfiles) {
    await prisma.sponsorProfile.upsert({
      where: { userId: item.user.id },
      update: {},
      create: {
        userId: item.user.id,
        companyName: item.companyName,
        description: item.description,
        website: item.website,
      },
    });
  }

  await prisma.blogCategory.createMany({
    skipDuplicates: true,
    data: [
      { name: 'News', slug: 'news' },
      { name: 'Ocean', slug: 'ocean' },
      { name: 'Community', slug: 'community' },
      { name: 'Events', slug: 'events' },
    ],
  });

  await prisma.tag.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Blue Flag', slug: 'blue-flag' },
      { name: 'Community', slug: 'community' },
      { name: 'Cleanups', slug: 'cleanups' },
      { name: 'Dunes', slug: 'dunes' },
      { name: 'Water Quality', slug: 'water-quality' },
      { name: 'Volunteer', slug: 'volunteer' },
      { name: 'Partnership', slug: 'partnership' },
      { name: 'Education', slug: 'education' },
    ],
  });

  const categories = await prisma.blogCategory.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const campaignSeeds = [
    {
      slug: 'beach-cleanup-drive',
      title: 'Community Beach Clean-up',
      description: 'Monthly volunteer-led clean-ups along Dolphin Beach and Paradise Beach.',
      status: CampaignStatus.ACTIVE,
      featured: true,
      published: true,
      publishedAt: daysAgo(40),
      fundingGoal: 50000,
      raisedAmount: 12000,
      metaTitle: 'Beach Clean-up Drive | JBay BFF',
      metaDescription: 'Join our campaign to keep Jeffreys Bay beaches pristine.',
    },
    {
      slug: 'dune-restoration-2026',
      title: 'Dune Restoration 2026',
      description: 'Rebuild and protect sensitive dune corridors with local volunteers and schools.',
      status: CampaignStatus.ACTIVE,
      featured: true,
      published: true,
      publishedAt: daysAgo(25),
      fundingGoal: 85000,
      raisedAmount: 30000,
      metaTitle: 'Dune Restoration 2026 | JBay BFF',
      metaDescription: 'Help restore and stabilize Jeffreys Bay dune systems.',
    },
    {
      slug: 'reef-water-testing-lab',
      title: 'Reef Water Testing Lab',
      description: 'Expand routine coastal water quality testing and public reporting.',
      status: CampaignStatus.ACTIVE,
      featured: false,
      published: true,
      publishedAt: daysAgo(18),
      fundingGoal: 120000,
      raisedAmount: 45000,
      metaTitle: 'Reef Water Testing Lab | JBay BFF',
      metaDescription: 'Back transparent water quality monitoring for local beaches.',
    },
    {
      slug: 'school-ocean-stewards',
      title: 'School Ocean Stewards',
      description: 'Equip local schools with marine conservation kits and workshops.',
      status: CampaignStatus.ACTIVE,
      featured: false,
      published: true,
      publishedAt: daysAgo(12),
      fundingGoal: 60000,
      raisedAmount: 15000,
      metaTitle: 'School Ocean Stewards | JBay BFF',
      metaDescription: 'Support student-led ocean stewardship education.',
    },
    {
      slug: 'beach-access-wayfinding',
      title: 'Beach Access Wayfinding',
      description: 'Improve safe, inclusive beach access signage and footpath maintenance.',
      status: CampaignStatus.COMPLETED,
      featured: false,
      published: true,
      publishedAt: daysAgo(120),
      fundingGoal: 40000,
      raisedAmount: 44000,
      metaTitle: 'Beach Access Wayfinding | JBay BFF',
      metaDescription: 'Completed campaign improving access pathways and signage.',
    },
    {
      slug: 'winter-storm-readiness',
      title: 'Winter Storm Readiness',
      description: 'Pre-season shoreline prep and response planning with volunteers.',
      status: CampaignStatus.DRAFT,
      featured: false,
      published: false,
      publishedAt: null,
      fundingGoal: 90000,
      raisedAmount: 0,
      metaTitle: 'Winter Storm Readiness | JBay BFF',
      metaDescription: 'Prepare Jeffreys Bay coastline before winter storm season.',
    },
  ];

  for (const campaign of campaignSeeds) {
    await prisma.campaign.upsert({
      where: { slug: campaign.slug },
      update: {},
      create: campaign,
    });
  }

  const campaigns = await prisma.campaign.findMany();
  const campaignBySlug = new Map(campaigns.map((c) => [c.slug, c]));
  const sponsorProfileRows = await prisma.sponsorProfile.findMany();

  const sponsorshipLinks: Array<[string, string]> = [
    ['beach-cleanup-drive', 'Ocean Trails Co.'],
    ['dune-restoration-2026', 'Ripple Electric'],
    ['reef-water-testing-lab', 'Seafoam Labs'],
    ['school-ocean-stewards', 'Swell Collective'],
    ['beach-access-wayfinding', 'Bayside Foods'],
    ['beach-cleanup-drive', 'Swell Collective'],
    ['dune-restoration-2026', 'Bayside Foods'],
    ['reef-water-testing-lab', 'Ocean Trails Co.'],
  ];

  for (const [campaignSlug, sponsorName] of sponsorshipLinks) {
    const campaign = campaignBySlug.get(campaignSlug);
    const sponsor = sponsorProfileRows.find((s) => s.companyName === sponsorName);
    if (!campaign || !sponsor) continue;
    await prisma.campaignOnSponsors.upsert({
      where: {
        campaignId_sponsorId: { campaignId: campaign.id, sponsorId: sponsor.id },
      },
      update: {},
      create: { campaignId: campaign.id, sponsorId: sponsor.id },
    });
  }

  const blogSeeds = [
    { slug: 'protecting-jbay-shores', title: 'Protecting Jeffreys Bay Shores', category: 'ocean', days: 30 },
    { slug: 'cleanup-report-q1', title: 'Cleanup Report: Q1 Outcomes', category: 'news', days: 28 },
    { slug: 'volunteer-spotlight-may', title: 'Volunteer Spotlight: May', category: 'community', days: 26 },
    { slug: 'dune-corridor-update', title: 'Dune Corridor Restoration Update', category: 'ocean', days: 23 },
    { slug: 'school-stewards-kickoff', title: 'School Ocean Stewards Kickoff', category: 'community', days: 21 },
    { slug: 'event-recap-main-beach', title: 'Main Beach Event Recap', category: 'events', days: 18 },
    { slug: 'water-testing-baseline', title: 'Water Testing Baseline Published', category: 'ocean', days: 16 },
    { slug: 'partnership-announcement-ripple', title: 'Partnership Announcement: Ripple Electric', category: 'news', days: 14 },
    { slug: 'winter-readiness-planning', title: 'Winter Readiness Planning Notes', category: 'news', days: 10 },
    { slug: 'community-pledge-milestone', title: 'Community Pledge Milestone Reached', category: 'community', days: 8 },
    { slug: 'sponsor-impact-q2-preview', title: 'Sponsor Impact Q2 Preview', category: 'news', days: 5 },
    { slug: 'shop-launch-supporter-guide', title: 'Shop Launch Supporter Guide', category: 'news', days: 2 },
  ];

  for (const [index, post] of blogSeeds.entries()) {
    const category = categoryBySlug.get(post.category);
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: `${post.title} — progress and opportunities for community action in Jeffreys Bay.`,
        content: `<p>${post.title}</p><p>JBay BFF continues to partner with residents, schools, and sponsors to protect and enjoy the coastline.</p>`,
        published: true,
        publishedAt: daysAgo(post.days),
        metaTitle: `${post.title} | JBay BFF`,
        metaDescription: `${post.title} and latest updates from Jeffreys Bay Blue Flag Foundation.`,
        categoryId: category?.id,
        createdAt: daysAgo(post.days + 1),
      },
    });
    if (index === 0) continue;
  }

  const actionSeeds = [
    {
      slug: 'protect-dune-corridors',
      title: 'Protect dune corridors',
      summary: 'Support municipal dune protection and safe access management.',
      description: 'Sign the local pledge and help keep dune ecosystems resilient.',
      type: ActionType.PLEDGE,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'dune-restoration-2026',
      startsAt: daysAgo(20),
      endsAt: daysFromNow(60),
    },
    {
      slug: 'email-council-coastal-lighting',
      title: 'Email council: safer coastal lighting',
      summary: 'Request safer and lower-impact beachfront lighting.',
      description: 'Send a prefilled message advocating for safer, eco-sensitive lighting standards.',
      type: ActionType.EMAIL,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'beach-access-wayfinding',
      startsAt: daysAgo(14),
      endsAt: daysFromNow(30),
    },
    {
      slug: 'volunteer-cleanup-weekend',
      title: 'Volunteer this cleanup weekend',
      summary: 'Join sorting and shoreline teams this month.',
      description: 'Volunteer for beach cleanup activities and post-event sorting.',
      type: ActionType.VOLUNTEER,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'beach-cleanup-drive',
      startsAt: daysAgo(5),
      endsAt: daysFromNow(25),
    },
    {
      slug: 'pledge-zero-plastic-events',
      title: 'Pledge zero single-use event plastics',
      summary: 'Encourage low-waste event practices across surf events.',
      description: 'Take the pledge and promote refill and reuse options.',
      type: ActionType.PLEDGE,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'reef-water-testing-lab',
      startsAt: daysAgo(8),
      endsAt: daysFromNow(45),
    },
    {
      slug: 'water-testing-volunteer-training',
      title: 'Register for water testing volunteer training',
      summary: 'Help gather consistent local water quality data.',
      description: 'Sign up for training sessions and community sampling days.',
      type: ActionType.VOLUNTEER,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'reef-water-testing-lab',
      startsAt: daysAgo(2),
      endsAt: daysFromNow(50),
    },
    {
      slug: 'support-school-stewards',
      title: 'Support school ocean steward programme',
      summary: 'Back school-level marine education resources.',
      description: 'Pledge support for local student ocean stewardship activities.',
      type: ActionType.PLEDGE,
      status: ActionStatus.ACTIVE,
      published: true,
      campaignSlug: 'school-ocean-stewards',
      startsAt: daysAgo(3),
      endsAt: daysFromNow(70),
    },
    {
      slug: 'thank-you-access-campaign',
      title: 'Celebrate access campaign completion',
      summary: 'Share outcomes and thank volunteers and sponsors.',
      description: 'Post-campaign celebration and recognition call to action.',
      type: ActionType.PLEDGE,
      status: ActionStatus.ARCHIVED,
      published: true,
      campaignSlug: 'beach-access-wayfinding',
      startsAt: daysAgo(100),
      endsAt: daysAgo(40),
    },
    {
      slug: 'winter-readiness-feedback',
      title: 'Share winter storm readiness feedback',
      summary: 'Contribute local feedback before final launch.',
      description: 'Provide practical ideas on beach access and storm-response communication.',
      type: ActionType.EMAIL,
      status: ActionStatus.DRAFT,
      published: false,
      campaignSlug: 'winter-storm-readiness',
      startsAt: null,
      endsAt: null,
    },
  ];

  for (const action of actionSeeds) {
    await prisma.action.upsert({
      where: { slug: action.slug },
      update: {},
      create: {
        title: action.title,
        slug: action.slug,
        summary: action.summary,
        description: action.description,
        type: action.type,
        status: action.status,
        published: action.published,
        campaignId: campaignBySlug.get(action.campaignSlug)?.id ?? null,
        startsAt: action.startsAt,
        endsAt: action.endsAt,
      },
    });
  }

  const chapterSeeds = [
    {
      slug: 'jbay-central',
      name: 'JBay Central Operations',
      zone: 'Central Jeffreys Bay',
      description: 'Operations hub coordinating cleanups and event logistics.',
    },
    {
      slug: 'jbay-beachfront',
      name: 'JBay Beachfront Operations',
      zone: 'Beachfront Corridor',
      description: 'Operational unit for beachfront stewardship and event support.',
    },
  ];

  for (const chapterSeed of chapterSeeds) {
    await prisma.chapter.upsert({
      where: { slug: chapterSeed.slug },
      update: {},
      create: {
        name: chapterSeed.name,
        slug: chapterSeed.slug,
        zone: chapterSeed.zone,
        description: chapterSeed.description,
        contactEmail: 'info@jbaybff.org.za',
        active: true,
      },
    });
  }

  const chapters = await prisma.chapter.findMany();
  const chapterBySlug = new Map(chapters.map((c) => [c.slug, c]));

  const eventSeeds = [
    {
      slug: 'jbay-monthly-cleanup',
      title: 'JBay Monthly Cleanup',
      location: 'Main Beach, Jeffreys Bay',
      description: 'Community beach cleanup and recycling sorting.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(10),
      endsAt: daysFromNow(10.2),
      capacity: 120,
      chapterSlug: 'jbay-central',
      campaignSlug: 'beach-cleanup-drive',
    },
    {
      slug: 'dune-planting-day',
      title: 'Dune Planting Day',
      location: 'Noorsekloof Dune Corridor',
      description: 'Native planting and erosion control workshop.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(18),
      endsAt: daysFromNow(18.2),
      capacity: 80,
      chapterSlug: 'jbay-beachfront',
      campaignSlug: 'dune-restoration-2026',
    },
    {
      slug: 'water-monitoring-bootcamp',
      title: 'Water Monitoring Bootcamp',
      location: 'Kabeljous Estuary',
      description: 'Volunteer training for baseline water testing.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(24),
      endsAt: daysFromNow(24.3),
      capacity: 60,
      chapterSlug: 'jbay-central',
      campaignSlug: 'reef-water-testing-lab',
    },
    {
      slug: 'school-ocean-kit-day',
      title: 'School Ocean Kit Day',
      location: 'Jeffreys Bay Secondary Hall',
      description: 'Teacher orientation and student toolkit handoff.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(32),
      endsAt: daysFromNow(32.2),
      capacity: 90,
      chapterSlug: 'jbay-central',
      campaignSlug: 'school-ocean-stewards',
    },
    {
      slug: 'access-audit-walk',
      title: 'Beach Access Audit Walk',
      location: 'Dolphin Beach Access Points',
      description: 'Final access-path usability review with community observers.',
      status: EventStatus.COMPLETED,
      published: true,
      startsAt: daysAgo(35),
      endsAt: daysAgo(35),
      capacity: 40,
      chapterSlug: 'jbay-beachfront',
      campaignSlug: 'beach-access-wayfinding',
    },
    {
      slug: 'winter-response-drill',
      title: 'Winter Response Drill',
      location: 'Operations Hub',
      description: 'Storm readiness coordination drill for volunteers.',
      status: EventStatus.DRAFT,
      published: false,
      startsAt: daysFromNow(40),
      endsAt: daysFromNow(40.2),
      capacity: 50,
      chapterSlug: 'jbay-central',
      campaignSlug: 'winter-storm-readiness',
    },
    {
      slug: 'coastal-partners-roundtable',
      title: 'Coastal Partners Roundtable',
      location: 'Jeffreys Bay Community Center',
      description: 'Sponsor and programme alignment for quarter planning.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(15),
      endsAt: daysFromNow(15.2),
      capacity: 45,
      chapterSlug: 'jbay-central',
      campaignSlug: 'reef-water-testing-lab',
    },
    {
      slug: 'plastic-free-market-day',
      title: 'Plastic-Free Market Day',
      location: 'Beachfront Market Strip',
      description: 'Community market activation focused on reuse and refill.',
      status: EventStatus.PUBLISHED,
      published: true,
      startsAt: daysFromNow(22),
      endsAt: daysFromNow(22.3),
      capacity: 110,
      chapterSlug: 'jbay-beachfront',
      campaignSlug: 'beach-cleanup-drive',
    },
  ];

  for (const event of eventSeeds) {
    await prisma.communityEvent.upsert({
      where: { slug: event.slug },
      update: {},
      create: {
        title: event.title,
        slug: event.slug,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        capacity: event.capacity,
        status: event.status,
        published: event.published,
        chapterId: chapterBySlug.get(event.chapterSlug)?.id ?? null,
        campaignId: campaignBySlug.get(event.campaignSlug)?.id ?? null,
      },
    });
  }

  const donationsCount = await prisma.donation.count();
  if (donationsCount < 8) {
    const donationSeeds = [
      { donor: donorUsers[0], campaignSlug: 'beach-cleanup-drive', amount: 250, status: DonationStatus.COMPLETED, days: 16 },
      { donor: donorUsers[1], campaignSlug: 'dune-restoration-2026', amount: 1200, status: DonationStatus.COMPLETED, days: 14 },
      { donor: donorUsers[2], campaignSlug: 'reef-water-testing-lab', amount: 500, status: DonationStatus.COMPLETED, days: 12 },
      { donor: donorUsers[0], campaignSlug: 'school-ocean-stewards', amount: 300, status: DonationStatus.COMPLETED, days: 9 },
      { donor: donorUsers[1], campaignSlug: 'beach-cleanup-drive', amount: 150, status: DonationStatus.PENDING, days: 3 },
      { donor: donorUsers[2], campaignSlug: 'dune-restoration-2026', amount: 200, status: DonationStatus.FAILED, days: 2 },
      { donor: donorUsers[0], campaignSlug: undefined, amount: 1000, status: DonationStatus.COMPLETED, days: 5 },
      { donor: donorUsers[1], campaignSlug: undefined, amount: 180, status: DonationStatus.COMPLETED, days: 1 },
    ];

    for (const [idx, seed] of donationSeeds.entries()) {
      const campaign = seed.campaignSlug ? campaignBySlug.get(seed.campaignSlug) : null;
      await prisma.donation.create({
        data: {
          userId: seed.donor.id,
          donorEmail: seed.donor.email,
          donorName: seed.donor.name,
          amount: seed.amount,
          currency: 'ZAR',
          campaignId: campaign?.id ?? null,
          status: seed.status,
          paystackReference: `seed_don_${idx}_${Date.now()}`,
          metadata: {
            source: 'seed-v2',
            note: 'Expanded seed donation',
          },
          createdAt: daysAgo(seed.days),
        },
      });
    }
  }

  const recurringCount = await prisma.recurringDonationPlan.count();
  if (recurringCount < 6) {
    await prisma.recurringDonationPlan.createMany({
      data: [
        {
          userId: donorUsers[0].id,
          donorEmail: donorUsers[0].email,
          donorName: donorUsers[0].name,
          amount: 100,
          currency: 'ZAR',
          interval: RecurringDonationInterval.MONTHLY,
          status: RecurringDonationStatus.ACTIVE,
          campaignId: campaignBySlug.get('beach-cleanup-drive')?.id,
          paystackAuthorizationCode: 'AUTH_seed_active_1',
          paystackCustomerCode: 'CUS_seed_active_1',
          nextChargeAt: daysFromNow(12),
          lastChargedAt: daysAgo(18),
          lastChargeReference: 'seed_recur_charge_1',
          metadata: { source: 'seed-v2', setupStatus: 'COMPLETED' },
        },
        {
          userId: donorUsers[1].id,
          donorEmail: donorUsers[1].email,
          donorName: donorUsers[1].name,
          amount: 150,
          currency: 'ZAR',
          interval: RecurringDonationInterval.WEEKLY,
          status: RecurringDonationStatus.PAUSED,
          campaignId: campaignBySlug.get('dune-restoration-2026')?.id,
          paystackAuthorizationCode: 'AUTH_seed_paused_1',
          paystackCustomerCode: 'CUS_seed_paused_1',
          nextChargeAt: null,
          failedChargeAttempts: 2,
          lastChargeError: 'Insufficient funds',
          metadata: { source: 'seed-v2', setupStatus: 'COMPLETED' },
        },
        {
          userId: donorUsers[2].id,
          donorEmail: donorUsers[2].email,
          donorName: donorUsers[2].name,
          amount: 75,
          currency: 'ZAR',
          interval: RecurringDonationInterval.QUARTERLY,
          status: RecurringDonationStatus.CANCELLED,
          campaignId: campaignBySlug.get('reef-water-testing-lab')?.id,
          paystackAuthorizationCode: 'AUTH_seed_cancelled_1',
          paystackCustomerCode: 'CUS_seed_cancelled_1',
          cancelledAt: daysAgo(7),
          nextChargeAt: null,
          metadata: { source: 'seed-v2', setupStatus: 'COMPLETED' },
        },
        {
          userId: donorUsers[0].id,
          donorEmail: donorUsers[0].email,
          donorName: donorUsers[0].name,
          amount: 220,
          currency: 'ZAR',
          interval: RecurringDonationInterval.MONTHLY,
          status: RecurringDonationStatus.PAUSED,
          campaignId: campaignBySlug.get('school-ocean-stewards')?.id,
          paystackSetupReference: 'jbr_seed_pending_001',
          paystackAuthorizationCode: null,
          paystackCustomerCode: null,
          nextChargeAt: null,
          metadata: { source: 'seed-v2', setupStatus: 'PENDING' },
        },
        {
          userId: donorUsers[1].id,
          donorEmail: donorUsers[1].email,
          donorName: donorUsers[1].name,
          amount: 95,
          currency: 'ZAR',
          interval: RecurringDonationInterval.WEEKLY,
          status: RecurringDonationStatus.ACTIVE,
          campaignId: campaignBySlug.get('beach-cleanup-drive')?.id,
          paystackAuthorizationCode: 'AUTH_seed_active_2',
          paystackCustomerCode: 'CUS_seed_active_2',
          nextChargeAt: daysFromNow(2),
          lastChargedAt: daysAgo(5),
          lastChargeReference: 'seed_recur_charge_2',
          metadata: { source: 'seed-v2', setupStatus: 'COMPLETED' },
        },
      ],
      skipDuplicates: true,
    });
  }

  const productSeeds = [
    {
      slug: 'jbay-bff-cap',
      title: 'JBay BFF Cap',
      description: 'Lightweight cap for cleanup days and surf checks.',
      category: 'apparel',
      status: ShopProductStatus.ACTIVE,
      variants: [
        { sku: 'CAP-BLK-001', title: 'Black', optionLabel: 'One Size', price: 280, inventoryQty: 24, inventoryStatus: ShopInventoryStatus.IN_STOCK },
        { sku: 'CAP-SND-001', title: 'Sand', optionLabel: 'One Size', price: 280, inventoryQty: 6, inventoryStatus: ShopInventoryStatus.LOW_STOCK },
      ],
    },
    {
      slug: 'reusable-cleanup-tote',
      title: 'Reusable Cleanup Tote',
      description: 'Heavy-duty tote for market days and cleanup collections.',
      category: 'gear',
      status: ShopProductStatus.ACTIVE,
      variants: [
        { sku: 'TOTE-NAT-001', title: 'Natural', optionLabel: 'Standard', price: 190, inventoryQty: 35, inventoryStatus: ShopInventoryStatus.IN_STOCK },
      ],
    },
    {
      slug: 'jbay-coastal-tee',
      title: 'JBay Coastal Tee',
      description: 'Soft cotton tee with coastal stewardship print.',
      category: 'apparel',
      status: ShopProductStatus.ACTIVE,
      variants: [
        { sku: 'TEE-SM-001', title: 'Small', optionLabel: 'S', price: 350, inventoryQty: 12, inventoryStatus: ShopInventoryStatus.IN_STOCK },
        { sku: 'TEE-MD-001', title: 'Medium', optionLabel: 'M', price: 350, inventoryQty: 0, inventoryStatus: ShopInventoryStatus.OUT_OF_STOCK },
        { sku: 'TEE-LG-001', title: 'Large', optionLabel: 'L', price: 350, inventoryQty: 4, inventoryStatus: ShopInventoryStatus.LOW_STOCK },
      ],
    },
  ];

  for (const productSeed of productSeeds) {
    const product = await prisma.shopProduct.upsert({
      where: { slug: productSeed.slug },
      update: {},
      create: {
        title: productSeed.title,
        slug: productSeed.slug,
        description: productSeed.description,
        category: productSeed.category,
        status: productSeed.status,
      },
    });

    for (const [variantIndex, variant] of productSeed.variants.entries()) {
      await prisma.shopProductVariant.upsert({
        where: { sku: variant.sku },
        update: {},
        create: {
          productId: product.id,
          sku: variant.sku,
          title: variant.title,
          optionLabel: variant.optionLabel,
          price: variant.price,
          inventoryQty: variant.inventoryQty,
          inventoryStatus: variant.inventoryStatus,
          isDefault: variantIndex === 0,
          isActive: true,
        },
      });
    }
  }

  const donorForOrders = donorUsers[0];
  const shopOrder = await prisma.shopOrder.upsert({
    where: { reference: 'SEED-SHOP-0001' },
    update: {},
    create: {
      reference: 'SEED-SHOP-0001',
      userId: donorForOrders.id,
      customerEmail: donorForOrders.email,
      customerName: donorForOrders.name,
      customerPhone: '+27-82-000-0001',
      status: ShopOrderStatus.PAID,
      paymentStatus: ShopPaymentStatus.PAID,
      fulfillmentStatus: ShopFulfillmentStatus.PACKING,
      paystackReference: 'jbs_seed_paid_0001',
      paymentIntentId: 'seed_txn_1001',
      currency: 'ZAR',
      totalAmount: 630,
      shippingAddress: {
        line1: '12 Da Gama Road',
        city: 'Jeffreys Bay',
        province: 'Eastern Cape',
        postalCode: '6330',
        country: 'ZA',
      },
      metadata: { source: 'seed-v2' },
    },
  });

  const orderItemsCount = await prisma.shopOrderItem.count({ where: { orderId: shopOrder.id } });
  if (orderItemsCount === 0) {
    const cap = await prisma.shopProduct.findUnique({ where: { slug: 'jbay-bff-cap' } });
    const capVariant = await prisma.shopProductVariant.findUnique({ where: { sku: 'CAP-BLK-001' } });
    const tote = await prisma.shopProduct.findUnique({ where: { slug: 'reusable-cleanup-tote' } });
    const toteVariant = await prisma.shopProductVariant.findUnique({ where: { sku: 'TOTE-NAT-001' } });
    if (cap && capVariant) {
      await prisma.shopOrderItem.create({
        data: {
          orderId: shopOrder.id,
          productId: cap.id,
          variantId: capVariant.id,
          productTitle: cap.title,
          variantTitle: capVariant.title,
          sku: capVariant.sku,
          unitPrice: capVariant.price,
          quantity: 1,
          lineTotal: capVariant.price,
        },
      });
    }
    if (tote && toteVariant) {
      await prisma.shopOrderItem.create({
        data: {
          orderId: shopOrder.id,
          productId: tote.id,
          variantId: toteVariant.id,
          productTitle: tote.title,
          variantTitle: toteVariant.title,
          sku: toteVariant.sku,
          unitPrice: toteVariant.price,
          quantity: 1,
          lineTotal: toteVariant.price,
        },
      });
    }
  }

  const actionSubmissionsCount = await prisma.actionSubmission.count();
  if (actionSubmissionsCount < 10) {
    const activeActions = await prisma.action.findMany({
      where: { status: ActionStatus.ACTIVE, published: true },
      take: 6,
    });
    for (const [idx, action] of activeActions.entries()) {
      const donor = donorUsers[idx % donorUsers.length];
      await prisma.actionSubmission.create({
        data: {
          actionId: action.id,
          userId: donor.id,
          email: donor.email,
          name: donor.name,
          metadata: {
            source: 'seed-v2',
            channel: idx % 2 === 0 ? 'web' : 'mobile',
          },
        },
      });
    }
  }

  const rsvpCount = await prisma.volunteerRsvp.count();
  if (rsvpCount < 10) {
    const events = await prisma.communityEvent.findMany({
      where: { status: EventStatus.PUBLISHED },
      take: 6,
      orderBy: { startsAt: 'asc' },
    });
    for (const [idx, event] of events.entries()) {
      const donor = donorUsers[idx % donorUsers.length];
      await prisma.volunteerRsvp.create({
        data: {
          eventId: event.id,
          userId: donor.id,
          email: donor.email,
          name: donor.name,
          status: idx % 3 === 0 ? VolunteerStatus.CHECKED_IN : VolunteerStatus.REGISTERED,
          checkedInAt: idx % 3 === 0 ? daysAgo(1) : null,
        },
      });
    }
  }

  const kpiCount = await prisma.kpiEvent.count();
  if (kpiCount < 20) {
    const kpiRows = [
      { eventName: 'campaign_view', path: '/campaigns/beach-cleanup-drive', campaignSlug: 'beach-cleanup-drive' },
      { eventName: 'campaign_view', path: '/campaigns/dune-restoration-2026', campaignSlug: 'dune-restoration-2026' },
      { eventName: 'action_click', path: '/actions', actionSlug: 'protect-dune-corridors' },
      { eventName: 'event_view', path: '/events', campaignSlug: 'reef-water-testing-lab' },
      { eventName: 'donation_checkout_started', path: '/dashboard', campaignSlug: 'beach-cleanup-drive' },
      { eventName: 'recurring_checkout_started', path: '/dashboard', campaignSlug: 'dune-restoration-2026' },
      { eventName: 'shop_checkout_started', path: '/shop', campaignSlug: undefined },
    ];

    const actions = await prisma.action.findMany();
    for (const [idx, row] of kpiRows.entries()) {
      await prisma.kpiEvent.create({
        data: {
          eventName: row.eventName,
          path: row.path,
          userId: donorUsers[idx % donorUsers.length].id,
          actionId: row.actionSlug ? actions.find((a) => a.slug === row.actionSlug)?.id : null,
          campaignId: row.campaignSlug ? campaignBySlug.get(row.campaignSlug)?.id ?? null : null,
          sessionId: `seed-session-${idx + 1}`,
          metadata: { source: 'seed-v2' },
          createdAt: daysAgo(10 - idx),
        },
      });
    }
  }

  const consentRows = [
    { email: donorUsers[0].email, emailOptIn: true, smsOptIn: false },
    { email: donorUsers[1].email, emailOptIn: true, smsOptIn: true },
    { email: donorUsers[2].email, emailOptIn: false, smsOptIn: false },
  ];
  for (const consent of consentRows) {
    await prisma.supporterConsent.upsert({
      where: { email: consent.email },
      update: {},
      create: {
        email: consent.email,
        emailOptIn: consent.emailOptIn,
        smsOptIn: consent.smsOptIn,
        source: 'seed-v2',
      },
    });
  }

  const templateExists = await prisma.retentionTemplate.count();
  if (templateExists === 0) {
    await prisma.retentionTemplate.createMany({
      data: [
        {
          triggerKey: RetentionTriggerKey.WELCOME,
          channel: RetentionMessageChannel.EMAIL,
          version: 1,
          subject: 'Welcome to JBay BFF',
          body: 'Thanks for joining. Here is how to get involved this month.',
          isActive: true,
          createdBy: admin.email,
        },
        {
          triggerKey: RetentionTriggerKey.REENGAGEMENT_30,
          channel: RetentionMessageChannel.EMAIL,
          version: 1,
          subject: 'We miss you at the shoreline',
          body: 'Join an upcoming event or action and help protect JBay coastlines.',
          isActive: true,
          createdBy: admin.email,
        },
        {
          triggerKey: RetentionTriggerKey.WIN_NOTIFICATION,
          channel: RetentionMessageChannel.EMAIL,
          version: 1,
          subject: 'Campaign win update',
          body: 'Thanks to your support, we reached a major local milestone.',
          isActive: true,
          createdBy: admin.email,
        },
      ],
    });
  }

  const outboxCount = await prisma.retentionMessageOutbox.count();
  if (outboxCount < 6) {
    await prisma.retentionMessageOutbox.createMany({
      data: [
        {
          triggerKey: RetentionTriggerKey.WELCOME,
          channel: RetentionMessageChannel.EMAIL,
          status: RetentionMessageStatus.SENT,
          toEmail: donorUsers[0].email,
          templateKey: 'welcome-v1',
          subject: 'Welcome to JBay BFF',
          attempts: 1,
          sentAt: daysAgo(6),
        },
        {
          triggerKey: RetentionTriggerKey.REENGAGEMENT_30,
          channel: RetentionMessageChannel.EMAIL,
          status: RetentionMessageStatus.PENDING,
          toEmail: donorUsers[1].email,
          templateKey: 'reengagement-30-v1',
          subject: 'Join this month’s coastal action',
          attempts: 0,
          scheduledFor: daysFromNow(1),
        },
        {
          triggerKey: RetentionTriggerKey.WIN_NOTIFICATION,
          channel: RetentionMessageChannel.EMAIL,
          status: RetentionMessageStatus.FAILED,
          toEmail: donorUsers[2].email,
          templateKey: 'win-v1',
          subject: 'Campaign milestone update',
          attempts: 2,
          lastError: 'Transient provider timeout',
        },
      ],
    });
  }

  await prisma.adminAuditLog.createMany({
    data: [
      {
        area: 'seed',
        action: 'seed.v2.executed',
        actorEmail: admin.email,
        metadata: {
          campaigns: campaignSeeds.length,
          blogPosts: blogSeeds.length,
          actions: actionSeeds.length,
          events: eventSeeds.length,
        },
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed v2 complete. Admin:', admin.email);
  console.log('Demo donor logins: donor@example.com, amahle.donor@example.com, liam.donor@example.com');
  console.log('Demo sponsor logins: sponsor@example.com and sponsor.*@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
