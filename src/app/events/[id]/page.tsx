import { notFound } from "next/navigation";
import { getEventBundle } from "@/lib/sheets";
import EventWorkspace from "@/components/events/EventWorkspace";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getEventBundle(id);
  if (!bundle.event) notFound();

  return (
    <EventWorkspace
      eventId={id}
      initialBundle={{
        event: bundle.event,
        venues: bundle.venues,
        accommodations: bundle.accommodations,
        gyms: bundle.gyms,
        outreachLog: bundle.outreachLog,
      }}
    />
  );
}
