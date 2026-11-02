import { currentUser } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function CollectionPage() {
  return <Dashboard initialUser={await currentUser()} view="collection" />;
}
