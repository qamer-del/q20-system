"use client"

import React, { useRef } from "react"
import { toast } from "sonner"

interface ActionFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    action: (formData: FormData) => Promise<any> | void;
    successMessage?: string;
    resetOnSuccess?: boolean;
}

export default function ActionForm({
    action,
    successMessage = "Success!",
    resetOnSuccess = true,
    ...props
}: ActionFormProps) {
    const ref = useRef<HTMLFormElement>(null);

    const clientAction = async (formData: FormData) => {
        const result = action(formData);
        const promise = result instanceof Promise ? result : Promise.resolve(result);

        // toast.promise displays immediate loading feedback and resolves on promise completion
        toast.promise(promise, {
            loading: "Processing operation...",
            success: successMessage,
            error: (err: any) => {
                // Next.js redirect throws an error to halt execution; treat it as success silently
                if (err?.message?.includes("NEXT_REDIRECT")) return successMessage;
                return err?.message || "An error occurred";
            }
        });

        try {
            await promise;
            if (resetOnSuccess) {
                ref.current?.reset();
            }
        } catch (err: any) {
            if (!err?.message?.includes("NEXT_REDIRECT")) {
                console.error(err);
            }
        }
    };

    return <form ref={ref} action={clientAction} {...props} />;
}
