import express from "express";
import type { Express } from "express";
import { routes } from "./routes/index.ts";
import { globalMiddlewares } from "./middlewares/index.ts";
import { errorHandler } from "./middlewares/errors.middleware.ts";

const app: Express = express();

// Behind exactly one reverse proxy (nginx): req.ip is read from X-Forwarded-For
app.set("trust proxy", 1);

app.use(globalMiddlewares);

app.use(routes);

app.use(errorHandler);

app.listen(process.env.PORT, () =>
  console.log(`✅ Server is running on port ${process.env.PORT}`),
);
