const { createApp, createContext } = require('./app');

async function start() {
  const context = createContext();
  await context.database.connect();
  const app = createApp(context);
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, host, () => console.log(`vCraft đang chạy tại http://${host}:${server.address().port}`));
  server.on('error', async error => {
    console.error('Không mở được HTTP server.', error.message);
    await context.database.close();
    process.exitCode = 1;
  });
  const shutdown = () => {
    server.close(async () => {
      await context.database.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('Không khởi động được vCraft.', error.message);
  process.exitCode = 1;
});
