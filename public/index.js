"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

let transport;
let controller;
let wispIndex = 0;
let wispUrls;

const configPromise = fetch("/wispServer.json").then(r => r.json());

let resetController;

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
        location.reload();
        return null;
    }

    const config = await configPromise;
    wispUrls = config.wispUrls;

    let wisp = wispUrls[Math.floor(Math.random() * wispUrls.length)];

    const { default: LibcurlClient } = await import("/libcurl/index.mjs");

    transport = new LibcurlClient({ wisp });

    controller = new $scramjetController.Controller({
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

    resetController = async () => {
        wispIndex++;
        let wisp = wispUrls[wispIndex % wispUrls.length];

        transport = new LibcurlClient({ wisp });

        controller = new $scramjetController.Controller({
            serviceworker: (await navigator.serviceWorker.ready).active,
            transport,
            config: controller.config
        });
    };

    await controller.wait();
    return controller;
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    await configPromise;
    const ctrl = await controllerPromise;
    if (!ctrl) return;

    try {
        const url = search(address.value, searchEngine.value);

        const frame = controller.createFrame();
        frame.element.id = "sj-frame";
        document.body.appendChild(frame.element);

        frame.go(url);
    } catch (err) {
        if (
            String(err).includes("error code 35") ||
            String(err).includes("error code 7")
        ) {
            await resetController();
        }
    }
});