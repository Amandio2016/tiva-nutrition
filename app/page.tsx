import { redirect } from "next/navigation";

// Root redirects to dashboard; middleware handles auth and will send to /login if needed
export default function RootPage() {
  redirect("/dashboard");
}
