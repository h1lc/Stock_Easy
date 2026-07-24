module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
  overrides: [
    {
      // Les suites de tests s'executent sous Vitest (globals describe/it/expect)
      files: ['src/tests/**/*.{js,jsx}'],
      globals: {
        describe: 'readonly', it: 'readonly', expect: 'readonly',
        vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
      },
    },
  ],
  rules: {
    // Les composants sont typiquement passes sans PropTypes dans ce projet
    'react/prop-types': 'off',
  },
};
