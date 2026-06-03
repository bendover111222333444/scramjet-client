"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const configPromise = fetch("/wispServer.json").then(r => r.json());

let controller;

(async () => {
    const sw = await navigator.serviceWorker.register("/scram/controller.sw.js");
    await navigator.serviceWorker.ready;

    controller = new $scramjetController.Controller({
        serviceworker: (await navigator.serviceWorker.ready).active,
        transport: connection,
        config: {
            prefix: "/scramjet/",
            scramjetPath: "/scram/",
            wasmPath: "/scram/scramjet.wasm",
            injectPath: "/scram/controller.inject.js",
            virtualWasmPath: "/scram/scramjet.wasm",
        },
    });

    await controller.wait();
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const config = await configPromise;
    const wispUrls = config.wispUrls;

    try {
        await registerSW();
    } catch (err) {
        error.textContent = "Failed to register service worker.";
        errorCode.textContent = err.toString();
        throw err;
    }

    await navigator.serviceWorker.ready;

    await connection.setTransport("/libcurl/index.mjs", [
        { wisp: wispUrls[Math.floor(Math.random() * wispUrls.length)] },
    ]);

    const url = search(address.value, searchEngine.value);
    const frame = controller.createFrame();
    document.body.appendChild(frame.element);
    frame.go(url);
});