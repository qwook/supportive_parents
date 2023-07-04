import * as dotenv from "dotenv";
dotenv.config();

import http from "http"
import hmr from "node-hmr";


let app;

hmr(async () => {
  console.log("Reloading server.");
  try {
    ({ default: app } = await import("./app"));
  } catch (e) {
    console.log(e);
  }
})


const server = http.createServer((req, res) => { app(req, res) });
// server.listen(process.env.PORT);
server.listen(3001);
