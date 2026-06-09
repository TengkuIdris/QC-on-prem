module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "prettier",
    "plugin:storybook/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "@typescript-eslint", "react", "react-hooks", "prettier", "@typescript-eslint"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@next/next/no-img-element": "off",
    "react-hooks/exhaustive-deps": "off",
    "react/prop-types": "off",
    "react/display-name": "off",
    "linebreak-style": "off",
    "react/no-children-prop": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
        useTabs: false,
        printWidth: 120,
        trailingComma: "all",
        arrowParents: "avoid",
        proseWrap: "always",
        semi: true,
        tabWidth: 2,
        singleAttributePerLine: true,
        overrides: [
          {
            files: ["*.scss"],
            options: {
              singleQuote: false,
            },
          },
        ],
      },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
