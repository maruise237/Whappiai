import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/", "/test-ui",
  "/login(.*)",
  "/register(.*)",
  "/api/public(.*)",
  "/webhooks(.*)",
  "/docs(.*)",
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
  "/privacy(.*)"
]);

const isAuthRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
]);

const isLandingRoute = createRouteMatcher([
  "/"
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthRoute(request) && userId) {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('intent') === 'signup' || searchParams.get('conversion') === 'true') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
