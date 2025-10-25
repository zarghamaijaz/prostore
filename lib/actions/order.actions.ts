"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { convertToPlainObject, formatError } from "../utils";
import { auth } from "@/auth";
import { getMyCart } from "./cart.actions";
import { getUserById } from "./user.actions";
import { insertOrderSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { CartItem, PaymentResult } from "@/types";
import { PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Create order and create items
export async function createOrder() {
  try {
    const session = await auth();
    if (!session) throw new Error("User is not authenticated");

    const cart = await getMyCart();
    const userId = session?.user?.id;
    if (!userId) throw new Error("User not found");

    const user = await getUserById(userId);
    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty",
        redirectTo: "/cart",
      };
    }
    if (!user.address) {
      return {
        success: false,
        message: "No address saved",
        redirectTo: "/shipping-address",
      };
    }
    if (!user.paymentMethod) {
      return {
        success: false,
        message: "No payment method saved",
        redirectTo: "/payment-method",
      };
    }
    // Create order object
    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });
    // create a transaction
    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({ data: order });
      // create orderItems from cart items
      for (const item of cart.items as CartItem[]) {
        await tx.orderItem.create({
          data: {
            ...item,
            price: item.price,
            orderId: insertedOrder.id,
          },
        });
      }
      // Clear the cart
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          itemsPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
          totalPrice: 0,
        },
      });
      return insertedOrder.id;
    });
    if (!insertedOrderId) throw new Error("Order not created");
    return {
      success: true,
      message: "Order created successfully",
      redirectTo: `/order/${insertedOrderId}`,
    };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      success: false,
      message: formatError(error),
    };
  }
}

// Get order by id
export async function getOrderById(orderId: string) {
  const data = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
        orderitems: true,
        user: {
            select: {
                name: true,
                email: true,
            }
        }
    }
  });
  return convertToPlainObject(data);
}


// Get user orders
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}:{
  limit?: number;
  page: number;
}) {
  const session = await auth();
  if(!session) throw new Error("User is not authorized");
  const data = await prisma.order.findMany({
    where: {userId: session?.user?.id},
    orderBy: {createdAt: "desc"},
    take: limit,
    skip: (page - 1) * limit
  });
  const dataCount = await prisma.order.count({where: {userId: session?.user?.id}});
  return {data, totalPages: Math.ceil(dataCount / limit)};
}

type SalesDataType = {
  month: string;
  totalSales: number
}[];

// Get sales data and order summary
export async function getOrderSummary(){

  // Get counts for each customer
  const ordersCount = await prisma.order.count();
  const productCount = await prisma.product.count();
  const usersCount = await prisma.user.count();

  // Calculate total sale
  const totalSales = await prisma.order.aggregate({
    _sum: { totalPrice: true }
  });

  // Get monthly sales
  const salesDataRaw = await prisma.$queryRaw<Array<{month: string, totalSales: Prisma.Decimal}>>
  `SELECT to_char("createdAt", 'MM/YY') as "month", sum("totalPrice") as "totalSales" FROM "Order" GROUP BY to_char("createdAt", 'MM/YY')`;
  const salesData: SalesDataType = salesDataRaw.map((entry) => ({
    month: entry.month,
    totalSales: Number(entry.totalSales)
  }))

  // Get latest sales
  const latestSales = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: {select: {name: true}}
    },
    take: 6
  });
  return {ordersCount, productCount, usersCount, totalSales, salesData, latestSales};
}


// Get All orders

export async function getAllOrders({
  limit = PAGE_SIZE,
  page
}: {
  limit?: number;
  page: number;
}) {
  const data = await prisma.order.findMany({
    orderBy:{createdAt: "desc"},
    take: limit,
    skip: (page - 1) * limit,
    include: {user: {select: {name: true}}}
  });
  const dataCount = await prisma.order.count();
  return {data, totalPages: Math.ceil(dataCount / limit)};
}

// Delete order
export async function deleteOrder(id: string) {
  try{
    await prisma.order.delete({where: {id}});
    revalidatePath("/admin/orders");
    return {
      success: true,
      message: "Order deleted successfully"
    }
  }catch(error){
    return {
      success: false,
      message: formatError(error)
    }
  }
}

// Update order to paid
export async function updateOrderToPaid({
  orderId,
  paymentResult,
}: {
  orderId: string;
  paymentResult?: PaymentResult;
}) {
  // Get order from database
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
    },
    include: {
      orderitems: true,
    },
  });

  if (!order) throw new Error('Order not found');

  if (order.isPaid) throw new Error('Order is already paid');

  // Transaction to update order and account for product stock
  await prisma.$transaction(async (tx) => {
    // Iterate over products and update stock
    for (const item of order.orderitems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: -item.qty } },
      });
    }

    // Set the order to paid
    await tx.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult,
      },
    });
  });

  // Get updated order after transaction
  const updatedOrder = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      orderitems: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!updatedOrder) throw new Error('Order not found');

  // sendPurchaseReceipt({
  //   order: {
  //     ...updatedOrder,
  //     shippingAddress: updatedOrder.shippingAddress as ShippingAddress,
  //     paymentResult: updatedOrder.paymentResult as PaymentResult,
  //   },
  // });
}

// Update COD order to paid
export async function updateOrderToPaidCOD(orderId: string) {
  try{
    await updateOrderToPaid({orderId});
    revalidatePath(`/orders/${orderId}`);
    return {success: true, message: "Order marked as paid."}
  }catch(error){
    return {success: false, message: formatError(error)}
  }
}

// Update COD order to delivered
export async function deliverOrder(orderId: string) {
  try{
    const order = await prisma.order.findFirst({
      where: {id: orderId},
    });
    if(!order) throw new Error("Order not found");
    if(!order.isPaid) throw new Error("Order is not paid");

    await prisma.order.update({
      where: {id: orderId},
      data: {isDelivered: true, deliveredAt: new Date()}
    });
    revalidatePath(`/orders/${orderId}`);
    return {success: true, message: "Order marked as delivered."}
  }catch(error){
    return {success: false, message: formatError(error)}
  }
}