# github-secrets
The GitOps way of handling secrets for GitHub Actions
## Introduction
By design, GitHub Action secrets are sealed secrets. This means, that you are not able to introspect or edit the value once it has been submitted to GitHub.  
A more transparent approach of managing secrets is [SOPS my mozilla](https://github.com/mozilla/sops) which allows you to encrypt secrets for a defined audience
which in return will be able to decrypt it again. This way, secrets can be handled by a team and changes can be introduced without guessing the previous value
while maintaining tacability in the changes.

## Usage
