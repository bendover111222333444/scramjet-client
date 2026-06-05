"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const configPromise = fetch("/wispServer.json").then(r => r.json());

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        location.reload();
        return null;
    }

    const config = await configPromise;
    const wispUrls = config.wispUrls;
    const wisp = wispUrls[Math.floor(Math.random() * wispUrls.length)];

    const { EpoxyClient } = await import("/epoxy/index.mjs");
    const transport = new EpoxyClient({ wisp });

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
    return controller;
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const [config, controller] = await Promise.all([configPromise, controllerPromise]);
    if (!controller) return;

    const url = search(address.value, searchEngine.value);
    const frame = controller.createFrame();
    frame.element.id = "sj-frame";
    document.body.appendChild(frame.element);
    frame.go(url);
});