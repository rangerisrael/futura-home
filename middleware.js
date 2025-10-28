import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// Define protected routes and their allowed roles
const roleBasedRoutes = {
  // Admin only routes
  "/settings": ["admin"],
  "/settings/users": ["admin"],

  // Admin and Manager routes
  "/homeowners": ["admin", "customer service"],
  "/staff": ["admin", "customer service"],
  "/branches": ["admin", "customer service"],

  // Admin, Manager, and Staff routes
  "/services": ["admin", "customer service", "sales representative"],
  "/requests": ["admin", "customer service", "sales representative"],
  "/messages": ["admin", "customer service", "sales representative"],
  "/complaints": ["admin", "customer service", "sales representative"],
  "/announcements": ["admin", "customer service", "sales representative"],
  "/homeowner-announcement": ["admin", "customer service"],
  "/events": ["admin", "customer service", "sales representative"],
  "/payments": ["admin", "customer service", "sales representative"],

  // All authenticated users can access
  "/dashboard": [
    "admin",
    "customer service",
    "sales representative",
    "home owner",
  ],
  "/location": [
    "admin",
    "customer service",
    "sales representative",
    "home owner",
  ],
  "/profile": [
    "admin",
    "customer service",
    "sales representative",
    "home owner",
  ],
};

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/client-home",
  "/client-login",
  "/client-signup",
];

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get the pathname
  const pathname = req.nextUrl.pathname;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return res;
  }

  // Refresh session to ensure we have the latest state
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Redirect to login if not authenticated or session error
  if (!session || error) {
    // Redirect to homepage for dashboard, login for other routes
    if (pathname === "/dashboard") {
      console.log("🔒 No session found on dashboard, redirecting to homepage");
      return NextResponse.redirect(new URL("/", req.url));
    }

    console.log("🔒 No session found, redirecting to login");
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Get user role from user metadata
  const userRole = session.user?.user_metadata?.role?.toLowerCase();

  console.log("🔐 Middleware check:", {
    pathname,
    userRole,
    userId: session.user.id,
  });

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      const normalizedRoles = allowedRoles.map((r) => r.toLowerCase());

      if (!userRole || !normalizedRoles.includes(userRole)) {
        console.log("❌ Access denied:", { route, userRole, allowedRoles });

        // Redirect to dashboard with error message
        const redirectUrl = new URL("/dashboard", req.url);
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }

      console.log("✅ Access granted:", { route, userRole });
      break;
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
