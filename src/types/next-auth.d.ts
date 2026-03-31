import "next-auth"
import type { DefaultSession } from "next-auth"

// Define the Role enum for strict typing
export type Role = "ADMIN" | "ACCOUNTANT" | "CASHIER" | "VIEWER"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
  }
}
