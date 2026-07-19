import {
  request as httpRequest,
  type RequestOptions,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import type { Socket } from "node:net";

export type HttpTestResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text: string;
  json<T = unknown>(): T;
};

export type ManagedHttpTestServer = {
  server: Server;
  baseUrl: string;
  activeSocketCount(): number;
  request(
    pathname: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
  ): Promise<HttpTestResponse>;
  close(): Promise<void>;
};

function parseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

export async function startManagedHttpTestServer(
  server: Server,
): Promise<ManagedHttpTestServer> {
  const sockets = new Set<Socket>();
  const onConnection = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };

  server.on("connection", onConnection);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });

  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error("Servidor de teste sem endereço.");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const request = async (
    pathname: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {},
  ): Promise<HttpTestResponse> => {
    const target = new URL(pathname, baseUrl);
    const requestOptions: RequestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: options.method ?? "GET",
      agent: false,
      headers: {
        Connection: "close",
        ...(options.body
          ? { "Content-Length": Buffer.byteLength(options.body).toString() }
          : {}),
        ...options.headers,
      },
    };

    return await new Promise<HttpTestResponse>((resolve, reject) => {
      const clientRequest = httpRequest(requestOptions, (response) => {
        response.setEncoding("utf8");
        let text = "";
        response.on("data", (chunk: string) => {
          text += chunk;
        });
        response.once("error", reject);
        response.once("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            text,
            json: <T>() => parseJson<T>(text),
          });
        });
      });
      clientRequest.once("error", reject);
      if (options.body) clientRequest.write(options.body);
      clientRequest.end();
    });
  };

  const close = async (): Promise<void> => {
    if (!server.listening) {
      for (const socket of sockets) socket.destroy();
      sockets.clear();
      server.off("connection", onConnection);
      return;
    }

    const closed = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    server.closeIdleConnections?.();
    server.closeAllConnections?.();
    for (const socket of sockets) socket.destroy();
    await closed;
    await new Promise<void>((resolve) => setImmediate(resolve));
    server.off("connection", onConnection);

    const remaining = [...sockets].filter((socket) => !socket.destroyed);
    sockets.clear();
    if (remaining.length > 0) {
      throw new Error(
        `Servidor de teste encerrou com ${remaining.length} socket(s) ativo(s).`,
      );
    }
  };

  return {
    server,
    baseUrl,
    activeSocketCount: () =>
      [...sockets].filter((socket) => !socket.destroyed).length,
    request,
    close,
  };
}
