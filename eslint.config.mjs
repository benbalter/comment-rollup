import github from "eslint-plugin-github";
import tseslint from "typescript-eslint";

const githubFlatConfigs = github.getFlatConfigs();

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
    ],
  },
  githubFlatConfigs.recommended,
  ...Object.values(githubFlatConfigs.typescript),
  {
    files: ["src/**/*.ts", "__tests__/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["__tests__/*.ts", "eslint.config.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "i18n-text/no-en": "off",
      "camelcase": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "import/extensions": "warn",
      "import/no-unresolved": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
