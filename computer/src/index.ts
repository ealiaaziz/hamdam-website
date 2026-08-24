// Hamdam Computer: a sandbox Worker built on @cloudflare/computer.
//
// @cloudflare/computer is Cloudflare's preview agent runtime. It gives a
// Durable Object a persistent SQLite-backed filesystem and one execution
// surface over it, so an agent has somewhere to keep working files and a shell
// to run against them. Cloudflare's own README is unambiguous about its
// maturity: "Suitable for experiments, exploration, and prototypes. It is NOT
// suitable for production use at this time."
//
// That sentence is why this is a third Worker in this repository rather than
// an import added to an existing one. The marketing site is static assets with
// no Durable Object to put a Workspace in, and the support desk handles real
// mail for real people. Neither should carry a dependency whose author says
// its API is unstable. This one has no route, no hostname and no scheduled
// work, so nothing depends on it and nothing breaks when the package changes
// under it.
//
// See computer/README.md for the surface and how to run it.

import { getWorkspace, withWorkspace } from '@cloudflare/computer';
import type {
  DurableObjectStorageLike,
  WorkspaceClient,
  WorkspaceOptions,
  WorkspaceStubHost,
} from '@cloudflare/computer';
import { WorkerShellBackend } from '@cloudflare/computer/backends/worker-shell';
import type { WorkerShellLoader } from '@cloudflare/computer/backends/worker-shell';
import { DurableObject } from 'cloudflare:workers';
import {
  MAX_WRITE_BYTES,
  constantTimeEquals,
  execCommand,
  workspaceName,
  workspacePath,
} from './http';

// Three casts in this file are the seam between a preview package's types and
// the current @cloudflare/workers-types, and all three are here rather than
// scattered so they can be deleted together when the package catches up:
//
//   1. `storage` widens to `DurableObjectStorageLike`, whose `Row` generic is
//      invariant against the runtime's `Record<string, SqlStorageValue>`.
//   2. The Durable Object stub widens to `WorkspaceStubHost`. Workers RPC
//      wraps a returned `WorkspaceStub` in `Stub<...>`, and the private field
//      on the class means the wrapper is not assignable to the original.
//   3. `WorkspaceFilesystem` and `WorkspaceStatResult` are not in the package's
//      export list, so they are recovered from `WorkspaceClient` below.
//
// Each is a naming mismatch rather than a claim about a value: the objects are
// the ones the package itself constructs and hands back. None of them is a
// cast over data arriving from a request, which is the kind that would be
// worth arguing about.
type WorkspaceFs = WorkspaceClient['fs'];
type WorkspaceStat = Awaited<ReturnType<WorkspaceFs['stat']>>;

export interface Env {
  AGENT: DurableObjectNamespace<Agent>;
  LOADER: WorkerShellLoader;
  // Not optional by accident. An unset token is the closed state, not the open
  // one: see `authorised` below.
  SANDBOX_TOKEN?: string;
}

/**
 * `ctx` and `env` are protected on `DurableObject`, and the `withWorkspace`
 * options callback below is an outside caller: it receives the instance and
 * reads from it. Re-exposing exactly the two things it needs keeps that
 * callback compiling without widening the object's public surface to
 * everything the base class holds.
 */
class ComputerBase extends DurableObject<Env> {
  readonly state = this.ctx;
  readonly bindings = this.env;
}

/**
 * One computer. The Workspace lives in this object's own SQLite storage, so a
 * given `?workspace=` name gets the same files back on every request until
 * something deletes them.
 */
export class Agent extends withWorkspace(
  ComputerBase,
  // The return type is annotated rather than inferred. Without it the compiler
  // has to resolve this function's type to work out `Agent`'s base type, and
  // the function mentions `Agent` through `self`, so it reports the class as
  // recursively referencing itself.
  (self): WorkspaceOptions => ({
    storage: self.state.storage as unknown as DurableObjectStorageLike,
    backends: [
      new WorkerShellBackend({
        loader: self.bindings.LOADER,
        // The shell runs in a Dynamic Worker and reaches its files by calling
        // back into this same Durable Object, which is what makes it cheap:
        // one store, no synchronisation, no container.
        workspace: { binding: 'AGENT', id: self.state.id.toString() },
        ctx: self.state,
        // Core just-bash only. The optional groups (`curl`,
        // `html-to-markdown`, `python`, `sqlite`, `js-exec`, `yq`, `file`,
        // `xan`, `jq`) are imported individually from
        // `@cloudflare/computer/shell/<group>` and passed here; a group nobody
        // imports is dropped by the bundler. Add what an experiment needs
        // rather than everything, and note that `curl` is the one that turns
        // the sandbox into a network client.
        commands: [],
        // No outbound network from the shell. `mode: "direct"` would let
        // anything running in here reach the internet from a Cloudflare
        // address, which is a thing to grant deliberately.
        egress: { mode: 'none' },
      }),
    ],
  }),
) {}

/**
 * `stat` that answers "no such path" with null instead of a throw.
 *
 * The filesystem client has no `exists`, and the failure arrives across an RPC
 * boundary where the error is a message rather than an `ENOENT` code worth
 * matching on. So this catches broadly, which is acceptable only because the
 * single caller treats null as 404 and nothing here is load-bearing.
 */
async function statOrNull(fs: WorkspaceFs, path: string): Promise<WorkspaceStat | null> {
  try {
    return await fs.stat(path);
  } catch {
    return null;
  }
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2) + '\n', { status, headers: JSON_HEADERS });
}

const USAGE = `hamdam-computer

  GET    /                      this text
  GET    /files/<path>          read a file
  PUT    /files/<path>          write the request body to a file
  DELETE /files/<path>          remove a file or directory
  GET    /ls/<path>             list a directory
  POST   /exec                  {"command": "..."} run a shell command

Every route takes ?workspace=<name> and defaults to "sandbox".
Every request needs the x-sandbox-token header.
`;

/**
 * The whole authorisation story, which is short on purpose.
 *
 * An unset SANDBOX_TOKEN denies everything. The alternative reading, that an
 * unset secret means no check is wanted, would make a fresh deployment of an
 * arbitrary-command endpoint open to whoever finds it, and a deployment is
 * exactly when a secret is most likely to be missing. This is the same shape
 * as the support console's ADMIN_EMAILS check, which fails closed for the same
 * reason.
 *
 * The failure response is 404 rather than 401 so an unauthorised caller cannot
 * tell a deployment that exists and refused them from a hostname that serves
 * nothing.
 */
function authorised(request: Request, env: Env): boolean {
  if (!env.SANDBOX_TOKEN) return false;
  return constantTimeEquals(request.headers.get('x-sandbox-token') ?? '', env.SANDBOX_TOKEN);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!authorised(request, env)) {
      return new Response('Not found\n', { status: 404 });
    }

    const url = new URL(request.url);
    const name = workspaceName(url);
    if (name === null) {
      return json({ error: 'workspace must match /^[a-z0-9][a-z0-9-]*$/ and be 64 characters or fewer' }, 400);
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(USAGE, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    // `using` on both stubs, not decoration: the RPC layer does not collect
    // remote stubs, so an undisposed one is a leak that only shows up on a
    // busy isolate.
    const stub = env.AGENT.get(env.AGENT.idFromName(name)) as unknown as WorkspaceStubHost;
    using workspace = await getWorkspace(stub);

    if (url.pathname.startsWith('/files/')) {
      const path = workspacePath(url.pathname, '/files');
      if (path === null || path === '/') return json({ error: 'bad path' }, 400);

      if (request.method === 'GET') {
        const stat = await statOrNull(workspace.fs, path);
        if (stat === null) return json({ error: 'not found', path }, 404);
        if (stat.isDirectory) return json({ error: 'is a directory', path }, 400);
        return new Response(await workspace.fs.readFile(path), {
          headers: { 'content-type': 'application/octet-stream' },
        });
      }

      if (request.method === 'PUT') {
        const body = new Uint8Array(await request.arrayBuffer());
        // The Workspace shares the Durable Object's storage and the whole of
        // it is around 10 GB, so a cap here is what stops one careless upload
        // from being the sandbox's last.
        if (body.byteLength > MAX_WRITE_BYTES) {
          return json({ error: `body exceeds ${MAX_WRITE_BYTES} bytes`, bytes: body.byteLength }, 413);
        }
        const parent = path.slice(0, path.lastIndexOf('/'));
        if (parent !== '') await workspace.fs.mkdir(parent, { recursive: true });
        await workspace.fs.writeFile(path, body);
        return json({ workspace: name, path, bytes: body.byteLength }, 201);
      }

      if (request.method === 'DELETE') {
        await workspace.fs.rm(path, { recursive: true, force: true });
        return json({ workspace: name, path, removed: true });
      }

      return json({ error: 'method not allowed' }, 405);
    }

    if (url.pathname.startsWith('/ls/') || url.pathname === '/ls') {
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
      const path = workspacePath(url.pathname, '/ls');
      if (path === null) return json({ error: 'bad path' }, 400);
      const entries = await workspace.fs.readdir(path);
      return json({
        workspace: name,
        path,
        entries: entries.map((entry) => ({ name: entry.name, directory: entry.isDirectory })),
      });
    }

    if (url.pathname === '/exec') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

      let parsed: unknown;
      try {
        parsed = await request.json();
      } catch {
        return json({ error: 'body must be JSON' }, 400);
      }

      const command = execCommand(parsed);
      if (command === null) return json({ error: 'command must be a non-empty string within the size limit' }, 400);

      using run = await workspace.runtime.exec(command, { encoding: 'utf8' });
      const { stdout, stderr, exitCode } = await run.result();
      return json({ workspace: name, command, exitCode, stdout, stderr });
    }

    return json({ error: 'not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
