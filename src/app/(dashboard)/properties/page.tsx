import { getProperties } from '@/lib/actions/properties';
import { PropertiesClient } from './properties-client';

export default async function PropertiesPage() {
  const properties = await getProperties();

  return <PropertiesClient initialProperties={properties} />;
}
