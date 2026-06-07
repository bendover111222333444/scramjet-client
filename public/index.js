"use strict";
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");

const configPromise = fetch("/wispServer.json").then(r => r.json());

async function testWisp(wisp){
    try{
        const { default: EpoxyClient } = await import("/epoxy/index.mjs");
        const transport = new EpoxyClient({ wisp });
        await transport.init();
        return wisp;
    }catch(err){
        console.warn("[WISP FAILED]", wisp, err);
        return null;
    }
}

async function createTransport(wispUrls){
    const results = await Promise.all(
        wispUrls.map(wisp => testWisp(wisp))
    );

    const working = results.filter(Boolean);

    if(!working.length){
        throw new Error("No working wisp servers found");
    }

    const wisp = working[Math.floor(Math.random() * working.length)];

    const { default: EpoxyClient } = await import("/epoxy/index.mjs");
    const transport = new EpoxyClient({ wisp });

    await transport.init();

    return transport;
}

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        location.reload();
        return null;
    }

    const { wispUrls } = await configPromise;
    const transport = await createTransport(wispUrls);

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

    const [, controller] = await Promise.all([
        configPromise,
        controllerPromise,
    ]);

    if (!controller) return;

    const url = search(address.value, searchEngine.value);
    document.getElementById("sj-frame")?.remove();
    const frame = controller.createFrame();
    frame.element.id = "sj-frame";
    document.body.appendChild(frame.element);
    await window.withTransport(() => frame.go(url));
});