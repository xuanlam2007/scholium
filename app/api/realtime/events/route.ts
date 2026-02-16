import { NextRequest } from 'next/server'
import { eventEmitter } from '../broadcast/route'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  const scholiumId = request.nextUrl.searchParams.get('scholiumId')
  
  if (!scholiumId) {
    return new Response('Missing scholiumId', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', scholiumId })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Listen
      const handleEvent = (event: Event) => {
        const customEvent = event as CustomEvent
        const { scholiumId: eventScholiumId, eventType } = customEvent.detail

        // Only send events for current scholium
        if (eventScholiumId.toString() === scholiumId) {

          const message = `data: ${JSON.stringify({ 

            type: eventType,
            scholiumId: eventScholiumId,

            timestamp: Date.now()

          })}\n\n`
          
          try {
            controller.enqueue(encoder.encode(message))
          } catch {
            // Connection closed
          }
        }
      }

      eventEmitter.addEventListener('change', handleEvent)

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(pingInterval)
        }
      }, 30000)

      // Cleanup
      request.signal.addEventListener('abort', () => {
        eventEmitter.removeEventListener('change', handleEvent)
        clearInterval(pingInterval)
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
