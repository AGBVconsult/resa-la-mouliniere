import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin") ||
                       req.nextUrl.pathname.startsWith("/admin-mobile") ||
                       req.nextUrl.pathname.startsWith("/admin-tablette")
  const isLoginPage = req.nextUrl.pathname.startsWith("/admin/login")
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
  
  if (isAdminRoute && !isLoginPage && !isApiAuthRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
})

export const config = {
  matcher: ["/admin/:path*", "/admin-mobile/:path*", "/admin-tablette/:path*"]
}
