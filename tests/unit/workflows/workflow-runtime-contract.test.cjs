// SPDX-License-Identifier: Apache-2.0
'use strict';

/**
 * workflow-runtime-contract.test.cjs
 *
 * 2026-08-10 regression guard. Both shipped workflows were unrunnable and
 * nobody noticed for months, because every existing test inspected them as
 * TEXT (roster drift) and none checked whether the runtime would accept and
 * execute them.
 *
 * Two independent defects, one per file:
 *
 *   r2-review.js — `export const meta` sat ~50 lines down, below the
 *     REVIEW_AGENTS const. The runtime rejects the script outright:
 *     "`export const meta = {...}` must be the FIRST statement in the script".
 *     Dispatch failed before a single agent spawned.
 *
 *   audit.js — meta was correctly first, so the script LOADED, but the whole
 *     pipeline lived inside `export default async function audit(...)`. The
 *     runtime executes the module body and never calls a default export, so
 *     the run would report its phases from meta and return undefined. That is
 *     the worse failure mode of the two: it looks like a successful run.
 *
 * These assertions are deliberately structural (parse-level), not behavioural.
 * Actually dispatching a workflow costs real tokens, so the cheap invariants
 * that would have caught both defects are what gets enforced on every push.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'shared', 'workflows');

function listWorkflows() {
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: f, src: fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8') }));
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

// Strip line comments, block comments and blank lines so "first statement"
// means first *executable* statement, matching how the runtime parses.
function firstStatement(src) {
  return stripComments(src)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)[0] || '';
}

const WORKFLOWS = listWorkflows();

describe('workflow runtime contract: shared/workflows/*.js', () => {
  test('inventory non-empty', () => {
    assert.ok(WORKFLOWS.length >= 2, `expected >=2 workflows, found ${WORKFLOWS.length}`);
  });

  for (const { name, src } of WORKFLOWS) {
    test(`${name}: "export const meta" is the FIRST statement`, () => {
      const first = firstStatement(src);
      assert.ok(
        first.startsWith('export const meta'),
        `${name} must begin with \`export const meta = {...}\`; found: ${first.slice(0, 80)}`
      );
    });

    test(`${name}: declares no default export (runtime never calls one)`, () => {
      assert.doesNotMatch(
        src,
        /^\s*export\s+default\b/m,
        `${name} uses \`export default\` — the runtime executes the module body and ` +
          `never invokes a default export, so the pipeline would silently return undefined. ` +
          `Either inline the body at top level, or keep the function and call it at the ` +
          `bottom of the file with \`return fn({ agent, parallel, pipeline }, args);\`.`
      );
    });

    test(`${name}: reaches a top-level return (produces a result)`, () => {
      assert.match(
        src,
        /^return\s/m,
        `${name} has no top-level \`return\` — a workflow that returns nothing gives the ` +
          `caller no findings to act on, which reads as "clean run" rather than "never ran".`
      );
    });

    test(`${name}: meta declares phases and they are pure literals`, () => {
      const metaMatch = src.match(/export const meta = \{[\s\S]*?\n\};/);
      assert.ok(metaMatch, `${name}: could not locate the meta block`);
      const meta = metaMatch[0];
      assert.match(meta, /name:\s*["']/, `${name}: meta.name must be a string literal`);
      assert.match(meta, /description:\s*\n?\s*["']/, `${name}: meta.description must be a string literal`);
      // The runtime walks the AST before execution — anything computed throws.
      assert.doesNotMatch(meta, /\$\{/, `${name}: meta must not interpolate (pure literal only)`);
      assert.doesNotMatch(meta, /\.\.\./, `${name}: meta must not spread (pure literal only)`);
    });
  }

  test('r2-review.js does not reference an unregistered agentType', () => {
    // Pass-2 used `agentType: 'skeptic'`, which is not a file in agents/.
    // The stage could never resolve its agent. Assert every agentType string
    // literal in every workflow maps to a shipped agent definition or to a
    // built-in type.
    const BUILT_IN = new Set(['general-purpose', 'Explore', 'Plan', 'claude']);
    const shipped = new Set(
      fs
        .readdirSync(path.join(REPO_ROOT, 'agents'))
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .map((f) => f.replace(/\.md$/, ''))
    );

    const unknown = [];
    for (const { name, src } of WORKFLOWS) {
      // Scan code only. Comments legitimately name retired agentTypes when
      // documenting why they were removed.
      const code = stripComments(src);
      const re = /agentType:\s*["']([^"']+)["']/g;
      let m;
      while ((m = re.exec(code)) !== null) {
        const t = m[1];
        if (!BUILT_IN.has(t) && !shipped.has(t)) unknown.push(`${name}: agentType "${t}"`);
      }
    }

    assert.deepStrictEqual(
      unknown,
      [],
      `workflow references agentType(s) with no matching agents/<name>.md and no built-in:\n  ${unknown.join('\n  ')}`
    );
  });

  test('agentType is never built from a template literal', () => {
    // audit.js used `agentType: \`${dim}-auditor\`` over the four audit
    // dimensions, which silently resolved to architecture-auditor /
    // testing-auditor / db-auditor — three agents that do not exist. A
    // computed agentType cannot be checked by the assertion above, so the
    // form itself is banned: name the agent explicitly or map it.
    const offenders = [];
    for (const { name, src } of WORKFLOWS) {
      if (/agentType:\s*`/.test(stripComments(src))) offenders.push(name);
    }
    assert.deepStrictEqual(
      offenders,
      [],
      `computed agentType found in: ${offenders.join(', ')}. Use an explicit string ` +
        `or an explicit lens->agent map so the roster stays statically checkable.`
    );
  });
});
