import "./config/env.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
app.listen(env.port, "0.0.0.0", () => {
  console.log(`Festify API listening on 0.0.0.0:${env.port}`);
});
