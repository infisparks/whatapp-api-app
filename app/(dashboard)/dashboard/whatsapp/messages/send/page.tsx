import { redirect } from 'next/navigation';

export default function WhatsAppMessagesSendPage({
  searchParams,
}: {
  searchParams: { template?: string; recipient?: string };
}) {
  const query = new URLSearchParams(searchParams).toString();
  redirect(`/dashboard/messages/send${query ? `?${query}` : ''}`);
}
