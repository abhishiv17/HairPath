import BarberView from "@/components/share/BarberView";

export const metadata = { title: "A client's plan · HairPath" };

// The barber link: opened by the client's barber or stylist, with no account.
export default async function BarberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BarberView id={id} />;
}
