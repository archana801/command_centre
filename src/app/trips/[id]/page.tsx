import { notFound } from "next/navigation";
import { getTripBundle } from "@/lib/sheets";
import TripWorkspace from "@/components/trips/TripWorkspace";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getTripBundle(id);
  if (!bundle.trip) notFound();

  return (
    <TripWorkspace
      tripId={id}
      initialBundle={{
        trip: bundle.trip,
        events: bundle.events,
        accommodations: bundle.accommodations,
        gyms: bundle.gyms,
        photoshoots: bundle.photoshoots,
        outreachLog: bundle.outreachLog,
      }}
    />
  );
}
