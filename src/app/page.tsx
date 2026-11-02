import { currentUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
export default async function Home(){return <Dashboard initialUser={await currentUser()}/>}
