"use client"

import { Button } from "@/components/ui/button"

export default function ExportButton() {
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
