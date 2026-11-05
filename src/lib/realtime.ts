'use client';

// One shared EventSource per tab. Browsers cap ~6 HTTP/1.1 connections per origin,
// so every component subscribing separately would starve normal fetches.
let source: EventSource | null = null;
let refs = 0;

export function subscribeRealtime(handlers: Record<string, (data: any) => void>): () => void {
  if (!source) source = new EventSource('/api/messages/sse');
  refs++;

  const wrapped = Object.entries(handlers).map(([event, fn]) => {
    const listener = (e: MessageEvent) => {
      try {
        fn(JSON.parse(e.data));
      } catch (err) {
        console.error(`SSE "${event}" handler error:`, err);
      }
    };
    source!.addEventListener(event, listener as EventListener);
    return [event, listener] as const;
  });

  return () => {
    wrapped.forEach(([event, listener]) => source?.removeEventListener(event, listener as EventListener));
    if (--refs === 0) {
      source?.close();
      source = null;
    }
  };
}
