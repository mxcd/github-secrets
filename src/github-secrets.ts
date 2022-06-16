import axios from "axios";
import libsodium from "libsodium-wrappers";

import { Destination } from "./secret-loader";
import { Args } from "./util";

interface SecretListResponse {
  total_count: number;
  secrets: Secret[];
}
interface Secret {
  name: string;
  created_at: string;
  updated_at: string;
  visibility: string;
}
interface PublicKeyResponse {
  key: string;
  key_id: string;
}

export async function applySecrets(args: any, destination: Destination) {
  if ((!destination.repository && !destination.organization) || (destination.repository && destination.organization)) {
    throw new Error(`Destination must have either a repository or an organization`);
  }

  const publicKey = await getPublicKey(args, destination);
  console.log(`Public key is ${publicKey}`);
  const secrets = await getSecrets(args, destination);
  console.log(`Found ${secrets.total_count} secrets`);
  console.log(JSON.stringify(secrets.secrets, null, 2));

  for (const key in destination.secrets) {
    const value: string = destination.secrets[key];
    await createOrUpdateSecret(args, destination, publicKey, key, value);
  }

  if (args.purge) {
    for (const secret of secrets.secrets) {
      let keyPresent = false;
      for (const key in destination.secrets) {
        if (secret.name.toUpperCase() === key.toUpperCase()) {
          keyPresent = true;
          break;
        }
      }

      if (!keyPresent) {
        console.log(`Deleting secret ${secret.name}`);
        await deleteSecret(args, destination, secret.name);
      }
    }
  }
}

function getBaseRequestUrl(args: Args, destination: Destination): string {
  const apiUrl = args.api_url || `https://api.github.com`;
  let url = `${stripSlashes(apiUrl)}`;
  if (destination.repository) {
    url += `/repos/${stripSlashes(destination.repository)}/actions/secrets`;
  } else if (destination.organization) {
    url += `/orgs/${stripSlashes(destination.organization)}/actions/secrets`;
  }

  return url;
}

async function getPublicKey(args: Args, destination: Destination): Promise<PublicKeyResponse> {
  const header = {
    Authorization: `token ${destination.token}`,
  };

  const url = getBaseRequestUrl(args, destination);

  try {
    const response = await axios.get(`${url}/public-key`, { headers: header });
    const publicKeyResponse: PublicKeyResponse = response.data;
    return publicKeyResponse;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to get public key for ${url}`);
  }
}

async function getSecrets(args: Args, destination: Destination): Promise<SecretListResponse> {
  const header = {
    Authorization: `token ${destination.token}`,
  };

  const url = getBaseRequestUrl(args, destination);

  try {
    const response = await axios.get(`${url}`, { headers: header });
    const secretListResponse = response.data as SecretListResponse;
    return secretListResponse;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to get public key for ${url}`);
  }
}

async function createOrUpdateSecret(args: Args, destination: Destination, publicKey: PublicKeyResponse, key: string, value: string): Promise<void> {
  const header = {
    Authorization: `token ${destination.token}`,
  };

  const url = getBaseRequestUrl(args, destination);
  const encryptedValue = await encryptSecret(value, publicKey);

  try {
    const response = await axios.put(`${url}/${key}`, { encrypted_value: encryptedValue, key_id: publicKey.key_id, visibility: `all` }, { headers: header });
    if (response.status === 201 || response.status === 204) {
      console.log(`Created secret ${key} for destination ${destination.repository || destination.organization}`);
    } else {
      throw new Error(`Failed to create secret ${key} for destination ${destination.repository || destination.organization}`);
    }
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to create secret ${key} for destination ${destination.repository || destination.organization}`);
  }
}

async function encryptSecret(secret: string, publicKey: PublicKeyResponse): Promise<string> {
  await libsodium.ready;
  const messageBytes = Buffer.from(secret);
  const keyBytes = Buffer.from(publicKey.key, `base64`);
  const encryptedBytes = libsodium.crypto_box_seal(messageBytes, keyBytes);
  const encrypted = Buffer.from(encryptedBytes).toString(`base64`);
  return encrypted;
}

async function deleteSecret(args: Args, destination: Destination, name: string): Promise<void> {
  const header = {
    Authorization: `token ${destination.token}`,
  };

  const url = getBaseRequestUrl(args, destination);
  try {
    const response = await axios.delete(`${url}/${name}`, { headers: header });
    if (response.status === 204) {
      console.log(`Deleted secret ${name} for destination ${destination.repository || destination.organization}`);
    } else {
      throw new Error(`Failed to delete secret ${name} for destination ${destination.repository || destination.organization}`);
    }
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to create secret ${name} for destination ${destination.repository || destination.organization}`);
  }
}

function stripSlashes(str: string): string {
  return str.replace(/^\/+|\/+$/g, ``);
}
