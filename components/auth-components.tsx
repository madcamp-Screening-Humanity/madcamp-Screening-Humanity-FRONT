
import { signIn, signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn("google")
            }}
        >
            <Button type="submit" variant="outline">Sign in with Google</Button>
        </form>
    )
}

export function SignOut() {
    return (
        <form
            action={async () => {
                "use server"
                await signOut()
            }}
        >
            <Button type="submit" variant="ghost">Sign Out</Button>
        </form>
    )
}
