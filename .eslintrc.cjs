/** Configuration ESLint — le script `npm run lint` etait declare sans config. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  rules: {
    // Le nouveau transform JSX rend l'import de React inutile
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Le francais est plein d'apostrophes : les echapper nuirait a la lisibilite
    // du code sans rien changer au rendu. On garde le controle sur > et }.
    'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
  },
  ignorePatterns: ['dist', 'node_modules'],
};
