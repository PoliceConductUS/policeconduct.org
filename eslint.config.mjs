import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".astro/",
      ".cache/",
      ".worktrees/",
      "dist/",
      "node_modules/",
      "test-results/",
      "infrastructure/bootstrap-policeconduct/lambdas/forms-api/node_modules/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,ts,astro}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-useless-assignment": "error",
      "prefer-rest-params": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-empty": "error",
    },
  },
  {
    files: [
      "public/**/*.js",
      "mockups/**/*.js",
      "src/lib/client/**/*.{js,ts}",
      "src/components/**/*.astro",
      "src/pages/**/*.astro",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["*.cjs"],
    languageOptions: {
      globals: {
        ...globals.commonjs,
        ...globals.node,
      },
    },
  },
  {
    files: ["tests/**/*.{js,mjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
