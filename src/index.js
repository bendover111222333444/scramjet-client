import { dirname } from "node:path";
import { fileURLToPath } from "url";
import { createServer } from "node:http";
import { hostname } from "node:os";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const epoxyPath = fileURLToPath(new URL("../node_modules/@bendover111222333444/epoxy-transport/dist", import.meta.url));
const controllerPath = fileURLToPath(new URL("../node_modules/@bendover111222333444/scramjet-controller/dist", import.meta.url));
const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

const fastify = Fastify({
    serverFactory: (handler) => {
        return createServer()
            .on("request", (req, res) => {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                handler(req, res);
            });
    },
});

fastify.register(fastifyStatic, {
    root: epoxyPath,
    prefix: "/epoxy/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: publicPath,
    decorateReply: true,
});

fastify.get("/scram/scramjet.js", (request, reply) => {
    reply.sendFile("scramjet.js", scramjetPath);
});

fastify.register(fastifyStatic, {
    root: scramjetPath,
    prefix: "/scram/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: controllerPath,
    prefix: "/controller/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false,
});

fastify.get("/controller.sw.js", (request, reply) => {
    reply.sendFile("controller.sw.js", controllerPath);
});

fastify.get("/scram/", (request, reply) => {
    reply.redirect("/scram/scramjet.js");
});

fastify.get("/scramjet/*", (request, reply) => {
    reply.code(200).type("text/html").send(`<!DOCTYPE html><html><head><meta charset="utf-8"><script>
        navigator.serviceWorker.ready.then(() => location.reload());
    </script></head><body></body></html>`);
});

fastify.setNotFoundHandler((req, reply) => {
    return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
    const address = fastify.server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    fastify.close();
    process.exit(0);
}

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

fastify.listen({ port, host: "0.0.0.0" });