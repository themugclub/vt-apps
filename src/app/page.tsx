// src/app/page.tsx
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserButton from "@/components/ui/user-button";

export const runtime = 'nodejs';

export default async function Home() {
    const session = await auth()
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Welcome back, {session?.user?.email ?? 'User'}!</h1>
            <UserButton />
            {JSON.stringify(session, null, 2)}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Your dashboard will show upcoming events here.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Note</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Your dashboard will show your most recent note here.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Expenditure</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Your dashboard will show an expense graph here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
