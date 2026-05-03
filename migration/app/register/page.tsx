import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "@/app/register/register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/plans");
  }

  return <RegisterForm />;
}
