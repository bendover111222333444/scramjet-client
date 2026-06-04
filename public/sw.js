importScripts("/controller.sw.js");

// Diagnostic snapshot - call this from DevTools console:
// navigator.serviceWorker.controller.postMessage({ type: 'debug' })
self.addEventListener("message", e => {
    if (e.data?.type === "debug") {
        e.source.postMessage({
            type: "debug-response",
            inFlight: inFlightRequests.size,
            requests: [...inFlightRequests.entries()].map(([id, r]) => ({
                id,
                url: r.url,
                age: Date.now() - r.startTime,
            }))
        });
    }
});

const inFlightRequests = new Map();
let reqId = 0;

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    const id = reqId++;
    const url = e.request.url;
    inFlightRequests.set(id, { url, startTime: Date.now() });

    e.respondWith(
        $scramjetController.route(e).finally(() => {
            inFlightRequests.delete(id);
        })
    );
});