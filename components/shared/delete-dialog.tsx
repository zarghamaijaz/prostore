"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";

const DeleteDialog = ({id, action}: {
    id: string,
    action: (id: string) => Promise<{success: boolean, message: string}>
}) => {

    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleDeleteClick = async () => {
        startTransition(async () => {
            const res = await action(id);
            if(!res.success){
                toast.error(res.message);
                return;
            }
            else{
                toast.success(res.message);
                setOpen(false);
            }
        });
    }


    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDeleteClick}>
                        {isPending ? "Deleting..." : "Delete"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
 
export default DeleteDialog;