importScripts("/controller.sw.js");

addEventListener("fetch", e => {
    if (!$scramjetController.shouldRoute(e)) return;

    try {
        const url = new URL(e.request.url);
        if (url.hostname.includes("googlevideo.com")) {
            url.searchParams.set("c", "MWEB");
            url.searchParams.delete("sabr");
            url.searchParams.delete("rqh");

            const rewritten = new Request(url.toString(), {
                method: e.request.method,
                headers: e.request.headers,
                // only pass body for methods that support it
                ...(e.request.method !== "GET" && e.request.method !== "HEAD"
                    ? { body: e.request.body, duplex: "half" }
                    : {}),
                mode: "cors",
                credentials: e.request.credentials,
                redirect: e.request.redirect,
            });

            e.respondWith($scramjetController.route(
                Object.defineProperty(e, "request", { value: rewritten })
            ));
            return;
        }
    } catch (err) {
        console.error("[sw] Failed to rewrite googlevideo request:", err);
    }

    e.respondWith($scramjetController.route(e));
});