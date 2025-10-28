"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, usePathname } from "next/navigation";

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // If no session, redirect based on current route
        if (!session || error) {
          if (pathname === '/dashboard') {
            console.log("❌ No session found on dashboard, redirecting to homepage");
            router.replace("/");
          } else {
            console.log("❌ No session found, redirecting to login");
            router.replace("/login");
          }
          return;
        }

        // Get user role
        const userRole = session.user?.user_metadata?.role?.toLowerCase();
        console.log("🔐 Protected route check:", { userRole, requiredRoles });

        // Check if user has required role
        if (requiredRoles.length > 0) {
          const normalizedRoles = requiredRoles.map((r) => r.toLowerCase());
          if (!userRole || !normalizedRoles.includes(userRole)) {
            console.log("❌ Access denied - insufficient permissions");
            router.replace("/dashboard");
            return;
          }
        }

        // User is authorized
        console.log("✅ Access granted");
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        if (pathname === '/dashboard') {
          router.replace("/");
        } else {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (pathname === '/dashboard') {
          console.log("🔓 User signed out from dashboard, redirecting to homepage");
          router.replace("/");
        } else {
          console.log("🔓 User signed out, redirecting to login");
          router.replace("/login");
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, supabase, requiredRoles, pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  return isAuthorized ? children : null;
}
