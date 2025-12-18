import http from "http";

import { config } from "./config.js";
import app from "./index.js";

const port = config.port;
const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`API listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
