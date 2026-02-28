const esbuild = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');
const isWebviewOnly = process.argv.includes('--webview');

// Extension build config
const extensionConfig = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  minify: !isWatch,
};

// Webview build config
const webviewConfig = {
  entryPoints: ['src/webview/index.tsx'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: !isWatch,
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
  },
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
};

// Build CSS with Tailwind CLI
function buildCSS() {
  console.log('Building CSS with Tailwind...');
  try {
    const minifyFlag = isWatch ? '' : ' --minify';
    execSync(
      `npx @tailwindcss/cli -i ./src/webview/styles/index.css -o ./dist/webview/styles.css${minifyFlag}`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('CSS build failed:', err.message);
    throw err;
  }
}

async function build() {
  // Ensure dist directories exist
  fs.mkdirSync('dist/webview', { recursive: true });

  // Build CSS first with Tailwind CLI
  buildCSS();

  if (isWatch) {
    // Build extension and webview with watch
    const contexts = await Promise.all([
      isWebviewOnly ? null : esbuild.context(extensionConfig),
      esbuild.context(webviewConfig),
    ].filter(Boolean));

    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('Watching for JS/TS changes... (CSS changes require manual rebuild with: npm run build:css)');
  } else {
    // Build mode
    await Promise.all([
      isWebviewOnly ? null : esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ].filter(Boolean));
    console.log('Build complete!');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
