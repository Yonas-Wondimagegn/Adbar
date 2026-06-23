import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '@adbar/common';
import { PaginationDto } from '@adbar/common';
import { canTransition, getAllowedTransitions } from './order-state-machine';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== CREATE ORDER ==========

  async createOrder(data: any, userId: string) {
    // Validate cart items and calculate totals
    const productIds = data.items.map((item: any) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: ProductStatus.ACTIVE },
      include: { variants: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    // Build order items with pricing
    const orderItems = [];
    let subtotal = 0;

    // Find the seller (store owner) from the first product
    const firstProduct = products[0];
    const store = await this.prisma.store.findUnique({
      where: { id: firstProduct.storeId },
    });
    if (!store) {
      throw new BadRequestException('Store not found for product');
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      let unitPrice = Number(product.price);
      let variantInfo: { variantId: string; variantName: string } | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v: any) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variant ${item.variantId} not found`);
        }
        if (variant.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${variant.name}`);
        }
        unitPrice = Number(variant.price);
        variantInfo = {
          variantId: variant.id,
          variantName: variant.name,
        };
      } else {
        if (product.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        variantId: variantInfo?.variantId,
        variantName: variantInfo?.variantName,
        productImageUrl: null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    // Apply coupon if provided
    let discountAmount = 0;
    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: data.couponCode } });
      if (coupon && coupon.isActive) {
        const now = new Date();
        if (!coupon.startsAt || now >= coupon.startsAt) {
          if (!coupon.expiresAt || now <= coupon.expiresAt) {
            if (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) {
              if (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount)) {
                if (coupon.discountType === 'percentage') {
                  discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
                  if (coupon.maxDiscount) {
                    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
                  }
                } else {
                  discountAmount = Number(coupon.discountValue);
                }
              }
            }
          }
        }
      }
    }

    // Calculate shipping (simplified - could be based on location/weight)
    const shippingCost = subtotal > 500 ? 0 : 50; // Free shipping over 500 ETB
    const taxAmount = subtotal * 0.15; // 15% tax
    const total = subtotal - discountAmount + shippingCost + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        buyerId: userId,
        sellerId: store.userId,
        status: OrderStatus.PENDING,
        subtotal,
        discountAmount,
        shippingCost,
        taxAmount,
        total,
        currency: data.currency || 'ETB',
        shippingAddress: data.shippingAddress as any,
        buyerNote: data.notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    // Update product stock
    for (const item of data.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });

      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    // Increment coupon usage if applicable
    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: data.couponCode } });
      if (coupon && coupon.isActive) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    return order;
  }

  // ========== GET ORDERS ==========

  async getUserOrders(userId: string, paginationDto: PaginationDto, status?: string) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { buyerId: userId };
    if (status) {
      where.status = status as OrderStatus;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
          seller: { select: { id: true, firstName: true, lastName: true } },
          transactions: { select: { id: true, status: true, providerId: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getSellerOrders(sellerId: string, paginationDto: PaginationDto, status?: string) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = { sellerId };
    if (status) {
      where.status = status as OrderStatus;
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          transactions: { select: { id: true, status: true, providerId: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        transactions: true,
        dispute: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check authorization
    if (order.buyerId !== userId && order.sellerId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
      const isAdmin = user?.roles?.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    return order;
  }

  // ========== UPDATE ORDER STATUS ==========

  async updateOrderStatus(id: string, data: any, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Verify seller owns this order
    if (order.sellerId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
      const isAdmin = user?.roles?.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('You can only update orders from your store');
      }
    }

    const currentStatus = order.status;
    const newStatus = data.status as OrderStatus;

    // Validate state transition
    if (!canTransition(currentStatus, newStatus)) {
      const allowed = getAllowedTransitions(currentStatus);
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: [${allowed.join(', ')}]`,
      );
    }

    // Update order
    const updateData: any = { status: newStatus };

    if (newStatus === OrderStatus.SHIPPED) {
      if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
      updateData.shippedAt = new Date();
    }

    if (newStatus === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return updatedOrder;
  }

  // ========== CANCEL ORDER ==========

  async cancelOrder(id: string, reason: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check authorization
    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
    const isAdmin = user?.roles?.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    // Validate transition
    if (!canTransition(order.status, OrderStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} status`);
    }

    // Restore stock
    const orderItems = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    for (const item of orderItems) {
      if (item.productId) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { increment: item.quantity } },
        });
      }
    }

    // Update order
    const cancelledOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        sellerNote: reason,
      },
    });

    return cancelledOrder;
  }

  // ========== CONFIRM DELIVERY ==========

  async confirmDelivery(id: string, data: any, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can confirm delivery');
    }

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Order must be in SHIPPED status to confirm delivery');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        buyerNote: data.recipientName ? `Received by: ${data.recipientName}` : undefined,
      },
    });

    return updatedOrder;
  }

  // ========== ORDER HISTORY ==========

  async getOrderHistory(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check authorization
    if (order.buyerId !== userId && order.sellerId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
      const isAdmin = user?.roles?.some((r: any) => r.role === 'ADMIN' || r.role === 'SUPER_ADMIN');
      if (!isAdmin) {
        throw new ForbiddenException('You do not have access to this order');
      }
    }

    // Since there's no OrderStatusHistory model in the schema,
    // return order status info from the order itself
    return [{
      orderId: id,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }];
  }
}
