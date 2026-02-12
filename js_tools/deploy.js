const { spawnSync } = require('child_process');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { rollup } = require('rollup');
const babel = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const copy = require('rollup-plugin-copy');
const terser = require('@rollup/plugin-terser');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

const package_name_underscore = process.env.npm_package_name.replace(/\-/g, "_");

// run the rollup bundler on the main.js file, outputting the results to the dist directory
async function run_rollup(use_terser) {
    const bundle = await rollup({
        input: 'js_src/main.js',
        plugins: [
            commonjs(),
            nodeResolve(),
            babel({
                babelHelpers: 'bundled',
                presets: ['@babel/preset-env'],
                targets: {
                    "node": 12,
                },
            }),
            copy({
                targets: [{
                    src: `pkg/${package_name_underscore}_bg.wasm`,
                    dest: 'dist',
                    rename: `${package_name_underscore}.wasm`,
                }]
            }),
        ]
    });
    await bundle.write({
        format: 'cjs',
        file: 'dist/main.js',
        plugins: [use_terser && terser()],
    });
}

async function output_clean() {
    for (dir of ['dist', 'pkg']) {
        await fsExtra.emptyDir(dir);
    }
}

function run_wasm_pack() {
    let args = ['build', '--target', 'web', '--release', '.'];
    return spawnSync('wasm-pack', args, { stdio: 'inherit' })
}

async function run() {
    await output_clean();
    const build_result = await run_wasm_pack();
    if (build_result.status !== 0) {
        throw new Error('wasm-pack build failed');
    }

    await run_rollup(false);
}

run().catch(console.error);