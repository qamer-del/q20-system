"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    className?: string;
    children: React.ReactNode;
}

export default function SubmitButton({ variant = "default", className, children, ...props }: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} variant={variant} className={className} {...props}>
            {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </Button>
    );
}
