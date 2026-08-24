import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSPACE,
  MAX_COMMAND_BYTES,
  constantTimeEquals,
  execCommand,
  workspaceName,
  workspacePath,
} from '../src/http';

describe('constantTimeEquals', () => {
  it('accepts an exact match', () => {
    expect(constantTimeEquals('s3cret', 's3cret')).toBe(true);
  });

  it('rejects a different value of the same length', () => {
    expect(constantTimeEquals('s3cret', 's3crEt')).toBe(false);
  });

  it('rejects a prefix, which is the case a length short-circuit would leak', () => {
    expect(constantTimeEquals('s3c', 's3cret')).toBe(false);
    expect(constantTimeEquals('s3cretary', 's3cret')).toBe(false);
  });

  it('rejects the empty string against a real secret', () => {
    expect(constantTimeEquals('', 's3cret')).toBe(false);
  });

  it('compares bytes, so a longer secret with the same prefix still fails', () => {
    expect(constantTimeEquals('token', 'tokens')).toBe(false);
  });
});

describe('workspaceName', () => {
  const name = (search: string) => workspaceName(new URL(`https://example.test/${search}`));

  it('defaults when absent or empty', () => {
    expect(name('')).toBe(DEFAULT_WORKSPACE);
    expect(name('?workspace=')).toBe(DEFAULT_WORKSPACE);
  });

  it('accepts lowercase names with hyphens', () => {
    expect(name('?workspace=notes-2026')).toBe('notes-2026');
  });

  it('rejects anything that could be two spellings of one computer', () => {
    expect(name('?workspace=Notes')).toBeNull();
    expect(name('?workspace=-notes')).toBeNull();
    expect(name('?workspace=notes/../other')).toBeNull();
    expect(name('?workspace=notes%20two')).toBeNull();
  });

  it('rejects a name longer than 64 characters', () => {
    expect(name(`?workspace=${'a'.repeat(64)}`)).toBe('a'.repeat(64));
    expect(name(`?workspace=${'a'.repeat(65)}`)).toBeNull();
  });
});

describe('workspacePath', () => {
  it('strips the prefix and returns an absolute path', () => {
    expect(workspacePath('/files/notes/todo.md', '/files')).toBe('/notes/todo.md');
  });

  it('collapses repeated slashes and dot segments', () => {
    expect(workspacePath('/files//notes///todo.md', '/files')).toBe('/notes/todo.md');
    expect(workspacePath('/files/./notes/./todo.md', '/files')).toBe('/notes/todo.md');
    expect(workspacePath('/files/notes/daily/../todo.md', '/files')).toBe('/notes/todo.md');
  });

  it('returns the root for the bare prefix', () => {
    expect(workspacePath('/files', '/files')).toBe('/');
    expect(workspacePath('/files/', '/files')).toBe('/');
  });

  it('decodes exactly once', () => {
    expect(workspacePath('/files/no%74es/todo.md', '/files')).toBe('/notes/todo.md');
    // %252e decodes to %2e, and a second pass would turn that into a dot and
    // then into a traversal. One pass leaves it as literal text.
    expect(workspacePath('/files/%252e%252e/todo.md', '/files')).toBe('/%2e%2e/todo.md');
  });

  it('rejects a traversal above the root rather than clamping it', () => {
    expect(workspacePath('/files/../etc/passwd', '/files')).toBeNull();
    expect(workspacePath('/files/notes/../../etc/passwd', '/files')).toBeNull();
    expect(workspacePath('/files/%2e%2e/etc/passwd', '/files')).toBeNull();
  });

  it('rejects a malformed escape and an embedded NUL', () => {
    expect(workspacePath('/files/%zz', '/files')).toBeNull();
    expect(workspacePath('/files/todo%00.md', '/files')).toBeNull();
  });

  it('rejects a path that does not carry the prefix', () => {
    expect(workspacePath('/exec', '/files')).toBeNull();
  });
});

describe('execCommand', () => {
  it('accepts a trimmed command', () => {
    expect(execCommand({ command: '  ls /  ' })).toBe('ls /');
  });

  it('rejects anything that is not a non-empty string', () => {
    expect(execCommand(null)).toBeNull();
    expect(execCommand('ls')).toBeNull();
    expect(execCommand({})).toBeNull();
    expect(execCommand({ command: 42 })).toBeNull();
    expect(execCommand({ command: '   ' })).toBeNull();
  });

  it('rejects a command over the size limit, measured in bytes', () => {
    expect(execCommand({ command: 'a'.repeat(MAX_COMMAND_BYTES) })).not.toBeNull();
    expect(execCommand({ command: 'a'.repeat(MAX_COMMAND_BYTES + 1) })).toBeNull();
    // Three bytes per character, so a limit counted in characters would let
    // this through at three times the size.
    expect(execCommand({ command: '€'.repeat(MAX_COMMAND_BYTES) })).toBeNull();
  });
});
