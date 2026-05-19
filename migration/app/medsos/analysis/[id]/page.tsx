import { redirect } from "next/navigation";
import ProgressPoller from "@/components/medsos/progress-poller";
import { getCurrentUser } from "@/lib/auth";
import { getMedsosRequestEvents, getOwnedMedsosRequest } from "@/lib/medsos/requests";

export default async function MedsosAnalysisProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    redirect("/medsos/history");
  }

  const analysis = await getOwnedMedsosRequest(user.id, requestId);

  if (!analysis) {
    redirect("/medsos/history");
  }

  const events = await getMedsosRequestEvents(analysis.id);

  return (
    <div className="stack page-gap">
      <ProgressPoller requestId={analysis.id} initialAnalysis={analysis} initialEvents={events as never} />
    </div>
  );
}
