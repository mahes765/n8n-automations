import { json } from "@/lib/http";
import { listMedsosPackages } from "@/lib/medsos/packages";

export async function GET() {
  const packages = await listMedsosPackages();

  return json({ packages });
}
