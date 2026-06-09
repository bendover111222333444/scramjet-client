import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { scramjetPath } from '@mercuryworkshop/scramjet/path';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, '../public');

mkdirSync(join(publicDir, 'scram'), { recursive: true });
mkdirSync(join(publicDir, 'baremux'), { recursive: true });
mkdirSync(join(publicDir, 'controller'), { recursive: true });
mkdirSync(join(publicDir, 'epoxy'), { recursive: true });

// scramjet
copyFileSync(join(scramjetPath, 'scramjet.js'), join(publicDir, 'scram/scramjet.js'));
copyFileSync(join(scramjetPath, 'scramjet.wasm'), join(publicDir, 'scram/scramjet.wasm'));

// baremux
copyFileSync(join(baremuxPath, 'index.js'), join(publicDir, 'baremux/index.js'));

// controller
const controllerPath = fileURLToPath(new URL('../node_modules/@bendover111222333444/scramjet-controller/dist', import.meta.url));
copyFileSync(join(controllerPath, 'controller.api.js'), join(publicDir, 'controller/controller.api.js'));
copyFileSync(join(controllerPath, 'controller.inject.js'), join(publicDir, 'controller/controller.inject.js'));
copyFileSync(join(controllerPath, 'controller.sw.js'), join(publicDir, 'controller/controller.sw.js'));

// epoxy
const epoxyPath = fileURLToPath(new URL('../node_modules/@bendover111222333444/epoxy-transport/dist', import.meta.url));
copyFileSync(join(epoxyPath, 'index.mjs'), join(publicDir, 'epoxy/index.mjs'));

console.log('Assets copied successfully');