importScripts("/controller.sw.js");

const YOUTUBE_HOSTS = ["youtube.com", "ytimg.com", "ggpht.com", "googleusercontent.com"];
const VIDEO_CDN_HOSTS = ["googlevideo.com"];

const MAX_VIDEO_CONCURRENT = 4; // cap video streams low
let videoInFlight = 0;
const videoQueue = [];

function acquireVideoSlot() {
    if (videoInFlight < MAX_VIDEO_CONCURRENT) {
        videoInFlight++;
        return Promise.resolve();
    }
    return new Promise(resolve => videoQueue.push({ resolve }));
}

function releaseVideoSlot() {
    videoInFlight--;
    if (videoQueue.length > 0) {
        const { resolve } = videoQueue.shift();
        videoInFlight++;
        resolve();
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
        const isVideo = VIDEO_CDN_HOSTS.some(h => url.hostname.includes(h));
        const needsRewrite = isVideo || YOUTUBE_HOSTS.some(h => url.hostname.includes(h));

        const rewritten = needsRewrite ? rewriteRequest(e.request, url) : e.request;
        const routeTarget = rewritten !== e.request
            ? Object.defineProperty(e, "request", { value: rewritten })
            : e;

        if (isVideo) {
            // Throttle video chunks so API calls always get through
            e.respondWith(
                acquireVideoSlot().then(() =>
                    $scramjetController.route(routeTarget).finally(releaseVideoSlot)
                )
            );
        } else {
            // API calls, UI requests — always go through immediately
            e.respondWith($scramjetController.route(routeTarget));
        }
        return;

    } catch (err) {
        console.error("[sw] Request rewrite failed:", err);
    }

    e.respondWith($scramjetController.route(e));
});