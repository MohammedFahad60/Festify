import "./config/env.js";
import app from "./app.js";
import { env } from "./config/env.js";

console.log("Starting Festify API...");

app.listen(env.port, "127.0.0.1", () => {
  console.log(`Festify API running at http://127.0.0.1:${env.port}`);
});