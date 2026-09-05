import "./config/env.js";
import app from "./app.js";
import { env } from "./config/env.js";

console.log("Starting Festify API...");

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Festify API running at http://0.0.0.0:${env.port}`);
});