import { redirect } from 'next/navigation';

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/property/${resolvedParams.id}`);
}
