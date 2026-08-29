declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string, encoding: "utf8"): void;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
}

declare module "node:url" {
  export function fileURLToPath(url: URL): string;
}

declare const process: {
  argv: string[];
};

declare module "node:assert" {
  export const strict: any;
}
