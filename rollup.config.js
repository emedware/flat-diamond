import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import pluginDts from 'rollup-plugin-dts'
import { rm } from 'node:fs/promises'

// clean out the destination folder
await rm('lib', { recursive: true, force: true })

export default [
	{
		input: 'src/index.ts',
		output: {
			banner: '/** https://www.npmjs.com/package/flat-diamond */',
			dir: 'lib'
		},
		plugins: [
			resolve(),
			commonjs(),
			typescript({
				tsconfigOverride: {
					include: ['./src'],
					exclude: ['./node_modules']
				}
			}),
			pluginDts()
		]
	},
	{
		input: 'src/index.ts',
		output: {
			banner: '/** https://www.npmjs.com/package/flat-diamond */',
			file: 'lib/cjs.js',
			sourcemap: true,
			format: 'cjs',
			exports: 'named'
		},
		plugins: [
			resolve(),
			commonjs(),
			typescript({
				tsconfigOverride: {
					include: ['./src'],
					exclude: ['./node_modules']
				}
			})
		]
	},
	{
		input: 'src/index.ts',
		output: {
			banner: '/** https://www.npmjs.com/package/flat-diamond */',
			file: 'lib/esm.js',
			sourcemap: true,
			format: 'esm'
		},
		plugins: [
			resolve(),
			commonjs(),
			typescript({
				tsconfigOverride: {
					include: ['./src'],
					exclude: ['./node_modules']
				}
			})
		]
	}
]
