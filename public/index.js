"use strict";
const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");

const configPromise = fetch("/wispServer.json").then(r => r.json());

async function createTransport(wispUrls) {
    const wisp = wispUrls[Math.floor(Math.random() * wispUrls.length)];
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
    let transport = await createTransport(wispUrls);

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

    let reconnecting = false;
    let reconnectPromise = null;

    async function waitForReconnect() {
        if (reconnectPromise) await reconnectPromise;
    }

    async function reconnectTransport() {
        if (reconnecting) return reconnectPromise;

        reconnecting = true;

        reconnectPromise = (async () => {
            console.log("[epoxy] reconnecting...");

            try {
                const newTransport = await createTransport(wispUrls);

                await controller.setTransport(newTransport);
                transport = newTransport;

                console.log("[epoxy] reconnected");
            } catch (err) {
                originalError("[epoxy] reconnect failed:", err);
            } finally {
                reconnecting = false;
                reconnectPromise = null;
            }
        })();

        return reconnectPromise;
    }

    async function withTransport(fn) {
        await waitForReconnect();

        try {
            return await fn();
        } catch (err) {
            const msg = String(err);

            if (
                msg.includes("MuxTaskEnded") ||
                msg.includes("tls handshake eof") ||
                msg.includes("BrokenPipe") ||
                msg.includes("broken pipe")
            ) {
                await reconnectTransport();
                await waitForReconnect();

                return await fn();
            }

            throw err;
        }
    }

    const originalError = console.error;

    console.error = (...args) => {
        const msg = args.join(" ");

        if (
            msg.includes("MuxTaskEnded") ||
            msg.includes("tls handshake eof") ||
            msg.includes("BrokenPipe") ||
            msg.includes("broken pipe")
        ) {
            reconnectTransport();
        }

        originalError.apply(console, args);
    };

    window.withTransport = withTransport;
    return controller;
})();

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const [, controller] = await Promise.all([
        configPromise,
        controllerPromise
    ]);

    if (!controller) return;

    const url = search(address.value, searchEngine.value);
    document.getElementById("sj-frame")?.remove();
    const frame = controller.createFrame();
    frame.element.id = "sj-frame";
    document.body.appendChild(frame.element);
    await window.withTransport(() => frame.go(url));

});