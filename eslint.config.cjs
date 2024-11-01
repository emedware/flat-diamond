const tsEsLint = require('typescript-eslint')

module.exports = [
	{
		files: ['src/**/*.ts'],
		plugins: {
			'@typescript-eslint': tsEsLint.plugin
		},
		languageOptions: {
			parser: tsEsLint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-empty-interface': 'off',
			'@typescript-eslint/ban-types': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'lit-a11y/click-events-have-key-events': 'off',
			'no-debugger': 'error',
			'no-console': 'error',
			indent: 'off',
			semi: ['error', 'never']
		}
	}
]
