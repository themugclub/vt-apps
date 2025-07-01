import { auth } from "@/auth"
import UserButton from "@/components/ui/user-button";

export default async function Home() {
  const session = await auth()
  return (
      <div>
        <UserButton />
        {JSON.stringify(session, null, 2)}
      </div>
  );
}
