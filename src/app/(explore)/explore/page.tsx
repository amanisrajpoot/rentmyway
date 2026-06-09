import { getPublicProperties, getMostPopularCity } from '@/lib/actions/enquiries';
import { ExploreClient } from './explore-client';

export const metadata = {
  title: 'Explore Properties in Mumbai | RentMyWay',
  description: 'Find your perfect rental home with our curated list of verified properties.',
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  
  // Default to the most popular city if no city is specified
  let city = typeof resolvedParams.city === 'string' ? resolvedParams.city : '';
  if (!city) {
    city = await getMostPopularCity();
  }
  
  const locality = typeof resolvedParams.locality === 'string' ? resolvedParams.locality : undefined;
  const type = typeof resolvedParams.type === 'string' ? resolvedParams.type : undefined;
  const furnishing = typeof resolvedParams.furnishing === 'string' ? resolvedParams.furnishing : undefined;
  const minRent = typeof resolvedParams.minRent === 'string' ? parseInt(resolvedParams.minRent, 10) : undefined;
  const maxRent = typeof resolvedParams.maxRent === 'string' ? parseInt(resolvedParams.maxRent, 10) : undefined;
  const parking = resolvedParams.parking === 'true';
  const petFriendly = resolvedParams.petFriendly === 'true';
  const bachelorAllowed = resolvedParams.bachelorAllowed === 'true';
  const nonVegAllowed = resolvedParams.nonVegAllowed === 'true';

  const filters = { city, locality, type, furnishing, minRent, maxRent, parking, petFriendly, bachelorAllowed, nonVegAllowed };
  
  const { data: initialProperties } = await getPublicProperties({ 
    ...filters, 
    pet_friendly: petFriendly,
    bachelor_allowed: bachelorAllowed,
    non_veg_allowed: nonVegAllowed,
    page: 0, 
    limit: 12 
  });

  return (
    <ExploreClient 
      initialProperties={initialProperties || []} 
      initialFilters={filters} 
    />
  );
}
