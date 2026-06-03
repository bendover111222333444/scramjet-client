"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const configPromise = fetch("/wispServer.json").then(r => r.json());

const controllerPromise = (async () => {
    await navigator.serviceWorker.register("/controller.sw.js", { scope: "/" });

    if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        });
        location.reload();
        return;
    }

    await navigator.serviceWorker.ready;

    const controller = new $scramjetController.Controller({
        serviceworker: (await navigator.serviceWorker.ready).active,
        transport: connection,
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
    console.log("controller:", controller);
    console.log("config:", config);
    
    if (!controller) {
        console.log("controller is undefined!");
        return;
    }

    const wispUrls = config.wispUrls;
    console.log("wispUrls:", wispUrls);

    await connection.setTransport("/libcurl/index.mjs", [
        { wisp: wispUrls[Math.floor(Math.random() * wispUrls.length)] },
    ]);

    const url = search(address.value, searchEngine.value);
    console.log("url:", url);
    const frame = controller.createFrame();
    console.log("frame:", frame);
    document.body.appendChild(frame.element);
    frame.go(url);
});