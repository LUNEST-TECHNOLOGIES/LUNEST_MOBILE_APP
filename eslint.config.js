// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // Disable rules that cause issues with optional chaining
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
      // Allow optional chaining
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      // Disable spacing rules that might conflict
      "space-infix-ops": "off",
      "no-multi-spaces": "off",
      // Allow flexible object property access
      "dot-notation": "off",
    },
  },
]);
