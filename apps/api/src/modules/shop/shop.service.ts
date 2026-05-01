import * as crypto from 'crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, ShopInventoryStatus, ShopProductStatus } from '@prisma/client';
import { slugify } from '../../common/utils/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateShopCheckoutDto } from './dto/create-shop-checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaystackClientService } from '../donations/paystack-client.service';

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackClientService,
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  listPublicProducts() {
    return this.prisma.shopProduct.findMany({
      where: { status: ShopProductStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  detailPublicProduct(slug: string) {
    return this.prisma.shopProduct.findFirst({
      where: { slug, status: ShopProductStatus.ACTIVE },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  listAdminProducts() {
    return this.prisma.shopProduct.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      },
    });
  }

  async createAdminProduct(dto: CreateProductDto) {
    const baseSlug = dto.slug?.trim()?.length ? slugify(dto.slug) : slugify(dto.title);
    const slug = await this.ensureUniqueProductSlug(baseSlug || 'product');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.shopProduct.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          category: dto.category ?? null,
          imageUrl: dto.imageUrl ?? null,
          status: dto.status ?? ShopProductStatus.DRAFT,
        },
      });

      if (dto.variants.length) {
        await tx.shopProductVariant.createMany({
          data: dto.variants.map((variant) => ({
            productId: product.id,
            sku: variant.sku.trim(),
            title: variant.title,
            optionLabel: variant.optionLabel ?? null,
            price: new Prisma.Decimal(variant.price.toFixed(2)),
            compareAtPrice:
              variant.compareAtPrice !== undefined ? new Prisma.Decimal(variant.compareAtPrice.toFixed(2)) : null,
            inventoryQty: variant.inventoryQty ?? 0,
            inventoryStatus: variant.inventoryStatus ?? 'IN_STOCK',
            isDefault: variant.isDefault ?? false,
            isActive: variant.isActive ?? true,
          })),
        });
      }

      return tx.shopProduct.findUniqueOrThrow({
        where: { id: product.id },
        include: { variants: true },
      });
    });
  }

  async updateAdminProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.shopProduct.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shop product not found');

    const nextSlug =
      dto.slug !== undefined || dto.title !== undefined ?
        await this.ensureUniqueProductSlug(
          slugify(dto.slug?.trim()?.length ? dto.slug : (dto.title ?? existing.title)) || 'product',
          id,
        )
      : existing.slug;

    return this.prisma.$transaction(async (tx) => {
      await tx.shopProduct.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          slug: nextSlug,
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });

      if (dto.variants) {
        await tx.shopProductVariant.deleteMany({ where: { productId: id } });
        if (dto.variants.length) {
          await tx.shopProductVariant.createMany({
            data: dto.variants.map((variant) => ({
              productId: id,
              sku: variant.sku.trim(),
              title: variant.title,
              optionLabel: variant.optionLabel ?? null,
              price: new Prisma.Decimal(variant.price.toFixed(2)),
              compareAtPrice:
                variant.compareAtPrice !== undefined ? new Prisma.Decimal(variant.compareAtPrice.toFixed(2)) : null,
              inventoryQty: variant.inventoryQty ?? 0,
              inventoryStatus: variant.inventoryStatus ?? 'IN_STOCK',
              isDefault: variant.isDefault ?? false,
              isActive: variant.isActive ?? true,
            })),
          });
        }
      }

      return tx.shopProduct.findUniqueOrThrow({
        where: { id },
        include: {
          variants: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        },
      });
    });
  }

  listAdminOrders() {
    return this.prisma.shopOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async startCheckout(dto: CreateShopCheckoutDto, authorizationHeader?: string) {
    if (!dto.items.length) throw new BadRequestException('At least one item is required');
    const userId = this.tryUserIdFromAuth(authorizationHeader);

    const rows = await this.prisma.shopProductVariant.findMany({
      where: {
        id: { in: dto.items.map((item) => item.variantId) },
        isActive: true,
        product: { status: ShopProductStatus.ACTIVE },
      },
      include: { product: true },
    });

    if (rows.length !== dto.items.length) {
      throw new BadRequestException('One or more variants are unavailable');
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    const normalizedItems = dto.items.map((item) => {
      const variant = byId.get(item.variantId);
      if (!variant) throw new BadRequestException('One or more variants are unavailable');
      if (
        variant.inventoryStatus !== ShopInventoryStatus.PREORDER &&
        variant.inventoryQty < item.quantity
      ) {
        throw new BadRequestException(`Insufficient stock for ${variant.title}`);
      }

      const unitPrice = Number(variant.price);
      const lineTotal = unitPrice * item.quantity;
      return { item, variant, unitPrice, lineTotal };
    });

    const totalAmount = normalizedItems.reduce((sum, row) => sum + row.lineTotal, 0);
    const amountCents = Math.round(totalAmount * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      throw new BadRequestException('Order total must be at least R1.00');
    }

    const reference = await this.allocateOrderReference();
    const callbackBase =
      this.cfg.get<string>('PAYSTACK_SHOP_CALLBACK_URL') ?? 'http://localhost:5173/shop/thanks';
    const callbackUrl = `${callbackBase.replace(/\/$/, '')}?ref=${encodeURIComponent(reference)}`;

    const order = await this.prisma.shopOrder.create({
      data: {
        reference,
        paystackReference: reference,
        userId,
        customerEmail: dto.email.toLowerCase(),
        customerName: dto.name.trim(),
        customerPhone: dto.phone?.trim() || null,
        currency: 'ZAR',
        totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
        metadata: {
          source: 'shop-checkout',
          requestedAt: new Date().toISOString(),
        },
        items: {
          create: normalizedItems.map((row) => ({
            productId: row.variant.productId,
            variantId: row.variant.id,
            productTitle: row.variant.product.title,
            variantTitle: row.variant.title,
            sku: row.variant.sku,
            unitPrice: new Prisma.Decimal(row.unitPrice.toFixed(2)),
            quantity: row.item.quantity,
            lineTotal: new Prisma.Decimal(row.lineTotal.toFixed(2)),
          })),
        },
      },
      include: { items: true },
    });

    try {
      const init = await this.paystack.initializeTransaction({
        email: dto.email,
        amountCents,
        reference,
        callbackUrl,
        metadata: {
          source: 'shop-checkout',
          orderId: order.id,
        },
      });
      return {
        authorizationUrl: init.authorizationUrl,
        reference: init.reference,
        orderId: order.id,
      };
    } catch (err) {
      await this.prisma.shopOrder.delete({ where: { id: order.id } }).catch(() => undefined);
      throw err;
    }
  }

  async verifyAndSyncOrder(reference: string) {
    const row = await this.prisma.shopOrder.findUnique({
      where: { paystackReference: reference },
      include: { items: true },
    });
    if (!row) throw new NotFoundException('Order not found');
    if (row.paymentStatus === 'PAID') return { status: 'completed', order: row };

    const remote = await this.paystack.verifyTransaction(reference);
    if (remote.ok) {
      await this.settleOrderByReference(reference, remote.id);
      const updated = await this.prisma.shopOrder.findUniqueOrThrow({
        where: { paystackReference: reference },
        include: { items: true },
      });
      return { status: 'completed', order: updated };
    }

    return { status: row.paymentStatus.toLowerCase(), order: row };
  }

  async handlePaystackWebhook(body: Record<string, unknown>) {
    const event = typeof body.event === 'string' ? body.event : '';
    if (event !== 'charge.success') return { received: true, ignored: event || 'unknown' };
    const data = body.data as { reference?: string; id?: number } | undefined;
    const reference = data?.reference;
    if (!reference) return { received: true, ignored: 'no-reference' };

    const remote = await this.paystack.verifyTransaction(reference);
    if (!remote.ok) {
      await this.prisma.shopOrder
        .updateMany({
          where: { paystackReference: reference, paymentStatus: 'PENDING' },
          data: {
            paymentStatus: 'FAILED',
            status: 'CANCELLED',
          },
        })
        .catch(() => undefined);
      return { received: true, note: 'verify-failed' };
    }

    await this.settleOrderByReference(reference, remote.id);
    return { received: true, settled: reference };
  }

  async updateAdminOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.prisma.shopOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shop order not found');
    return this.prisma.shopOrder.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.paymentStatus !== undefined ? { paymentStatus: dto.paymentStatus } : {}),
        ...(dto.fulfillmentStatus !== undefined ? { fulfillmentStatus: dto.fulfillmentStatus } : {}),
        ...(dto.trackingRef !== undefined ? { trackingRef: dto.trackingRef } : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        items: true,
      },
    });
  }

  private async ensureUniqueProductSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base || 'product';
    for (let i = 1; i <= 900; i++) {
      const clash = await this.prisma.shopProduct.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!clash) return candidate;
      candidate = `${base}-${i + 1}`;
    }
    throw new ConflictException('Could not derive unique product slug');
  }

  private async settleOrderByReference(reference: string, paymentIntentId?: string) {
    const order = await this.prisma.shopOrder.findUnique({
      where: { paystackReference: reference },
      include: { items: true },
    });
    if (!order || order.paymentStatus !== 'PENDING') return;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.shopOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      if (!current || current.paymentStatus !== 'PENDING') return;

      for (const item of current.items) {
        if (!item.variantId) continue;
        const variant = await tx.shopProductVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) continue;
        const nextQty = Math.max(0, variant.inventoryQty - item.quantity);
        const nextStatus =
          variant.inventoryStatus === ShopInventoryStatus.PREORDER ?
            ShopInventoryStatus.PREORDER
          : nextQty === 0 ? ShopInventoryStatus.OUT_OF_STOCK
          : nextQty <= 3 ? ShopInventoryStatus.LOW_STOCK
          : ShopInventoryStatus.IN_STOCK;
        await tx.shopProductVariant.update({
          where: { id: variant.id },
          data: {
            inventoryQty: nextQty,
            inventoryStatus: nextStatus,
          },
        });
      }

      await tx.shopOrder.update({
        where: { id: current.id },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          paymentIntentId: paymentIntentId ?? current.paymentIntentId,
        },
      });
    });
  }

  private tryUserIdFromAuth(authorizationHeader?: string): string | null {
    if (!authorizationHeader?.startsWith('Bearer ')) return null;
    const token = authorizationHeader.slice(7).trim();
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private async allocateOrderReference(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const candidate = `jbs_${crypto.randomBytes(10).toString('hex')}`;
      const clash = await this.prisma.shopOrder.findUnique({ where: { reference: candidate } });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Could not allocate payment reference');
  }
}
