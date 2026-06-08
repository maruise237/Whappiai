import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/api/public(.*)",
  "/webhooks(.*)",
  "/about(.*)",
  "/blog(.*)",
  "/legal(.*)",
  "/contact(.*)",
  "/community(.*)",
  "/guides(.*)",
  "/resources(.*)",
  "/changelog(.*)",
  "/roadmap(.*)",
  "/integrations(.*)",
  "/enterprise(.*)",
  "/careers(.*)",
  "/features(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/api/health(.*)"
]);

const isAuthRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthRoute(request) && userId) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  }

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  const response = NextResponse.next();

  // Add anti-cache headers to all responses to ensure fresh content
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
