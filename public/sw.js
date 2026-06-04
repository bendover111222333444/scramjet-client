importScripts("/controller.sw.js");

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    let request = e.request;

    try {
        const url = new URL(e.request.url);
        if (url.hostname.includes("googlevideo.com")) {
            url.searchParams.set("c", "MWEB");
            url.searchParams.delete("sabr");
            url.searchParams.delete("rqh");
            request = new Request(url.toString(), {
                method: e.request.method,
                headers: e.request.headers,
                body: e.request.method !== "GET" && e.request.method !== "HEAD"
                    ? e.request.body
                    : undefined,
                mode: e.request.mode,
                credentials: e.request.credentials,
                redirect: e.request.redirect,
            });
        }
    } catch (err) {
        console.error("[sw] Failed to rewrite googlevideo request:", err);
    }

    e.respondWith($scramjetController.route({ ...e, request }));
});