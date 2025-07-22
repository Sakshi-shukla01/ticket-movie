// api/inngest.js
import { serve } from "inngest/next";
import { inngest, functions } from "../inngest/index.js"; // adjust path if needed

export const handler = serve({
  client: inngest,
  functions: functions,
});

export default handler;
