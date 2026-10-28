# nshde

**nshde** is a recursive IDE inspired by [Native Shell (NSH)](https://nsh.dev/): an environment that can extend itself at runtime. You describe a module to an agent; the agent writes an NSH-style shell component, persists it to configurable storage, and the IDE hot-mounts it in the runtime preview—similar to NSH’s post-release TSX modules and signed packages, adapted for web development.

## Repository

- **GitHub:** [github.com/0x1d/nshde](https://github.com/0x1d/nshde)
- **Origin (Cursor):** [origin.cursor.com/0x1d/nshde](https://origin.cursor.com/0x1d/nshde)

## Features

- **App shell** — three-pane layout: object tree, Monaco editor, multi-agent panel
- **Object tree** — components and files under `components/`, developed through nshde
- **Code editor** — syntax highlighting for TSX/JSON via Monaco
- **Agent panel** — Architect, Implementer, and Reviewer agents (template-driven generation; plug in an LLM via the API layer)
- **Configurable storage** — `fs` (default, `.nshde-data/`), `memory`, or `s3` (AWS SDK hook; falls back to in-memory demo when creds are absent)
- **Runtime loading** — `.nsh.tsx` modules compiled with Sucrase in a sandbox; `.wasm` modules instantiated with host imports

## Quick start

```bash
npm install
npm run dev -- --port 43123
```

Open [http://localhost:43123](http://localhost:43123).

### Environment

| Variable | Description |
|----------|-------------|
| `NSHDE_STORAGE` | `fs` (default), `memory`, or `s3` |
| `NSHDE_S3_BUCKET` | S3 bucket name |
| `NSHDE_S3_PREFIX` | Key prefix inside the bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Required for real S3 (not yet wired; stub throws with creds) |

## Workflow

1. Pick an agent and prompt, e.g. *“Build a todo list module”*.
2. The agent writes `components/<slug>.nsh.tsx` to storage.
3. The editor opens the new file; the runtime preview mounts it automatically.
4. Click **run** on any module in the object tree to remount, or edit and **Save** to hot-reload.

## Architecture

```
┌─────────────┬──────────────────────┬──────────────┐
│ Object tree │ Editor + Runtime     │ Agent panel  │
└──────┬──────┴──────────┬───────────┴──────┬───────┘
       │                 │                  │
       └────────┬────────┴────────┬─────────┘
                ▼                 ▼
         /api/storage      /api/agents
                │
                ▼
     StorageProvider (fs | memory | s3)
                │
                ▼
     Runtime loader (TSX sandbox | WASM)
```

TSX modules only allow `react` imports today—a deliberate sandbox aligned with NSH capability grants. WASM modules can export `memory`, `render`, and use `nsh_host.log`.

## Relation to NSH

[NSH](https://nsh.dev/) targets native platforms with Rust/TSX, signed `.nshpkg` packages, and QuickJS sandboxes. **nshde** models the same loop for IDE self-development on the web: agents → stored modules → runtime integration. A production path would add signing, capability tokens, and the real `nsh` CLI toolchain for multi-target packaging.

## License

MIT
