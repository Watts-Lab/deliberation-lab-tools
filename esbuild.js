const fs = require("fs");
const esbuild = require("esbuild");
const glob = require("glob");
const path = require("path");
const alias = require("esbuild-plugin-path-alias");
const polyfill = require("@esbuild-plugins/node-globals-polyfill");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * Copy the zod validators from deliberation-empirica submodule
 */
const filesToCopy = [
  "deliberation-empirica/server/src/preFlight/validateTreatmentFile.ts",
];

// Destination folder in your main source directory
const destinationFolder = "src/zod-validators";

// Ensure destination folder exists
if (!fs.existsSync(destinationFolder)) {
  fs.mkdirSync(destinationFolder, { recursive: true });
}

// Copy each required file
filesToCopy.forEach((filePath) => {
  const fileName = path.basename(filePath);
  fs.copyFileSync(filePath, path.join(destinationFolder, fileName));
});

/**
 * This plugin hooks into the build process to print errors in a format that the problem matcher in
 * Visual Studio Code can understand.
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`
        );
      });
      console.log("[watch] build finished");
    });
  },
};

/**
 * For web extension, all tests, including the test runner, need to be bundled into
 * a single module that has a exported `run` function .
 * This plugin bundles implements a virtual file extensionTests.ts that bundles all these together.
 * @type {import('esbuild').Plugin}
 */
const testBundlePlugin = {
  name: "testBundlePlugin",
  setup(build) {
    build.onResolve({ filter: /[\/\\]extensionTests\.ts$/ }, (args) => {
      if (args.kind === "entry-point") {
        return { path: path.resolve(args.path) };
      }
    });
    build.onLoad({ filter: /[\/\\]extensionTests\.ts$/ }, async (args) => {
      const testsRoot = path.join(__dirname, "src/test/suite");
      const files = await glob.glob("*.test.{ts,tsx}", {
        cwd: testsRoot,
        posix: true,
      });
      return {
        contents:
          `export { run } from './mochaTestRunner.ts';` +
          files.map((f) => `import('./${f}');`).join(""),
        watchDirs: files.map((f) => path.dirname(path.resolve(testsRoot, f))),
        watchFiles: files.map((f) => path.resolve(testsRoot, f)),
      };
    });
  },
};

// Points hooks.js from deliberation-empirica to the mock hooks.js file in src/views
// Needed for rendering
const aliasHooksImport = {
  name: "alias-hooks-imports",
  setup(build) {
    build.onResolve({ filter: /^\.\.\/components\/hooks$/ }, args => {
      return {
        path: path.resolve(__dirname, "src/views/hooks.js"),
      };
    });
  },
};


async function buildExtension() {
  const ctx = await esbuild.context({
    entryPoints: [
      "src/extension.ts"
    ],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "browser",
    outdir: "dist/",
    external: ["vscode", "path", "assert"],
    logLevel: "silent",
    // Node.js global to browser globalThis
    define: {
      global: "globalThis",
    },
    alias: { // Aliases of empirica modules to mocks for rendering
      '@empirica/core/player/react': path.resolve(__dirname, 'src/views/mocks.js'),
      '@empirica/core/player/classic/react': path.resolve(__dirname, 'src/views/mocks.js'),
      'deliberation-empirica/client/src/components/hooks': path.resolve(__dirname, 'src/views/hooks.js')
    },

    plugins: [
      polyfill.NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true,
      }),

      alias({
        aliases: {
          "../components/hooks": path.resolve(__dirname, "src/views/hooks.js"),
        },
        resolve: [".js", ".jsx"],
      }),

      aliasHooksImport,

      esbuildProblemMatcherPlugin /* add to the end of plugins array */,
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

// Builds index.jsx for prompt file rendering and CSS style files
async function buildPrompt() {
  const ctx = await esbuild.context({
    entryPoints: [
      "src/views/index.jsx",
      "src/views/styles.css",
      "src/views/playerStyles.css",
      "src/views/layout.css"
    ],
    bundle: true,
    format: "esm",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "browser",
    outdir: "dist/views/",
    logLevel: "silent",
    external: ["vscode", "path", "assert"],
    alias: { // Aliasing empirica module methods to point to mocks
      '@empirica/core/player/react': path.resolve(__dirname, 'src/views/mocks.js'),
      '@empirica/core/player/classic/react': path.resolve(__dirname, 'src/views/mocks.js'),
      'deliberation-empirica/client/src/components/hooks': path.resolve(__dirname, 'src/views/hooks.js')
    },
    plugins: [
      alias({
        aliases: {
          "../components/hooks": path.resolve(__dirname, "src/views/hooks.js"),
        },
        resolve: [".js", ".jsx"],
      }),

      aliasHooksImport
    ]
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

async function main() {
  await buildExtension();
  await buildPrompt();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
