// Custom server entry point for Plesk's Node.js hosting, which expects
// a single startup file rather than running `next start` directly.
const { createServer } = require("http");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(
    process.env.PORT || 3000,
    () => {
      console.log(`MarryMe.sg server ready on port ${process.env.PORT || 3000}`);
    }
  );
});
