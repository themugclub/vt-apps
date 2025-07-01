"use client"

import {SessionProvider} from "next-auth/react"

export default function AuthProvider({
                                         children,
                                     }: {
    children: React.ReactNode
}) {
    return <SessionProvider basePath="/auth">{children}</SessionProvider>
}