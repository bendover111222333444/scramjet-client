"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
    files: {
        wasm: "/scram/scramjet.wasm",
        all: "/scram/scramjet.js",
        sync: "/scram/scramjet.js",
    },
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const configPromise = fetch("/wispServer.json").then(r => r.json());

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	const config = await configPromise;
    const wispUrl = config.wispUrl;
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	await connection.setTransport("/libcurl/index.mjs", [
		{ wisp: wispUrl },
	]);
	const url = search(address.value, searchEngine.value);
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	frame.go(url);
	
});
