// /api/ingest.js

import { serve } from 'inngest/express';
import { inngest, functions } from '../server/inngest/index.js'; // 👈 correct relative path

const handler = serve({
  client: inngest,
  functions,
});

export default handler;
