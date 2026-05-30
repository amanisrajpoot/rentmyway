import { getMaintenanceSchedule } from '@/lib/actions/maintenance';
import { MaintenanceClient } from './maintenance-client';

export default async function MaintenancePage() {
  const res = await getMaintenanceSchedule();
  const schedule = Array.isArray(res) ? res : ('data' in res && res.data ? res.data : []);
  return <MaintenanceClient initialSchedule={schedule as any} />;
}
