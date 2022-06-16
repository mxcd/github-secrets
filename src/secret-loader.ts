import * as fs from "fs";
import { decryptSecretFile } from "./sops";
import { mergeDeep } from "./util";
import * as yaml from "js-yaml";

export interface Secrets {
  token?: string;
  destinations: Destination[];
}

export interface Destination {
  repository?: string;
  organization?: string;
  token?: string;
  secrets: {
    [key: string]: string;
  };
}

export async function loadSecrets(args: any): Promise<Secrets> {
  const secrets: Secrets = { destinations: [] };

  if (args.secrets_file) {
    if (!fs.existsSync(args.secrets_file)) {
      console.error(`Secrets file ${args.secrets_file} does not exist`);
      process.exit(1);
    }
    const secret = await decryptSecretFile(args.secrets_file, args.age_key);
    mergeDeep(secrets, yaml.load(secret));
  }

  if (args.directory) {
    if (!fs.existsSync(args.directory)) {
      console.error(`Secrets directory '${args.directory}' does not exist`);
      process.exit(1);
    }
    if (!fs.statSync(args.directory).isDirectory()) {
      console.error(`Secrets directory '${args.directory}' is not a directory`);
      process.exit(1);
    }

    const files = fs.readdirSync(args.directory).filter((file: string) => {
      return file.endsWith(`.yaml`) || file.endsWith(`.yml`);
    });
    for (const file of files) {
      const secret = await decryptSecretFile(`${args.directory}/${file}`, args.age_key);
      mergeDeep(secrets, yaml.load(secret));
    }
  }

  // distribute global token to destinations
  if (secrets.token) {
    for (const destination of secrets.destinations) {
      if (!destination.token) destination.token = secrets.token;
    }
  }

  if (args.access_token) {
    for (const destination of secrets.destinations) {
      if (!destination.token) destination.token = args.access_token;
    }
  }

  return secrets;
}
