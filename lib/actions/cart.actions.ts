"use server";

import { cookies } from "next/headers";
import { CartItem } from "@/types";
import { convertToPlainObject, formatError, round2 } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validators";
import { revalidatePath } from "next/cache";

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
    items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
  ),
  shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
  taxPrice = round2(0.15 * itemsPrice),
  totalPrice = round2(itemsPrice + shippingPrice + taxPrice);
  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  }
}

export async function addItemToCart(data: CartItem) {
  try {
    // Check for the cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    // GET session and user id
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get cart
    const cart = await getMyCart();
    // Parse and validate data
    const item = cartItemSchema.parse(data);
    // Find product in DB
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    })
    if(!product) throw new Error("Product not found");
    if(!cart){
      // Create new cart
      const newCart = insertCartSchema.parse({
        userId: userId,
        items: [item],
        sessionCartId: sessionCartId,
        ...calcPrice([item])
      });
      // Add to database
      await prisma.cart.create({
        data: newCart,
      })
      revalidatePath(`/product/${product.slug}`);
      return {
        success: true,
        message: `${product.name} added to cart"`,
      };
    }
    else{
      // Check if item is already in cart
      const existItem = (cart.items as CartItem[]).find((x) => x.productId === item.productId);
      if(existItem){
        // Check stock
        if(product.stock < existItem.qty + 1){
          throw new Error("Product out of stock");
        }
        // Increase quantity
        (cart.items as CartItem[]).find((x) => x.productId === item.productId)!.qty = existItem.qty + 1;
      }else{
        // If item does not exist in cart
        // Check stock
        if(product.stock < 1){
          throw new Error("Product out of stock");
        }
        // Add item to cart.items
        cart.items.push(item);
      }
      await prisma.cart.update({
        where: {
          id: cart.id,
        },
        data: {
          items: cart.items,
          ...calcPrice(cart.items as CartItem[]),
        },
      })
      revalidatePath(`/product/${product.slug}`);
      return {
        success: true,
        message: `${product.name} ${existItem ? "updated in" : "added to"} cart`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

export async function getMyCart() {
  try {
    // Check for the cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    // GET session and user id
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get user cart from db
    const cart = await prisma.cart.findFirst({
        where: userId ? { userId } : { sessionCartId },
    })

    if(!cart) return undefined;

    // Convert decimals and return
    return convertToPlainObject({
        ...cart,
        items: cart.items as CartItem[],
        itemsPrice: cart.itemsPrice.toString(),
        totalPrice: cart.totalPrice.toString(),
        shippingPrice: cart.shippingPrice.toString(),
        taxPrice: cart.taxPrice.toString(),
    })


  } catch (error) {}
}


export async function removeItemFromCart(productId: string) {
  try{
    // Check for cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    // Get product
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if(!product) throw new Error("Product not found");

    // Get user cart
    const cart = await getMyCart();
    if(!cart) throw new Error("Cart not found");

    // Check the item
    const exist = (cart.items as CartItem[]).find((x) => x.productId === productId);
    if(!exist) throw new Error("Item not found");

    // Check if only one in cart
    if(exist.qty === 1){
      // Remove from cart
      cart.items = (cart.items as CartItem[]).filter((x) => x.productId !== exist.productId);
    }
    else{
      // Decrease the quantity
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty = exist.qty - 1;
    }
    // Update cart in DB
    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        items: cart.items,
        ...calcPrice(cart.items as CartItem[]),
      },
    });
    revalidatePath(`/product/${product.slug}`);
    return {
      success: true,
      message: `${product.name} removed from cart`,
    }

  }catch(error){
    return {
      success: false,
      message: formatError(error),
    };
  }
}