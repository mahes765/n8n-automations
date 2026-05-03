import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/app/login/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/plans");
  }

  return <LoginForm />;
}
