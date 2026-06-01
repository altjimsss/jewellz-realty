import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/admin") || pathname.startsWith("/agent") || pathname.startsWith("/developer");
  if (!isDashboardRoute) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role;

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(role === "agent" ? "/agent" : role === "developer_partner" ? "/developer" : "/login", request.url));
  }

  if (pathname.startsWith("/agent") && role !== "agent" && role !== "admin") {
    return NextResponse.redirect(new URL(role === "developer_partner" ? "/developer" : "/login", request.url));
  }

  if (pathname.startsWith("/developer") && role !== "developer_partner" && role !== "admin") {
    return NextResponse.redirect(new URL(role === "agent" ? "/agent" : "/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/developer/:path*"]
};
