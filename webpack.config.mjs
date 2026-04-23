import path from 'path'
import { fileURLToPath } from 'url'
import { AngularWebpackPlugin } from '@ngtools/webpack'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default {
  target: 'node',
  mode: 'development',
  entry: './src/index.ts',
  context: __dirname,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
    publicPath: 'auto'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['@ngtools/webpack']
      },
      {
        test: /\.pug$/,
        use: ['apply-loader', 'pug-loader']
      },
      {
        test: /\.scss$/,
        use: ['@tabby-gang/to-string-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  externals: [
    /^@angular/,
    /^rxjs/,
    /^tabby-/,
    'keytar',
    'electron',
    '@electron/remote',
    'fs',
    'path'
  ],
  plugins: [
    new AngularWebpackPlugin({
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      directTemplateLoading: false,
      jitMode: true
    })
  ]
}