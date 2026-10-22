// Vercel serverless function: every /api/* request is rewritten here
// (see vercel.json). The client is served as static files from dist/public.
import { createApp } from "../server/app.js";

const app = createApp();

export default app;
