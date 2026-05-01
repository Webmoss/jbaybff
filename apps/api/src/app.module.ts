import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { BlogModule } from './modules/blog/blog.module';
import { DonationsModule } from './modules/donations/donations.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HealthModule } from './modules/health/health.module';
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { KpiModule } from './modules/kpi/kpi.module';
import { ActionsModule } from './modules/actions/actions.module';
import { EventsModule } from './modules/events/events.module';
import { ImpactModule } from './modules/impact/impact.module';
import { PartnershipsModule } from './modules/partnerships/partnerships.module';
import { RetentionModule } from './modules/retention/retention.module';
import { ShopModule } from './modules/shop/shop.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads', 'public'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
    SponsorsModule,
    BlogModule,
    DonationsModule,
    UploadsModule,
    HealthModule,
    SitemapModule,
    KpiModule,
    ActionsModule,
    EventsModule,
    ImpactModule,
    PartnershipsModule,
    RetentionModule,
    ShopModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
