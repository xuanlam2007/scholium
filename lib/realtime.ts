/**
 * Broadcast change event to all connected users via SSE
 */
export async function broadcastChange(
  scholiumId: number, 
  eventType: 'homework' | 'subject' | 'member' | 'permissions' | 'timeslots'
) {
  try {
    // Call the broadcast endpoint to notify all connected clients
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/realtime/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scholiumId, eventType }),
    }).catch(() => {
      // Ignore fetch errors
    })
  } catch {
    // Fail
  }
}
