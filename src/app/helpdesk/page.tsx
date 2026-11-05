import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { canAccessHelpdesk } from '@/lib/helpdesk';
import { AppShell } from '@/components/helpdesk/AppShell';
import { HelpdeskView } from '@/components/helpdesk/HelpdeskView';

// Server-side gate (TD only). The API enforces the same rule; this just keeps non-TD out of the UI.
async function Guard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!canAccessHelpdesk(user)) redirect('/pengajuan');
  return (
    <AppShell>
      <HelpdeskView />
    </AppShell>
  );
}

export default function HelpdeskPage() {
  // cacheComponents: cookies() must be read inside a Suspense boundary
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-[#64748b]">Memuat…</div>}>
      <Guard />
    </Suspense>
  );
}
