import { ArgumentParser } from "argparse";

import { loadSecrets } from "./secret-loader";
import { applySecrets } from "./github-secrets";

// if (!checkCommands()) {
//   process.exit(1);
// }

const parser = new ArgumentParser({
  description: `Argparse example`,
});

const ENVIRONMENT_VARIABLES = [
  { name: `GH_SECRETS_API_URL`, default: `https://api.github.com`, variable: `api_url`, required: true },
  { name: `GH_SECRETS_AT`, default: null, variable: `access_token`, required: false },
  { name: `GH_SECRETS_AGE_KEY`, default: null, variable: `age_key`, required: true },
];

parser.add_argument(`-u`, `--api-url`, { help: `GitHub API URL` });
parser.add_argument(`-t`, `--access-token`, { help: `GitHub access token` });
parser.add_argument(`-k`, `--age-key`, { help: `age key` });
parser.add_argument(`-f`, `--secrets-file`, { help: `single secrets file` });
parser.add_argument(`-d`, `--secrets-directory`, { help: `secrets directory` });
parser.add_argument(`-p`, `--purge`, { action: `store_true`, default: false, help: `purge old secrets` });
const args = parser.parse_args();

for (const variable of ENVIRONMENT_VARIABLES) {
  if (!process.env[variable.name] && !args[variable.variable] && variable.default) {
    args[variable.variable] = variable.default;
  } else if (process.env[variable.name] && !args[variable.variable]) {
    args[variable.variable] = process.env[variable.name];
  }

  if (variable.required && !args[variable.variable]) {
    console.error(`The variable '${variable.name}' is required. Either set it as an environment variable or pass it as an argument.`);
    process.exit(1);
  }
}

if (!args.secrets_file && !args.secrets_directory) {
  console.error(`Please specify a secrets file or directory.`);
  process.exit(1);
}

(async () => {
  const secrets = await loadSecrets(args);
  for (const destination of secrets.destinations) {
    await applySecrets(args, destination);
  }
})();
