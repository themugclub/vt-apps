"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handlePasskeyLogin = async (event: React.FormEvent) => {
        event.preventDefault()
        setError(null)

        const result = await signIn("passkey", {
            action: "authenticate", // Specify the action as "authenticate"
            email,
            redirect: false,
        })

        if (result?.ok) {
            router.push("/") // Redirect to home page on successful login
        } else {
            setError("Login failed. Check your email or try signing up.")
        }
    }

    return (
        <div className="flex justify-center items-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your email to login with a passkey.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasskeyLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={!email}>
                            Login with Passkey
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Don't have an account?{" "}
                            <Link href="/signup" className="underline">
                                Sign up
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}