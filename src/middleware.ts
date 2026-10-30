import { NextResponse, type NextRequest } from "next/server";
import { ALWAYS_ALLOWED_PATHS, MODULE_SLUGS, isModuleEnabled } from "@/lib/module-flags";

// AUTH TEMPORARIAMENTE DESATIVADA — reativar após resolver login no Supabase
export async function middleware(request: NextRequest) {
  // Módulos ainda não liberados: volta ao plantão.
  const path = request.nextUrl.pathname;
  const slug = path.split("/")[1] ?? "";
  const isModule = MODULE_SLUGS.includes(slug);
  if (isModule && !isModuleEnabled(slug) && !ALWAYS_ALLOWED_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - files with an extension (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
