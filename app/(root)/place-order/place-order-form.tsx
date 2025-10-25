"use client";
import { createOrder } from "@/lib/actions/order.actions";
import { useFormStatus } from "react-dom";
import { Check, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const PlaceOrderForm = () => {
    const router = useRouter();
    const PlaceOrderButton = () => {
        const {pending} = useFormStatus();
        return(
            <Button disabled={pending} className="w-full">
                {pending ? (<Loader className="h-4 w-4 animate-spin" />) : (<Check className="h-4 w-4" />)}{" "}
                {pending ? "Placing order..." : "Place order"}
            </Button>
        )
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const res = await createOrder();
        if(res.redirectTo) {
            router.push(`${res.redirectTo}`);
        }
    }

    return (
        <form className="w-full" onSubmit={handleSubmit}>
            <PlaceOrderButton />
        </form>
    );
}
 
export default PlaceOrderForm;