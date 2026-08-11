declare module "ssh2-sftp-client" {
  import type { Writable } from "stream";

  export default class SftpClient {
    connect(config: {
      host?: string | null;
      port?: number | null;
      username?: string | null;
      password?: string;
      readyTimeout?: number;
    }): Promise<void>;
    list(path: string): Promise<Array<{ name: string; type: string; size: number; modifyTime?: number }>>;
    stat(path: string): Promise<{ size: number; isDirectory: boolean }>;
    get(path: string, destination: Writable): Promise<unknown>;
    end(): Promise<void>;
  }
}
