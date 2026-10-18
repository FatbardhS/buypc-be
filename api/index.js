// Vercel serverless entry point. Uses the compiled app from dist/ (built by `npm run build`)
// so Nest's decorator metadata is intact.
const { createApp } = require('../dist/app.factory');

let server;

module.exports = async (req, res) => {
  if (!server) {
    server = createApp().then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance();
    });
  }
  const handle = await server;
  return handle(req, res);
};
