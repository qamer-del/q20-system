import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function protectRoute(allowedRoles: ("ADMIN" | "MANAGER" | "CASHIER")[]) {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    // @ts-ignore
    if (!allowedRoles.includes(session.user.role)) {
        // Redirect cashiers to POS if they lack access. Otherwise dashboard.
        // @ts-ignore
        if (session.user.role === "CASHIER") redirect("/pos")
        else redirect("/dashboard")
    }

    return session
}
