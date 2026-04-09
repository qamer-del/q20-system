"use client"

import { deleteTank } from "@/features/inventory/actions"
import { Trash2 } from "lucide-react"
import ActionForm from "@/components/ActionForm"
import SubmitButton from "@/components/SubmitButton"

export default function DeleteTankButton({ tankId }: { tankId: string }) {
  const safetyConfirm = (formData: FormData) => {
    if (!confirm("Are you sure you want to delete this tank? This cannot be undone.")) {
      return;
    }
    return deleteTank(formData).then(res => {
      if (res?.error) throw new Error(res.error);
      return res;
    });
  }

  return (
    <ActionForm
      action={safetyConfirm}
      successMessage="Tank deleted successfully"
      className="ml-3"
    >
      <input type="hidden" name="tankId" value={tankId} />
      <SubmitButton
        variant="ghost"
        className="p-2 h-auto text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
        title="Delete Tank"
      >
        <Trash2 className="w-4 h-4" />
      </SubmitButton>
    </ActionForm>
  )
}

