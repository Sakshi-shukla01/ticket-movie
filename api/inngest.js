// api/inngest.js
import { serve } from "inngest/vercel";
import { functions, inngest } from "../server/inngest/index.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serve(inngest, functions);
