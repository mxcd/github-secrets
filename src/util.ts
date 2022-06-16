import { sync as commandExistsSync } from "command-exists";

export interface Args {
  api_url?: string;
  access_token?: string;
  age_key?: string;
  secrets_file?: string;
  directory?: string;
  purge: boolean;
}

export function checkCommands() {
  if (!commandExistsSync(`sops`)) {
    console.error(`sops is not installed. Please install sops.`);
    return false;
  }
}

function isObject(item: object) {
  return item && typeof item === `object` && !Array.isArray(item);
}

function isArray(item: object) {
  return Array.isArray(item);
}

export function mergeDeep(target: any, ...sources: any): any {
  if (!sources.length) {
    return target;
  }
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        mergeDeep(target[key], source[key]);
      } else if (isArray(source[key]) && isArray(target[key])) {
        target[key].push(...source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}
