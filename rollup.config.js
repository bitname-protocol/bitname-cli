import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

const pkg = require('./package.json')

export default [
    // Build node binary script
    {
        input: 'bin/bitname-cli.ts',
        output: [
            {
                file: pkg.bin.bitname,
                format: 'cjs',
                banner: '#!/usr/bin/env node',
                sourcemap: true,
            },
        ],
        external: [...Object.keys(pkg.dependencies), 'fs', 'path'],
        plugins: [
            // Allow node_modules resolution, so you can use 'external' to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve({
                module: true,
            }),
            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),
            // Compile TypeScript files
            typescript({
                tsconfig: './tsconfig.build.json'
            }),
            json({
                preferConst: true
            }),
            // Resolve source maps to the original source
            sourceMaps(),
        ],
    },
    // Build UMD and ES6 lib bundles
    {
        input: `index.ts`,
        output: [
            {
                file: pkg.main,
                name: 'bitname',
                format: 'cjs',
                sourcemap: true,
            },
            {
                file: pkg.module,
                format: 'es',
                sourcemap: true,
            },
        ],
        // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
        external: [...Object.keys(pkg.dependencies), 'fs', 'path'],
        plugins: [
            // Allow node_modules resolution, so you can use 'external' to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve({
                module: true,
            }),
            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),
            // Compile TypeScript files
            typescript({
                tsconfig: './tsconfig.build.json'
            }),
            json({
                preferConst: true
            }),
            // Resolve source maps to the original source
            sourceMaps(),
        ],
    }
]
