import { spawn } from "child_process";

export async function decryptSecretFile(filePath: string, ageKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sops = spawn(`sops`, [`--decrypt`, filePath], { env: { ...process.env, SOPS_AGE_KEY: ageKey } });
    let secret = ``;

    sops.stdout.on(`data`, (data: string) => {
      secret += data;
    });
    sops.on(`close`, (code: number) => {
      if (code === 0) {
        resolve(secret);
      } else {
        reject(code);
      }
    });
  });
}
