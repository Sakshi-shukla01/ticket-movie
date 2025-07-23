// /api/inngest.js

import { serve } from 'inngest/express';
import { inngest, functions } from '../server/inngest/index.js';

const handler = serve({
  client: inngest,
  functions,
});

export default handler;
