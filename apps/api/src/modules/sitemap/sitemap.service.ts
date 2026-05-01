import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SitemapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
  ) {}

  /** Front-end origin for canonical URLs (not the API host). */
  siteOrigin(): string {
    return (
      this.cfg.get<string>('SITE_URL')?.replace(/\/$/, '') ??
      this.cfg.get<string>('WEB_ORIGIN')?.replace(/\/$/, '') ??
      'http://localhost:5173'
    );
  }

  async renderXml(): Promise<string> {
    const base = this.siteOrigin();
    const [posts, campaigns] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.campaign.findMany({
        where: { published: true, status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const staticPaths = ['/', '/about', '/campaigns', '/blog', '/contact', '/auth/login'];

    const rows: { loc: string; lastmod?: string }[] = staticPaths.map((p) => ({
      loc: `${base}${p === '/' ? '' : p}`,
    }));

    campaigns.forEach((c) =>
      rows.push({
        loc: `${base}/campaigns/${encodeURIComponent(c.slug)}`,
        lastmod: c.updatedAt.toISOString(),
      }),
    );
    posts.forEach((p) =>
      rows.push({
        loc: `${base}/blog/${encodeURIComponent(p.slug)}`,
        lastmod: p.updatedAt.toISOString(),
      }),
    );

    const body = rows
      .map(
        (r) =>
          `  <url>\n    <loc>${escapeXml(r.loc)}</loc>` +
          (r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : '') +
          `\n  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }
}

function escapeXml(raw: string) {
  return raw.replace(/[<>&'"]/g, (ch) =>
    ch === '<' ?
      '&lt;'
    : ch === '>' ?
      '&gt;'
    : ch === '&' ?
      '&amp;'
    : ch === "'" ?
      '&apos;'
    : '&quot;',
  );
}
