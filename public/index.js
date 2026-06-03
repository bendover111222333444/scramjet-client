"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

let transport;
let wispIndex = 0;

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

    let wisp = wispUrls[Math.floor(Math.random() * wispUrls.length)];

    const { default: LibcurlClient } = await import("/libcurl/index.mjs");

    transport = new LibcurlClient({ wisp });

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

    controller.onError = async (err) => {
    if (
        String(err).includes("error code 35") ||
        String(err).includes("error code 7")
    ) {
        wispIndex++;
        wisp = wispUrls[wispIndex % wispUrls.length];

        transport = new LibcurlClient({ wisp });

        controller.transport = transport;
    }
    };

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