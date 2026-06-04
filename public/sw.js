importScripts("/controller.sw.js");

const TELEMETRY_PATHS = [
    "/api/stats/qoe",
    "/api/stats/watchtime",
    "/api/stats/playback",
    "/api/stats/ads",
    "/api/timedtext",
    "/viewthroughconversion",
    "/ptracking",
    "/pagead/",
    "/log_event",
    "/generate_204",
];

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

function isTelemetry(outerUrl) {
    try {
        const parts = outerUrl.pathname.split('/');
        // strip everything after the scramjet prefix (3 parts)
        const proxiedEncoded = parts.slice(3).join('/');
        // remove any trailing ?$mode etc added by scramjet
        const cleaned = proxiedEncoded.split('?')[0];
        const proxied = decodeURIComponent(cleaned);
        const innerUrl = new URL(proxied);
        return TELEMETRY_PATHS.some(p => innerUrl.pathname.includes(p));
    } catch(e) {
        return false;
    }
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

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    try {
        const url = new URL(e.request.url);

        if (isTelemetry(url)) {
            e.respondWith(new Response(null, { status: 204 }));
            return;
        }

        const needsRewrite = VIDEO_CDN_HOSTS.some(h => url.hostname.includes(h)) ||
                             YOUTUBE_HOSTS.some(h => url.hostname.includes(h));

        const rewritten = needsRewrite ? rewriteRequest(e.request, url) : e.request;
        const routeTarget = needsRewrite
            ? Object.defineProperty(e, "request", { value: rewritten })
            : e;

        const id = reqId++;
        inFlightRequests.set(id, { url: e.request.url, startTime: Date.now() });

        e.respondWith(
            $scramjetController.route(routeTarget).finally(() => {
                inFlightRequests.delete(id);
            })
        );
        return;

    } catch (err) {
        console.error("[sw] fetch handler error:", err);
    }

    e.respondWith($scramjetController.route(e));
});