import { getOwnerDocuments } from '@/lib/actions/owner-operations';
import { DocumentsClient } from './documents-client';

export default async function OwnerDocumentsPage() {
  const documentsRes = await getOwnerDocuments();
  const documents = 'data' in documentsRes && documentsRes.data ? documentsRes.data : [];
  return <DocumentsClient initialDocuments={documents as any} />;
}
