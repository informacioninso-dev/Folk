import { redirect } from "next/navigation";

export default function EventoPage({ params }: { params: { id: string } }) {
  redirect(`/eventos/${params.id}/participantes`);
}
