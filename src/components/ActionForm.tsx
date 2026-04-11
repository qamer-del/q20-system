"use client"

import React, { useRef, useState } from "react"
import { toast } from "sonner"

interface ActionFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    action: (formData: FormData) => Promise<any> | void;
    successMessage?: string;
    loadingMessage?: string;
    resetOnSuccess?: boolean;
    confirmMessage?: string;
}

export default function ActionForm({
    action,
    successMessage = "Operation completed successfully.",
    loadingMessage = "Processing...",
    resetOnSuccess = true,
    confirmMessage,
    ...props
}: ActionFormProps) {
    const ref = useRef<HTMLFormElement>(null)
    const [pending, setPending] = useState(false)

    const clientAction = async (formData: FormData) => {
        // Optional confirmation dialog
        if (confirmMessage && !window.confirm(confirmMessage)) return

        setPending(true)

        const result = action(formData)
        const promise = result instanceof Promise ? result : Promise.resolve(result)

        toast.promise(promise, {
            loading: loadingMessage,
            success: successMessage,
            error: (err: any) => {
                if (err?.message?.includes("NEXT_REDIRECT")) return successMessage
                return err?.message || "An error occurred. Please try again."
            }
        })

        try {
            await promise
            if (resetOnSuccess) {
                ref.current?.reset()
            }
        } catch (err: any) {
            if (!err?.message?.includes("NEXT_REDIRECT")) {
                console.error(err)
            }
        } finally {
            setPending(false)
        }
    }

    // Inject pending state via data attribute so child SubmitButton can read it
    return (
        <form
            ref={ref}
            action={clientAction}
            data-pending={pending ? "true" : undefined}
            {...props}
        />
    )
}
