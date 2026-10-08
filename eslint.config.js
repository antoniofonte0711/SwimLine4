import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Controllo automatico del codice: npm run lint
export default [
  { ignores: ['dist', 'node_modules', 'supabase/functions'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Senza il plugin React, ESLint non vede che i componenti usati nel JSX (anche <motion.div>) sono "usati"
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['*.config.js', 'src/**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
