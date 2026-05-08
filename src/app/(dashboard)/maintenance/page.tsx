import { getMaintenanceSchedule } from '@/lib/actions/maintenance';
import { MaintenanceClient } from './maintenance-client';

export default async function MaintenancePage() {
  const schedule = await getMaintenanceSchedule();
  return <MaintenanceClient initialSchedule={schedule as any} />;
}
