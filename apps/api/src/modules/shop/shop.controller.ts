import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateShopCheckoutDto } from './dto/create-shop-checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('public/products')
  publicListProducts() {
    return this.shopService.listPublicProducts();
  }

  @Get('public/products/:slug')
  async publicDetailProduct(@Param('slug') slug: string) {
    const product = await this.shopService.detailPublicProduct(slug);
    if (!product) throw new NotFoundException();
    return product;
  }

  @Post('checkout')
  checkout(
    @Body() dto: CreateShopCheckoutDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.shopService.startCheckout(dto, authorization);
  }

  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.shopService.verifyAndSyncOrder(reference);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/products')
  adminListProducts() {
    return this.shopService.listAdminProducts();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/products')
  adminCreateProduct(@Body() dto: CreateProductDto) {
    return this.shopService.createAdminProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/products/:id')
  adminUpdateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shopService.updateAdminProduct(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/orders')
  adminListOrders() {
    return this.shopService.listAdminOrders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/orders/:id/status')
  adminUpdateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.shopService.updateAdminOrderStatus(id, dto);
  }
}
