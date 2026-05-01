import { getComplaints } from '@/lib/actions/complaints';
import { ComplaintsClient } from './complaints-client';

export default async function ComplaintsPage() {
  const complaints = await getComplaints();

  return <ComplaintsClient initialComplaints={complaints} />;
}
