// api/inngest.js
import { serve } from "inngest/next";
import { inngest, functions } from "../inngest/index.js"; // ✅ adjust if needed

export default serve({
  client: inngest,
  functions: functions,
});
