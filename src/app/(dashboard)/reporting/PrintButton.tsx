"use client"

import { Button } from "@/components/ui/button"

export function PrintButton() {
    return (
        <Button
            variant="outline"
            className="shadow-none hidden md:flex"
            onClick={() => window.print()}
        >
            Export PDF
        </Button>
    )
}
