import { getProperty, getOwners } from '@/lib/actions/properties';
import { PropertyForm } from '@/components/properties/property-form';
import { notFound } from 'next/navigation';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let property;
  try {
    property = await getProperty(id);
  } catch {
    notFound();
  }

  if (!property) notFound();

  const owners = await getOwners();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Property</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update property details
        </p>
      </div>

      <PropertyForm owners={owners} property={property} />
    </div>
  );
}
