import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noRedirectInTry from "./tools/eslint-rules/no-redirect-in-try.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      // In-repo plugin housing rules that are too specific to this codebase
      // to live in a published package. See `tools/eslint-rules/` and
      // `docs/conventions.md` for the rationale.
      precentor: {
        rules: {
          "no-redirect-in-try": noRedirectInTry,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Browser-native dialogs are unstyleable, block the main thread, and
      // look out of place. The audit replaced every callsite; new code should
      // use the toast system or ConfirmDialog instead.
      "no-restricted-globals": [
        "error",
        { name: "alert", message: "Use the toast system (useToast) instead of alert()." },
        { name: "confirm", message: "Use ConfirmDialog / useConfirm() instead of window.confirm()." },
        { name: "prompt", message: "Use a real form or dialog instead of window.prompt()." },
      ],
      // Catches the worst correctness bug from the audit: redirect() in a
      // try block is silently swallowed because Next.js redirects throw
      // NEXT_REDIRECT. See tools/eslint-rules/no-redirect-in-try.js.
      "precentor/no-redirect-in-try": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
