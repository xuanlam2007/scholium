import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCurrentScholiumId } from '@/app/actions/scholium'
import { SettingsClient } from '@/components/settings/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getSession()
  
  if (!user) {
    redirect('/login')
  }

  if (user.role === 'admin') {
    redirect('/admin')
  }

  const scholiumId = await getCurrentScholiumId()
  
  if (!scholiumId) {
    redirect('/join')
  }

  return <SettingsClient user={user} scholiumId={scholiumId} />
}
