const http = require('http');

const eventData = {
  name: "app/show.booked",  // <-- Your custom event name
  data: {
    bookingId: "688c4bebb1702fff16358fd1"
  }
};

// Inngest listener URL (must be running)
const inngestURL = {
  hostname: 'localhost',   // or '127.0.0.1'
  port: 3000,
  path: '/api/inngest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(eventData))
  }
};

const req = http.request(inngestURL, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log("✅ Inngest event sent successfully");
    } else {
      console.log("❌ Failed to send event:", res.statusCode);
      console.log("Body:", body);
    }
  });
});

req.on('error', (error) => {
  console.error("❌ Error sending event:", error.message);
});

req.write(JSON.stringify(eventData));
req.end();
