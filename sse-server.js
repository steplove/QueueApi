// sse-server.js

const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  setInterval(() => {
    const data = {
      message: "This is a message from the server",
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 3000);
});

server.listen(3002);
console.log("SSE Server running at http://localhost:3002/");
