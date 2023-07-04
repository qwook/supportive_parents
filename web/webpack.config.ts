import * as path from "path";
import {
  Configuration,
  // HotModuleReplacementPlugin,
  ProvidePlugin,
  webpack,
} from "webpack";
import webpackDevServer from "webpack-dev-server";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import ReactRefreshTypeScript from "react-refresh-typescript";
import webpackDevMiddleware from "webpack-dev-middleware";
// import webpackHotMiddleware from "@gatsbyjs/webpack-hot-middleware";
import CopyPlugin from "copy-webpack-plugin";
import { NextFunction } from "express";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const isDevelopment = true;

const config: Configuration = {
  entry: ["./client/index.tsx"],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "script.bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            getCustomTransformers: () => ({
              before: [ReactRefreshTypeScript()].filter(Boolean),
            }),
            transpileOnly: isDevelopment,
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
  resolve: {
    alias: {
      process: "process/browser",
    },
    fallback: {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
    },
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    // new HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "public", to: path.resolve(__dirname, "dist") },
        {
          from: "node_modules/@mediapipe/face_mesh",
          to: path.resolve(__dirname, "dist", "face_mesh"),
        },
        {
          from: "node_modules/@tensorflow/tfjs-backend-wasm/dist",
          to: path.resolve(__dirname, "dist", "tfjs-backend-wasm"),
        },
      ],
    }),
    new ProvidePlugin({
      process: "process/browser",
    }),
  ],
  target: "web",
  devtool: "inline-source-map",
  mode: "development",
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
    hot: true,
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 3000,
  },
};

// const compiler = webpack(config);

// export const devMiddleware = isDevelopment
//   ? webpackDevMiddleware(compiler, {
//       serverSideRender: true,
//       publicPath: config.output?.publicPath || "/",
//       headers: () => {
//         return {
//           "Access-Control-Allow-Origin": "*",
//           "Cross-Origin-Opener-Policy": "same-origin",
//           "Cross-Origin-Embedder-Policy": "require-corp",
//         };
//       },
//     })
//   : (req: Request, res: Response, next: NextFunction) => next();

// export const hotMiddleware = isDevelopment
//   ? webpackHotMiddleware(compiler, {
//       log: false,
//       path: "/__webpack_hmr",
//       heartbeat: 10 * 1000,
//       headers: () => {
//         return {
//           "Access-Control-Allow-Origin": "*",
//           "Cross-Origin-Opener-Policy": "same-origin",
//           "Cross-Origin-Embedder-Policy": "require-corp",
//         };
//       },
//     })
//   : (req: Request, res: Response, next: NextFunction) => next();

export default config;
