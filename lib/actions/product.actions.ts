"use server"

import { PrismaClient } from "@prisma/client"
import { prisma } from "@/db/prisma"
import { convertToPlainObject, formatError } from "../utils";
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from "../constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "../validators";

// Get latest products
export async function getLatestProducts(){
    // const prisma = new PrismaClient();
    const data = await prisma.product.findMany({
        take: LATEST_PRODUCTS_LIMIT,
        orderBy: {
            createdAt: 'desc'
        }
    })
    return convertToPlainObject(data);
}

// Get single product by ID

export async function getProductById(productId: string) {
    const data =  await prisma.product.findFirst({
        where: {id: productId},
    });
    return convertToPlainObject(data);
}
// Get single product by slug

export async function getProductBySlug(slug: string) {
    return await prisma.product.findFirst({
        where: {slug: slug},
    });
}

// get all products
export async function getAllProducts({query, limit = PAGE_SIZE, page, category}: {
    query: string;
    limit?: number;
    page: number;
    category?: string;
}){
    const data = await prisma.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {createdAt: "desc"},
    });
    const dataCount = await prisma.product.count();
    return {data, totalPages: Math.ceil(dataCount / limit)}
}

// Delete a product
export async function deleteProduct(id: string) {
    try{
        const productExists = await prisma.product.findFirst({where: {id: id}});
        if(!productExists) throw new Error("Product not found");
        await prisma.product.delete({where: {id: id}});
        revalidatePath("/admin/products");
        return {
            success: true,
            message: "Product deleted successfully"
        }
    }catch(error){
        return {
            success: false,
            message: formatError(error)
        }
    }
}

// Create product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
    try{
        const product = insertProductSchema.parse(data);
        await prisma.product.create({data: product});
        revalidatePath("/admin/products");
        return {
            success: true,
            message: "Product created successfully"
        }
    }catch(error){
        return {
            success: false,
            message: formatError(error)
        }
    }
}
// Update product
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
    try{
        const product = insertProductSchema.parse(data);
        const productExists = await prisma.product.findFirst({where: {id: data.id}});
        if(!productExists) throw new Error("Product not found");


        await prisma.product.update({where: {id: data.id}, data: product});
        revalidatePath("/admin/products");
        return {
            success: true,
            message: "Product updated successfully"
        }
    }catch(error){
        return {
            success: false,
            message: formatError(error)
        }
    }
}