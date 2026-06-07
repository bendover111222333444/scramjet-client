"use strict";
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");

const configPromise = fetch("/wispServer.json").then(r => r.json());

async function createTransport(wispUrl) {
    const { default: EpoxyClient } = await import("/epoxy/index.mjs");
    const transport = new EpoxyClient({ wisp: wispUrl });
    await transport.init();
    return transport;
}

async function getBestTransport(hostname, cfWispUrls, publicWispUrls) {
    const { default: EpoxyClient } = await import("/epoxy/index.mjs");

    const cfWisp = cfWispUrls[Math.floor(Math.random() * cfWispUrls.length)];
    const cfTransport = new EpoxyClient({ wisp: cfWisp });
    await cfTransport.init();
    try {
        await cfTransport.request(new URL(`https://${hostname}/`), "HEAD", null, [], undefined);
        return cfTransport;
    } catch {}

    const pubWisp = publicWispUrls[Math.floor(Math.random() * publicWispUrls.length)];
    const pubTransport = new EpoxyClient({ wisp: pubWisp });
    await pubTransport.init();
    try {
        await pubTransport.request(new URL(`https://${hostname}/`), "HEAD", null, [], undefined);
        return pubTransport;
    } catch {}

    return null;
}

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        location.reload();
        return null;
    }

    const { cfWispUrls } = await configPromise;
    const initialWisp = cfWispUrls[Math.floor(Math.random() * cfWispUrls.length)];
    const transport = await createTransport(initialWisp);

    const controller = new $scramjetController.Controller({
        serviceworker: (await navigator.serviceWorker.ready).active,
        transport,
        config: {
            prefix: "/scramjet/",
            scramjetPath: "/scram/scramjet.js",
            wasmPath: "/scram/scramjet.wasm",
            injectPath: "/controller/controller.inject.js",
            virtualWasmPath: "scramjet.wasm.js",
        },
    });

    await controller.wait();

    window.withTransport = async (fn) => await fn();
    return controller;
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const [config, controller] = await Promise.all([
        configPromise,
        controllerPromise,
    ]);

    if (!controller) return;

    const url = search(address.value, searchEngine.value);
    let hostname;
    try {
        hostname = new URL(url).hostname;
    } catch {
        document.getElementById("sj-error").textContent = "Invalid URL.";
        return;
    }

    const errorEl = document.getElementById("sj-error");
    errorEl.textContent = "Connecting...";

    const transport = await getBestTransport(hostname, config.cfWispUrls, config.publicWispUrls);
    if (!transport) {
        errorEl.textContent = "Could not connect to " + hostname + " via any server.";
        return;
    }

    errorEl.textContent = "";
    controller.setTransport(transport);

    document.getElementById("sj-frame")?.remove();
    const frame = controller.createFrame();
    frame.element.id = "sj-frame";
    document.body.appendChild(frame.element);
    frame.go(url);
});