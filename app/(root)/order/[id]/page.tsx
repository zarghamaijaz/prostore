import { Metadata } from "next";
import { getOrderById } from "@/lib/actions/order.actions";
import { notFound } from "next/navigation";
import OrderDetailsTable from "./order-details-table";
import { ShippingAddress } from "@/types";
import { auth } from "@/auth";
// import { ShippingAddress } from "@/types";

export const metadata: Metadata = {
    title: "Order Details"
}

const OrderDetailsPage = async (props: {
    params: Promise<{id: string}>
}) => {
    const { id } = await props.params;
    const session = await auth();

    const order = await getOrderById(id);
    if(!order) return notFound();
    return (
        <OrderDetailsTable order={{...order, shippingAddress: order.shippingAddress as ShippingAddress}} isAdmin={session?.user?.role === "admin" || false } />
    );
}
 
export default OrderDetailsPage;