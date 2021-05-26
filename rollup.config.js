import { terser } from 'rollup-plugin-terser'
import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import json from '@rollup/plugin-json'

export default [
  {
    input: 'src/index.js',
    plugins: [
      json({
        preferConst: true,
        compact: true
      })
    ],
    output: [
      {
        file: 'esm/index.js',
        format: 'esm',
        plugins: [
          getBabelOutputPlugin({
            presets: [
              ['@babel/preset-env']
            ],
            plugins: [
              [
                '@babel/plugin-transform-runtime', {
                  corejs: 3
                }
              ]
            ]
          })
        ]
      },
      {
        file: 'esm/es6.js',
        format: 'esm'
      },
      {
        file: 'umd/index.min.js',
        format: 'iife',
        name: 'uoma',
        plugins: [
          getBabelOutputPlugin({
            allowAllFormats: true,
            presets: ['@babel/preset-env']
          }),
          terser()
        ]
      }
    ]
  }
]
