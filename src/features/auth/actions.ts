"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error: any) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." }
        default:
          return { error: "Something went wrong." }
      }
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
