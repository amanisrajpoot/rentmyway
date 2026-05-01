import { getOwners } from '@/lib/actions/properties';
import { PropertyForm } from '@/components/properties/property-form';

export default async function NewPropertyPage() {
  const owners = await getOwners();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Property</h1>
        <p className="text-muted-foreground text-sm mt-1">
          List a new property for rental
        </p>
      </div>

      <PropertyForm owners={owners} />
    </div>
  );
}
