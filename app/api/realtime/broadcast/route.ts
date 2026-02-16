import { NextRequest, NextResponse } from 'next/server'
const eventEmitter = new EventTarget()

export async function POST(request: NextRequest) {
  try {
    const { scholiumId, eventType } = await request.json()

    if (!scholiumId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    eventEmitter.dispatchEvent(new CustomEvent('change', {
      detail: { scholiumId, eventType, timestamp: Date.now() }
    }))

    return NextResponse.json({ success: true })

    
  } catch (error) {

    return NextResponse.json({ error: 'Failed to broadcast' }, { status: 500 })
  }
}

// Export the emitter for use in SSE route
export { eventEmitter }
