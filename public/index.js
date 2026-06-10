"use strict";
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");

const configPromise = fetch("/proxyProxyServer.json").then(r => r.json());

async function createTransport(proxyUrl, pool) {
    const { default: EpoxyClient } = await import("/epoxy/index.mjs");
    const transport = new EpoxyClient({ wisp: `${proxyUrl}?pool=${pool}` });
    await transport.init();
    return transport;
}

function getCachedTransportType(hostname) {
    try {
        const cache = JSON.parse(localStorage.getItem('wisp-cache') || '{}');
        return cache[hostname] || null;
    } catch { return null; }
}

function setCachedTransportType(hostname, type) {
    try {
        const cache = JSON.parse(localStorage.getItem('wisp-cache') || '{}');
        cache[hostname] = type;
        localStorage.setItem('wisp-cache', JSON.stringify(cache));
    } catch {}
}

async function getBestTransport(hostname, proxyUrl) {
    const { default: EpoxyClient } = await import("/epoxy/index.mjs");

    const cached = getCachedTransportType(hostname);

    if (cached === 'cf') {
        const transport = new EpoxyClient({ wisp: `${proxyUrl}?pool=cf` });
        await transport.init();
        return transport;
    }

    if (cached === 'public') {
        const transport = new EpoxyClient({ wisp: `${proxyUrl}?pool=public` });
        await transport.init();
        return transport;
    }

    const cfTransport = new EpoxyClient({ wisp: `${proxyUrl}?pool=cf` });
    await cfTransport.init();
    try {
        await cfTransport.request(new URL(`https://${hostname}/`), "HEAD", null, [], undefined);
        setCachedTransportType(hostname, 'cf');
        return cfTransport;
    } catch {}

    const pubTransport = new EpoxyClient({ wisp: `${proxyUrl}?pool=public` });
    await pubTransport.init();
    try {
        await pubTransport.request(new URL(`https://${hostname}/`), "HEAD", null, [], undefined);
        setCachedTransportType(hostname, 'public');
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

    const { proxyUrl } = await configPromise;
    const transport = await createTransport(proxyUrl, 'cf');

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

    const transport = await getBestTransport(hostname, config.proxyUrl);
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