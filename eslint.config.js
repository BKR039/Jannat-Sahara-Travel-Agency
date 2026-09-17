import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    /*
     * Build output, generated sources, and vendored reference material.
     *
     * `npm run lint` reported ~12,700 errors, of which only a few dozen were
     * ours: 11,015 were phantom `Delete ␍` from `core.autocrlf` on Windows
     * (now settled by prettier's `endOfLine: "auto"`), and 1,441 came from
     * `integrations/supabase/types.ts` alone — a file docs/03-database.md says
     * to never edit by hand. A signal that loud is a signal nobody reads, so
     * the generated and vendored trees are excluded and lint speaks only about
     * code someone can actually change.
     */
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "src/integrations/supabase/types.ts",
      "src/integrations/supabase/auth-middleware.ts",
      "src/components/watermelon/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);
