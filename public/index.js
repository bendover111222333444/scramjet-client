"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const configPromise = fetch("/wispServer.json").then(r => r.json());

async function createTransport(wispUrls) {
    const wisp = wispUrls[Math.floor(Math.random() * wispUrls.length)];
    const { default: EpoxyClient } = await import("/epoxy/index.mjs");
    const t = new EpoxyClient({ wisp });
    await t.init();
    return t;
}

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        location.reload();
        return null;
    }

    const config = await configPromise;
    const wispUrls = config.wispUrls;

    let transport = await createTransport(wispUrls);

    const controller = new $scramjetController.Controller({
        serviceworker: (await navigator.serviceWorker.ready).active,
        transport,
        config: {
            prefix: "/scramjet/",
            scramjetPath: "/scram/",
            wasmPath: "/scram/scramjet.wasm",
            injectPath: "/controller/controller.inject.js",
            virtualWasmPath: "/scram/scramjet.wasm",
        },
    });

    await controller.wait();

    // Auto-reconnect when epoxy dies
    navigator.serviceWorker.addEventListener("message", async e => {
        if (e.data?.type === "epoxy-dead") {
            console.log("[epoxy] transport died, reconnecting...");
            try {
                transport = await createTransport(wispUrls);
                await controller.setTransport(transport);
                console.log("[epoxy] transport replaced");
            } catch (err) {
                console.error("[epoxy] reconnect failed:", err);
            }
        }
    });

    return controller;
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const [config, controller] = await Promise.all([configPromise, controllerPromise]);
    if (!controller) return;

    const url = search(address.value, searchEngine.value);

    const existing = document.getElementById("sj-frame");
    if (existing) existing.remove();

    const frame = controller.createFrame();
    frame.element.id = "sj-frame";
    document.body.appendChild(frame.element);
    frame.go(url);
});