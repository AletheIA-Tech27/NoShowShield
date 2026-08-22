import DashboardClientView from './DashboardClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  // Get clinic ID from session or default
  const clinicId = process.env.NEXT_PUBLIC_DEFAULT_CLINIC_ID || 'default-clinic';

  return (
    <DashboardClientView clinicId={clinicId} />
  );
}