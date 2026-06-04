importScripts("/controller.sw.js");

const TELEMETRY_PATHS = [
    "/api/stats/qoe",
    "/api/stats/watchtime", 
    "/api/stats/playback",
    "/api/stats/ads",
    "/api/timedtext",
    "/ptracking",
    "/pagead/",
    "/log_event",
    "/generate_204",
];

function isTelemetry(url) {
    return TELEMETRY_PATHS.some(p => url.pathname.includes(p)) ||
           url.searchParams.get("alt") === "json" && url.pathname.includes("log_event");
}

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    try {
        const url = new URL(e.request.url);

        if (isTelemetry(url)) {
            // Kill telemetry immediately - don't let it reach scramjet
            e.respondWith(new Response(null, { status: 204 }));
            return;
        }
    } catch (err) {
        console.error("[sw] telemetry check failed:", err);
    }

    e.respondWith($scramjetController.route(e));
});