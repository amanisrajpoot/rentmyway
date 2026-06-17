import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PgRoomClient } from './pg-room-client';
import { PageLayout, PageHeader } from '@/components/layout/page-layout';
import { Building2 } from 'lucide-react';

export default async function TenantPgRoomPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'tenant') redirect('/dashboard');

  const supabase = await createClient();

  // Find active tenant record
  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      *, 
      property:properties(id, title, address, locality, city, state, pincode, pg_brand_name, pg_tagline, pg_logo_url, broker_id)
    `)
    .eq('email', profile.email)
    .eq('is_active', true)
    .single();

  if (!tenant || !tenant.property || tenant.tenant_type !== 'pg') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Active PG Room Found</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn't find an active PG bed allocation linked to your email.
        </p>
      </div>
    );
  }

  // Fetch bed and room details
  let bedInfo = null;
  let roomInfo = null;
  let roommates: any[] = [];
  let broker = null;
  let emergencyContacts: any[] = [];

  if (tenant.pg_bed_id) {
    const { data: bed } = await supabase
      .from('pg_beds')
      .select('*, room:pg_rooms(*)')
      .eq('id', tenant.pg_bed_id)
      .single();

    if (bed) {
      bedInfo = bed;
      roomInfo = Array.isArray(bed.room) ? bed.room[0] : bed.room;

      // Fetch roommates
      const { data: otherBeds } = await supabase
        .from('pg_beds')
        .select('bed_number, tenant:tenants(name, phone, is_active)')
        .eq('room_id', roomInfo.id)
        .neq('id', bed.id)
        .eq('status', 'occupied');

      if (otherBeds) {
        roommates = otherBeds
          .filter((b: any) => b.tenant && b.tenant.is_active)
          .map((b: any) => ({
            bed_number: b.bed_number,
            name: Array.isArray(b.tenant) ? b.tenant[0].name : b.tenant.name,
            phone: Array.isArray(b.tenant) ? b.tenant[0].phone : b.tenant.phone,
          }));
      }
    }
  }

  // Fetch broker info
  if (tenant.property.broker_id) {
    const { data: brokerProfile } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', tenant.property.broker_id)
      .single();
    broker = brokerProfile;
  }

  // Fetch emergency contacts
  const { data: contacts } = await supabase
    .from('pg_teams')
    .select('name, role, phone')
    .eq('property_id', tenant.property.id)
    .eq('is_active', true)
    .limit(3);
  
  if (contacts) emergencyContacts = contacts;

  return (
    <PageLayout>
      <PageHeader 
        title="My Room" 
        description="View your room details, roommates, and PG information." 
      />
      <PgRoomClient 
        tenant={tenant}
        property={tenant.property}
        bedInfo={bedInfo}
        roomInfo={roomInfo}
        roommates={roommates}
        broker={broker}
        emergencyContacts={emergencyContacts}
      />
    </PageLayout>
  );
}
