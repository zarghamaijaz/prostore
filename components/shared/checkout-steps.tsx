import { cn } from "@/lib/utils";
import React from "react";

const CheckoutSteps = ({ current = 0 }) => {
    return (
        <div className="flex-between flex-col md:flex-row space-x-2 space-y-2 mb-10">
            {["User Login", "Shipping Address", "Payment method", "Place order"].map((step, index)=>(
                <React.Fragment key={step}>
                    <div className={cn("p-2 w-56 rounded-full text-center text-sm", index === current ? "bg-secondary" : "")}>
                        {step}
                    </div>
                    {step !== "Place order" && <hr className="w-16 border-t border-gray-300 mx-2" />}
                </React.Fragment>

            ))}
        </div>
    );
}
 
export default CheckoutSteps;