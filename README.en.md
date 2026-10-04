<!-- Modified for dsh-ssh-rus by maxekb (2026); based on @linxin666/dsh-ssh 0.4.2 (Apache-2.0). See NOTICE. -->
# dsh-ssh-rus

Remote SSH operations for the **DeepSeek Harness (DSH)** web GUI: host manager, web terminal,
file transfer, port tunnels, cluster command execution and tools for the agent. Russian
interface, nothing reported outbound.

**This is a fork** of `@linxin666/dsh-ssh` 0.4.2 (Apache-2.0, author zhu1090093659,
[github.com/zhu1090093659/dsh-web](https://github.com/zhu1090093659/dsh-web)), reworked for
self-contained builds and independent maintenance. It is not affiliated with, or endorsed by, the
upstream author.

Русская версия: [README.md](./README.md).

## Differences from upstream

| Change | Why |
|---|---|
| Russian localisation (`src/client/locales.ru.ts`, every key; the `Record<SshKey, string>` type makes a missing key a build error) | for Russian-speaking users |
| **Telemetry removed** — `src/client/telemetry.ts` is gone | upstream sent a daily "heartbeat" carrying the package name to its own endpoint |
| Self-contained build: the build preset lives in `shared/` (`tsdown.client.ts`, `web-platform.ts`, plus `lightningcss`) | the package builds out of the box, with no foreign monorepo |
| Own identity: package and bundle row `dsh-ssh-rus`, mount key, `/api/dsh-ssh-rus` API family, locale namespace, own bus symbols instead of `dsh-web.*` | the module does not interleave with the upstream plugin family |
| Agent guidance (`SSH_GUIDANCE`) rewritten in Russian | the agent reads it as this plugin's instruction |

## Install

```sh
pnpm dsh plugin --profile <profile> add <path-to-tarball-or-directory>
```

The package declares its bundle row itself (`dsh.bundle.patch` in `package.json`). If the profile
does not pick it up, add `dsh-ssh-rus` to `dsh.profile.bundles` in the profile file and restart
DSH.

## Configuration

Hosts live in `$DSH_HOME/dsh-ssh.json` (default `~/.dsh/dsh-ssh.json`), directory `0700`, file
`0600`, atomic writes; import from `~/.ssh/config` happens in the panel. The path matches
upstream, so already configured hosts are preserved.

Plugin settings (enabled, announce to agent, terminal font) come from the `Config` schema in
`src/index.ts`, which also serves as this profile row's settings page.

## Security (read before use)

- **Passwords and key passphrases are stored in plain text** in `$DSH_HOME/dsh-ssh.json`. That is
  a deliberate trust model: a private file owned by the user. Do not "encrypt for show" and never
  hand this path to a model or a log.
- `ssh_upload` / `ssh_download` touch the local filesystem **with the host process's
  privileges** (not through a sandbox). `/api/dsh-ssh-rus/*` routes are loopback-only, tunnels
  listen on `127.0.0.1` only.
- `ProxyCommand` is a shell command executed by the host process; it is taken only from the
  user's private file. The agent sees whether one is configured and cannot create or modify hosts.
- Command output is returned **verbatim**: `env` on a remote host may bring secrets into the chat
  history. Transfer and execution consume real remote resources — confirm before running.
- Reconnecting after a drop may **replay a non-idempotent command**; design long operations with
  that in mind.

## Agent tools

`ssh_list`, `ssh_exec`, `ssh_upload`, `ssh_download`, `ssh_tunnel`, `ssh_cluster`. The agent sees
only hosts the user configured in the GUI or imported; inventing hosts is forbidden. Files and
commands on the local machine (where DSH runs) belong to the local tools — `ssh_*` addresses
remote paths only.

## Build and checks

```sh
pnpm install
pnpm run typecheck   # a missing locale key is a type error
pnpm run build       # tsc (lib/types) + tsdown (lib/index.js, lib/client.js)
pnpm exec vitest run tests/locales-runtime.spec.ts
```

Tested on DSH `0.2.0-rc.2`; `engines.dsh` is `>=0.1.7-rc.2`.

## License and provenance

Apache-2.0 (see `LICENSE`, kept from upstream). Based on `@linxin666/dsh-ssh` 0.4.2; the list of
changes is above, attribution and the per-file change notices are recorded in [NOTICE](./NOTICE).
Upstream names and visual identity are not used to imply endorsement or official affiliation.
