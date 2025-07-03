// src/middleware.ts

// This is the simplest and most standard way to apply NextAuth.js middleware.
// It directly imports the main `auth` function from your `auth.ts` file
// and exports it as `middleware`, which Next.js is designed to detect.
export { auth as middleware } from "@/auth";

// Your config object remains the same. It tells the middleware which
// paths to run on.
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};