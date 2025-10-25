export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Prostore";
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "A Next.js ecommerce platform";
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export const LATEST_PRODUCTS_LIMIT = Number(process.env.NEXT_PUBLIC_LATEST_PRODUCTS_LIMIT) || 4;

export const signInDefaultValues = {
    email: "",
    password: "",
}
export const signUpDefaultValues = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
}

export const shippingAddressDefaultvalues = {
    fullName: "",
    streetAddress: "",
    city: "",
    postalCode: "",
    country: "",
}

export const PAYMENT_METHODS = process.env.PAYMENT_METHODS ? process.env.PAYMENT_METHODS.split(", ") : ["PayPal", "Stripe", "CashOnDelivery"];
export const DEFAULT_PAYMENT_METHOD = process.env.DEFAULT_PAYMENT_METHOD || "PayPal";


export const PAGE_SIZE = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 12;