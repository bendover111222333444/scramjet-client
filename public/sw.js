importScripts("/scram/scramjet.js");
importScripts("/controller/controller.sw.js");

const YOUTUBE_HOSTS = ["youtube.com", "ytimg.com", "ggpht.com", "googleusercontent.com"];
const VIDEO_CDN_HOSTS = ["googlevideo.com"];

const inFlightRequests = new Map();
let reqId = 0;

self.addEventListener("message", async e => {
    if (e.data?.type === "debug") {
        const list = [...inFlightRequests.entries()].map(([id, r]) => ({
            id,
            url: r.url,
            age: Date.now() - r.startTime,
        }));
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({
            type: "debug-response",
            inFlight: inFlightRequests.size,
            requests: list,
        }));
    }
});

function isTelemetry(request) {
    if (request.keepalive) return true;
    try {
        const parts = new URL(request.url).pathname.split('/');
        const inner = new URL(decodeURIComponent(parts.slice(3).join('/').split('?')[0]));
        return inner.pathname.startsWith('/api/stats') ||
               inner.pathname.startsWith('/api/timedtext') ||
               inner.pathname.startsWith('/ptracking') ||
               inner.pathname.startsWith('/pagead') ||
               inner.pathname.includes('/generate_204') ||
               inner.pathname.includes('/log_event') ||
               inner.pathname.includes('viewthroughconversion');
    } catch(e) { return false; }
}

function rewriteRequest(request, url) {
    const headers = new Headers(request.headers);
    headers.set("Origin", "https://www.youtube.com");
    headers.set("Referer", "https://www.youtube.com/");

    if (VIDEO_CDN_HOSTS.some(h => url.hostname.includes(h))) {
        url.searchParams.set("c", "MWEB");
        url.searchParams.delete("sabr");
        url.searchParams.delete("rqh");
    }

    return new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.method !== "GET" && request.method !== "HEAD"
            ? { body: request.body, duplex: "half" }
            : {}),
        mode: "cors",
        credentials: request.credentials,
        redirect: request.redirect,
    });
}

async function notifyEpoxyDead() {
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.postMessage({ type: "epoxy-dead" }));
}

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    if (isTelemetry(e.request)) {
        e.respondWith(new Response(null, { status: 204 }));
        return;
    }

    try {
        const url = new URL(e.request.url);

        const needsRewrite = VIDEO_CDN_HOSTS.some(h => url.hostname.includes(h)) ||
                             YOUTUBE_HOSTS.some(h => url.hostname.includes(h));

        const rewritten = needsRewrite ? rewriteRequest(e.request, url) : e.request;
        const routeTarget = needsRewrite
            ? Object.defineProperty(e, "request", { value: rewritten })
            : e;

        const id = reqId++;
        inFlightRequests.set(id, { url: e.request.url, startTime: Date.now() });

        e.respondWith(
            $scramjetController.route(routeTarget)
                .catch(async err => {
                    if (err?.message?.includes("MuxTaskEnded") || err?.message?.includes("tls handshake eof")) {
                        await notifyEpoxyDead();
                    }
                    throw err;
                })
                .finally(() => {
                    inFlightRequests.delete(id);
                })
        );
        return;

    } catch (err) {
        console.error("[sw] fetch handler error:", err);
    }

    e.respondWith($scramjetController.route(e));
});