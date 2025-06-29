"use client"

import { useState } from "react"
import { signIn } from "next-auth/webauthn"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function SignupPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handlePasskeySignup = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn("passkey", {
                action: "register",
                email,
                redirect: false,
            })

            if (result?.ok) {
                alert("Registration successful! You can now log in.")
                router.push("/login")
            } else if (result?.error) {
                // Handle specific errors from Auth.js if provided
                if (result.error.includes("already registered")) {
                    setError("This passkey is already registered. Please try logging in.");
                } else {
                    setError(`Registration failed: ${result.error}`);
                }
            } else {
                setError("An unknown error occurred during registration.")
            }
        } catch (err) {
            console.error("Signup Page Error:", err)
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setError("Registration cancelled or not permitted by the browser.");
            } else {
                setError("An unexpected error occurred. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Sign up with your email to create a passkey.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasskeySignup} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={!email || isLoading}>
                            {isLoading ? "Processing..." : "Sign Up with Passkey"}
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{" "}
                            <Link href="/login" className="underline">
                                Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}