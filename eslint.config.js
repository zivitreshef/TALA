import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'graphify-out/**', 'public/**', 'scripts/**']
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true
        }
      ]
    }
  }
];
