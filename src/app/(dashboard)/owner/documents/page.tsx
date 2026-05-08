import { getOwnerDocuments } from '@/lib/actions/owner-operations';
import { DocumentsClient } from './documents-client';

export default async function OwnerDocumentsPage() {
  const documents = await getOwnerDocuments();
  return <DocumentsClient initialDocuments={documents as any} />;
}
