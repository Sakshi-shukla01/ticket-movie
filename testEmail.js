require("dotenv").config({ path: "./server/.env" }); // ✅ Load correct .env path
const sendEmail = require("./server/configs/nodeMailer.js").default;

sendEmail({
  to: "sakshishukla1008@gmail.com", // replace with your real test email
  subject: "✅ Test Email from QuickShow",
  body: "<h2>This is a test</h2><p>If you see this, email works!</p>",
});
