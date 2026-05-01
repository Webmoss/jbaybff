import { Controller, Get, Header } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

@Controller('seo')
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=UTF-8')
  async xml() {
    return this.sitemap.renderXml();
  }

  /** JSON mirror for SPA consumers / CDN workers */
  @Get('routes.json')
  async routesJson() {
    const xml = await this.sitemap.renderXml();
    return { hint: 'Use sitemap.xml for crawlers', xmlLength: xml.length };
  }
}
