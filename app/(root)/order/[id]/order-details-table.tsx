"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime, formatId } from "@/lib/utils";
import { Order } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { updateOrderToPaidCOD, deliverOrder } from "@/lib/actions/order.actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OrderDetailsTable = ({ order, isAdmin }: { order: Order, isAdmin: boolean }) => {
  const {
    id,
    shippingAddress,
    orderitems,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    paymentMethod,
    isPaid,
    paidAt,
    isDelivered,
    deliveredAt,
  } = order;

  // Button to mark order as paid
  const MarkAsPaidButton = () => {
    const [isPending, startTransition] = useTransition();

    return (
      <Button type="button" disabled={isPending} onClick={() => startTransition(async () => {
        const res = await updateOrderToPaidCOD(order.id);
        if(res.success){
          toast.success(res.message);
        }
        else{
          toast.error(res.message);
        }
      })}>
        {isPending ? "Processing..." : "Mark as paid"}
      </Button>
    )
  }
  // Button to mark order as delivered
  const MarkAsDeliveredButton = () => {
    const [isPending, startTransition] = useTransition();

    return (
      <Button type="button" disabled={isPending} onClick={() => startTransition(async () => {
        const res = await deliverOrder(order.id);
        if(res.success){
          toast.success(res.message);
        }
        else{
          toast.error(res.message);
        }
      })}>
        {isPending ? "Processing..." : "Mark as delivered"}
      </Button>
    )
  }

  return (
    <>
      <h1 className="py-4 text-2xl">Order {formatId(order.id)}</h1>
      <div className="grid md:grid-cols-3 md:gap-5">
        <div className="col-span-2 space-y-4 overflow-x-auto">
          <Card className="p-0">
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Payment Method</h2>
              <p className="mb-2">{paymentMethod}</p>
              {isPaid ? (
                <Badge variant="secondary">
                  Paid at {formatDateTime(paidAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant="destructive">Not paid</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="p-0 my-2">
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Shipping Address</h2>
              <p>{shippingAddress.fullName}</p>
              <p className="mb-2">
                {shippingAddress.streetAddress}, {shippingAddress.city}
                {shippingAddress.postalCode}, {shippingAddress.country}
              </p>
              {isDelivered ? (
                <Badge variant="secondary">
                  Delivered at {formatDateTime(deliveredAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant="destructive">Not delivered</Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 gap-4">
              <h2 className="text-xl pb-4">Order Items</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderitems.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <Link
                          href={`/product/${item.slug}`}
                          className="flex items-center"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                          />
                          <span className="px-2">{item.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="px-2">{item.qty}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.price}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div>
            <Card className="p-0">
                <CardContent className="p-4 gap-4 space-y-4">
                    <div className="flex justify-between">
                        <div>Items</div>
                        <div>{formatCurrency(itemsPrice)}</div>
                    </div>
                    <div className="flex justify-between">
                        <div>Tax</div>
                        <div>{formatCurrency(taxPrice)}</div>
                    </div>
                    <div className="flex justify-between">
                        <div>Shipping</div>
                        <div>{formatCurrency(shippingPrice)}</div>
                    </div>
                    <div className="flex justify-between">
                        <div>Total</div>
                        <div>{formatCurrency(totalPrice)}</div>
                    </div>
                    {/* Cash on delivery */}
                    {
                      isAdmin && !isPaid && paymentMethod === "CashOnDelivery" && (
                        <MarkAsPaidButton/>
                      )
                    }
                    {
                      isAdmin && isPaid && !isDelivered && (
                        <MarkAsDeliveredButton/>
                      )
                    }
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsTable;
