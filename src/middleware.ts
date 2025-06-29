// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'

export async function middleware(request: NextRequest) {
    const session = await auth()
    const { pathname } = request.nextUrl

    const isLoggedIn = !!session?.user
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/verify-request')
    const isApiRoute = pathname.startsWith('/api')

    // Prevent infinite loops and allow API routes
    if (isApiRoute || pathname === '/favicon.ico') {
        return NextResponse.next()
    }

    if (isAuthPage) {
        if (isLoggedIn) {
            // If the user is logged in, redirect them away from auth pages to the home page
            return NextResponse.redirect(new URL('/', request.url))
        }
        // If they are not logged in but on an auth page, let them stay
        return NextResponse.next()
    }

    if (!isLoggedIn) {
        // If they are not logged in and not on an auth page, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If the user is logged in and not on an auth page, let them proceed
    return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}