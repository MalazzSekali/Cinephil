import { currentUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function DiscoverPage() {
  return <Dashboard initialUser={await currentUser()} view="discover" />;
}
