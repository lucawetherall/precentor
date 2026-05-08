import { RuleTester } from "eslint";
import rule from "./no-redirect-in-try.js";

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

tester.run("no-redirect-in-try", rule, {
  valid: [
    {
      name: "redirect outside any try/catch",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          const user = await getUser();
          if (!user) redirect("/login");
        }
      `,
    },
    {
      name: "redirect inside catch clause is allowed (catch-then-redirect pattern)",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          try {
            await thing();
          } catch {
            redirect("/login?error=auth");
          }
        }
      `,
    },
    {
      name: "redirect after a try/catch is allowed",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          let user;
          try { user = await getUser(); } catch { user = null; }
          if (!user) redirect("/login");
        }
      `,
    },
    {
      name: "redirect in a separate helper function called from try is not detected (documented limitation)",
      code: `
        import { redirect } from "next/navigation";
        function bail() { redirect("/login"); }
        export default async function Page() {
          try { bail(); } catch {}
        }
      `,
    },
    {
      name: "function named redirect but not imported from next/navigation is ignored",
      code: `
        function redirect() {}
        export default function Page() {
          try { redirect(); } catch {}
        }
      `,
    },
    {
      name: "redirect imported from next/navigation under an alias still works",
      code: `
        import { redirect as goTo } from "next/navigation";
        export default async function Page() {
          if (true) goTo("/login");
        }
      `,
    },
    {
      name: "redirect inside a callback declared in a try is allowed (different call stack)",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          try {
            const fn = () => redirect("/login");
            return fn;
          } catch {}
        }
      `,
    },
  ],
  invalid: [
    {
      name: "redirect inside try block",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          try {
            const user = await getUser();
            if (!user) redirect("/login");
          } catch (e) {
            console.error(e);
          }
        }
      `,
      errors: [{ messageId: "redirectInTry" }],
    },
    {
      name: "redirect inside try block reported with aliased import",
      code: `
        import { redirect as goTo } from "next/navigation";
        export default async function Page() {
          try {
            goTo("/login");
          } catch {}
        }
      `,
      errors: [{ messageId: "redirectInTry" }],
    },
    {
      name: "two redirects in the same try block produce two errors",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          try {
            if (a) redirect("/x");
            if (b) redirect("/y");
          } catch {}
        }
      `,
      errors: [{ messageId: "redirectInTry" }, { messageId: "redirectInTry" }],
    },
    {
      name: "redirect inside nested try block (inner) is reported",
      code: `
        import { redirect } from "next/navigation";
        export default async function Page() {
          try {
            try {
              redirect("/login");
            } catch {}
          } catch {}
        }
      `,
      errors: [{ messageId: "redirectInTry" }],
    },
  ],
});

console.log("no-redirect-in-try: all RuleTester cases passed");
