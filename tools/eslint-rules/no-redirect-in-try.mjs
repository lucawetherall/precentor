/**
 * @fileoverview Disallow `redirect()` (from `next/navigation`) directly inside
 *   a `try` block. Next.js's `redirect` works by throwing `NEXT_REDIRECT`; if
 *   the call sits inside a `try { ... } catch { ... }`, the catch swallows the
 *   throw and the redirect never happens.
 *
 * Detection rules:
 *   - Only fires on a call to a binding named `redirect` that was imported
 *     from `next/navigation` *in the current file*. Other functions called
 *     `redirect` are ignored.
 *   - Only fires when the call is lexically inside a `TryStatement.block`
 *     (the `try { ... }` body) of the same function. Calls inside the
 *     `catch` clause are intentional and allowed.
 *   - Does not trace across function boundaries. A helper that itself throws
 *     a redirect is not detected — that limitation is a documented convention.
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow next/navigation `redirect()` calls inside a `try` block (the catch will swallow the NEXT_REDIRECT throw).",
    },
    schema: [],
    messages: {
      redirectInTry:
        "redirect() throws NEXT_REDIRECT and is swallowed by try/catch. Move the call after the try block, or fix the catch to re-throw redirects.",
    },
  },
  create(context) {
    /** @type {Set<string>} */
    let redirectLocalNames = new Set();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "next/navigation") return;
        for (const spec of node.specifiers) {
          if (
            spec.type === "ImportSpecifier" &&
            spec.imported.type === "Identifier" &&
            spec.imported.name === "redirect"
          ) {
            redirectLocalNames.add(spec.local.name);
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          !redirectLocalNames.has(node.callee.name)
        ) {
          return;
        }

        // Walk up the ancestor chain looking for a TryStatement.block that
        // lexically contains this call. Stop at function boundaries — a
        // redirect inside a callback declared in a try{} is fine because the
        // catch can't catch the throw across the function boundary at runtime
        // (different call stack), and besides we can't reason about when the
        // callback executes.
        let cursor = node.parent;
        let prev = node;
        while (cursor) {
          if (
            cursor.type === "FunctionDeclaration" ||
            cursor.type === "FunctionExpression" ||
            cursor.type === "ArrowFunctionExpression"
          ) {
            return;
          }
          if (
            cursor.type === "TryStatement" &&
            cursor.block === prev
          ) {
            context.report({ node, messageId: "redirectInTry" });
            return;
          }
          prev = cursor;
          cursor = cursor.parent;
        }
      },

      "Program:exit"() {
        redirectLocalNames = new Set();
      },
    };
  },
};

export default rule;
