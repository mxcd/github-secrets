# github-secrets

The GitOps way of handling secrets for GitHub Actions

## Introduction

By design, GitHub Action secrets are sealed secrets. This means, that you are not able to introspect or edit the value once it has been submitted to GitHub.  
A more transparent approach of managing secrets is [SOPS my mozilla](https://github.com/mozilla/sops) which allows you to encrypt secrets for a defined audience
which in return will be able to decrypt it again. This way, secrets can be handled by a team and changes can be introduced without guessing the previous value
while maintaining tacability in the changes.

## Usage

### Secrets files

Example of a secrets file:

```yaml
# personal access token to be used for authenticating against GitHub API
token: ghp_some_personal_access_token
# list of destinations for secrets
# desinations can be either a repository or an organization
destinations:
  # repository and it's relative path on GitHub
  - repository: /mxcd/github-secrets
    # object of secrets to be created or updated in the repository
    secrets:
      # secret name: "foo"
      # secret value: "bar"
      foo: bar
      # multiline secret value
      fizz: |-
        buzz
        buzz
        buzz
  # GitHub organization and it's relative path on GitHub
  - organization: /shutterbase
    secrets:
      foo: bar
```

### Creating a secret file

To create a secrets file, first create an unencrypted file that follows above mentioned structure.
Then, use `sops` to encrypt the file. It is assumed, that a `.sops.yaml` file is present in the same directory as the unencrypted file.

```
$ ls
secrets.yml
$ sops --encrypt secrets.yml > secrets.enc.yml
```

### Parameters and switches

Some options can be given as environment variable or as parameter. Parameters always take precedence over environment variables.
| option | environment variable | optional | default | description |
|---------------------------|----------------------|----------|------------------------|-----------------------------------------------------------------------------------|
| -u \| --api-url | GH_SECRETS_API_URL | true | https://api.github.com | GitHub (Enterprise) API URL to be used |
| -t \| --access-token | GH_SECRETS_AT | false | false | GitHub personal access token. Can also be stored in a secrets.yml file as 'token' |
| -k \| --age-key | GH_SECRETS_AGE_KEY | true | - | age key for decrypting sops secret file |
| -s \| --secrets-file | | true | - | location of single secret file |
| -d \| --secrets-directory | | true | - | location of directory containing secret files |
| -p \| --purge | | true | false | purge existing GitHub Action secrets not listed in the secret files any more |

### With typescript

github-secrets can be executed directly using `ts-node`. Make sure `ts-node` is installed on your system.

```bash
npm run main -f secretFile.enc.yml
```

### With docker

```bash
docker run --rm -v ${PWD}/secrets:/usr/app/secrets mxcd/github-secrets -p -d secrets -k AGE-SECRET-KEY-1234567890
```

### With GitHub Actions

It is required to at least have the age key stored as GitHub Actions secret in order to run github-secrets in a GitHub Actions workflow.  
In this scenario, it is assumed that the secrets are stored in a `./secrets` directory and that the only purpose of the repository is to store secrets
and distribute them via CI workflow.

```yaml
name: Distribute GitHub Actions secrets

on:
  push:
    branches: [main]
    paths:
      - "./secrets"
  workflow_dispatch:
  
jobs:
  build:
    name: Distribute Secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v1
      - name: Run github-secrets
        run: |
          docker run --rm -v ${PWD}/secrets:/usr/app/secrets mxcd/github-secrets -p -d secrets -k ${{ secrets.AGE_KEY }}
```
