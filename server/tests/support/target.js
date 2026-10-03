import http from "node:http";
import { after } from "node:test";
// 每个测试文件使用一个持续监听的本机服务，避免重复开启临时监听器。
export async function targetFor(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return server;
}
