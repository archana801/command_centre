import { notFound } from "next/navigation";
import { getTripEventBundle } from "@/lib/sheets";
import TripEventWorkspace from "@/components/trips/TripEventWorkspace";

export const dynamic = "force-dynamic";

export default async function TripEventDetailPage({
  params,
}: {
  params: Promise<{ id: string; tripEventId: string }>;
}) {
  const { id, tripEventId } = await params;
  const bundle = await getTripEventBundle(tripEventId);
  if (!bundle.tripEvent) notFound();

  return (
    <TripEventWorkspace
      tripId={id}
      tripEventId={tripEventId}
      initialBundle={{ tripEvent: bundle.tripEvent, venues: bundle.venues }}
    />
  );
}
