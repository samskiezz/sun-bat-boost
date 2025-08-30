import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
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
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      
      // Ban local math calculations in tabs - enforce using format utils and ML hooks
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.property.name='toLocaleString']",
          "message": "Use formatNumber, formatCurrency, or other utils from @/utils/format instead of direct .toLocaleString()"
        },
        {
          "selector": "BinaryExpression[operator='*'][left.type='Literal'][right.type='Literal']",
          "message": "Avoid hardcoded math calculations in components - use ML predictions or utilities"
        },
        {
          "selector": "VariableDeclarator[id.name=/.*[Cc]alculation.*|.*[Ss]avings.*|.*[Rr]oi.*/][init.type='BinaryExpression']",
          "message": "Use ML hooks (useSolarROI, useBatteryROI) instead of local calculations"
        }
      ],
      
      // Encourage consistent styling
      "no-restricted-globals": [
        "error",
        {
          "name": "className",
          "message": "Use design system tokens from @/theme/tokens instead of arbitrary classes"
        }
      ]
    },
  }
);
