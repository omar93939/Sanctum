/**
 * minify.js
 *
 * This script performs minification for both JS and CSS files with two modes:
 *
 * 1. Development Mode (default): `node minify.js`
 * - Recursively finds all .js and .css files in their respective source directories (`static/js`, `static/css`), excluding 'min' subdirectories.
 * - Minifies each file and saves it to a `min` subdirectory (e.g., `static/js/min/`), preserving the original subdirectory structure.
 * - This mode is fast and does NOT check for file changes or update templates.
 *
 * 2. Production Mode (`--prod` flag): `node minify.js --prod`
 * - Performs all development mode tasks for both JS and CSS.
 * - Calculates the SHA-256 hash of each minified file's content.
 * - Compares the new hash with a previously stored hash in `minified_hashes.json`.
 * - If a file's hash has changed, it searches template files for references to that file.
 * - It intelligently updates the script/stylesheet path and increments its version number (e.g., `?v=1.1` to `?v=1.2`).
 * - Finally, it updates `minified_hashes.json` with any new or changed hashes.
 *
 * To Run:
 * 1. Make sure you have Node.js and a package.json with "type": "module".
 * 2. Install dependencies: `npm install terser csso`
 * 3. Run for development: `node minify.js`
 * 4. Run for production (to update versions): `node minify.js --prod`
 */

import { promises as fs } from 'fs';
import { join, resolve, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { minify as minifyJs } from 'terser';
import { minify as minifyCss } from 'csso';

// --- FIX for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// --- End FIX ---

// --- Configuration ---
const SOURCE_JS_DIR = join(__dirname, 'static', 'js');
const MINIFIED_JS_DIR = join(__dirname, 'static', 'js', 'min');
const EXCLUDED_JS_DIRS = ['min'];

const SOURCE_CSS_DIR = join(__dirname, 'static', 'css');
const MINIFIED_CSS_DIR = join(__dirname, 'static', 'css', 'min');
const EXCLUDED_CSS_DIRS = ['min'];

const TEMPLATES_DIR = join(__dirname, 'templates');
const HASH_FILE_PATH = join(__dirname, 'minified_hashes.json');
const EXCLUDED_TEMPLATE_DIRS = ['sitemaps'];
// --- End Configuration ---

/**
 * Wraps the terser minification function to provide a consistent interface.
 * @param {string} code - The JavaScript code to minify.
 * @returns {Promise<string>} The minified code.
 */
async function runTerser(code) {
    const result = await minifyJs(code);
    if (result.error) throw result.error;
    return result.code;
}

/**
 * Wraps the csso minification function to provide a consistent interface.
 * @param {string} code - The CSS code to minify.
 * @returns {Promise<string>} The minified code.
 */
async function runCsso(code) {
    const result = minifyCss(code);
    return result.css;
}

/**
 * Recursively finds all files with a specific extension in a directory, excluding specified subdirectories.
 * @param {string} dir - The directory to start searching from.
 * @param {string} ext - The file extension to look for (e.g., '.js').
 * @param {string[]} excludedDirs - An array of directory names to exclude.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths.
 */
async function findFilesByExt(dir, ext, excludedDirs = []) {
    let results = [];
    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
            const res = resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                if (!excludedDirs.includes(dirent.name)) {
                    results = results.concat(await findFilesByExt(res, ext, excludedDirs));
                }
            } else if (res.endsWith(ext)) {
                results.push(res);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading directory ${dir}:`, error);
        }
    }
    return results;
}

/**
 * Recursively finds all files in a directory, excluding specified subdirectories.
 * @param {string} dir - The directory to search.
 * @param {string[]} excludedDirs - An array of directory names to exclude.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths.
 */
async function findTemplateFiles(dir, excludedDirs) {
    let results = [];
    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
            const res = resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                if (!excludedDirs.includes(dirent.name)) {
                    results = results.concat(await findTemplateFiles(res, excludedDirs));
                }
            } else {
                results.push(res);
            }
        }
    } catch (error) {
        console.error(`Error reading template directory ${dir}:`, error);
    }
    return results;
}

/**
 * Loads the hash file from disk. Returns an empty object if it doesn't exist.
 * @returns {Promise<Object>} A promise that resolves to the parsed hash data.
 */
async function loadHashes() {
    try {
        const data = await fs.readFile(HASH_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Hash file not found. A new one will be created.');
            return {};
        }
        throw error;
    }
}

/**
 * Saves the hash data to the hash file on disk.
 * @param {Object} hashes - The hash object to save.
 * @returns {Promise<void>}
 */
async function saveHashes(hashes) {
    const data = JSON.stringify(hashes, null, 4);
    await fs.writeFile(HASH_FILE_PATH, data, 'utf8');
    console.log(`\nSuccessfully saved updated hashes to ${HASH_FILE_PATH}`);
}

/**
 * Intelligently updates version numbers and paths in template files.
 * @param {string} sourceWebPath - The original web path (e.g., /js/home.js).
 * @param {string} minifiedWebPath - The new minified web path (e.g., /js/min/home.js).
 * @param {string[]} templateFiles - An array of template file paths to search within.
 */
async function updateVersionInTemplates(sourceWebPath, minifiedWebPath, templateFiles) {
    console.log(`  -> Checking templates for imports of "${sourceWebPath}"...`);

    // Regex for the new, minified path: /js/min/file.js?v=1.2
    const minifiedPathPattern = minifiedWebPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const minifiedRegex = new RegExp(`(${minifiedPathPattern}\\?v=)([0-9.]+)`, 'g');

    // Regex for the legacy, non-minified path: /js/file.js?v=1.2
    const sourcePathPattern = sourceWebPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sourceRegex = new RegExp(`${sourcePathPattern}\\?v=([0-9.]+)`, 'g');

    let filesUpdated = 0;

    for (const file of templateFiles) {
        let content = await fs.readFile(file, 'utf8');
        const originalContent = content;

        // 1. First, try to find and update any LEGACY paths to the NEW path format.
        content = content.replace(sourceRegex, (match, version) => {
            const newVersion = (parseFloat(version) + 0.1).toFixed(1);
            console.log(`     - [Legacy Path] Found in ${basename(file)}. Updating to new path and version v${newVersion}.`);
            return `${minifiedWebPath}?v=${newVersion}`;
        });

        // 2. If no legacy paths were found, look for the CURRENT path and just update its version.
        if (content === originalContent) {
            content = content.replace(minifiedRegex, (match, scriptPath, version) => {
                const newVersion = (parseFloat(version) + 0.1).toFixed(1);
                console.log(`     - [Current Path] Found in ${basename(file)}: v${version} -> v${newVersion}`);
                return `${scriptPath}${newVersion}`;
            });
        }

        if (content !== originalContent) {
            await fs.writeFile(file, content, 'utf8');
            filesUpdated++;
        }
    }

    if (filesUpdated > 0) {
        console.log(`  -> Updated paths/versions in ${filesUpdated} template file(s).`);
    } else {
        console.log(`  -> No version references found to update.`);
    }
}

/**
 * Processes a set of files for minification and optionally hashing/template updates.
 * @param {object} options - The options for processing.
 * @returns {Promise<boolean>} True if hashes were changed, false otherwise.
 */
async function processFiles({
    fileType,
    sourceDir,
    minifiedDir,
    excludedDirs,
    fileExt,
    minifyFn,
    baseWebPath,
    isProduction,
    hashes,
    templateFiles
}) {
    console.log(`\n----- Processing ${fileType} files -----`);
    const files = await findFilesByExt(sourceDir, fileExt, excludedDirs);
    if (files.length === 0) {
        console.log(`No ${fileType} files found to minify.`);
        return false;
    }

    let hashesChanged = false;

    for (const file of files) {
        const relativePath = relative(sourceDir, file);
        const minifiedPath = join(minifiedDir, relativePath);

        console.log(`\n[Processing] ${relativePath}`);

        try {
            const code = await fs.readFile(file, 'utf8');
            const minifiedCode = await minifyFn(code);

            await fs.mkdir(dirname(minifiedPath), { recursive: true });
            await fs.writeFile(minifiedPath, minifiedCode, 'utf8');
            console.log(`  -> Minified to: ${relative(__dirname, minifiedPath)}`);

            // --- Production-Only Logic ---
            if (isProduction) {
                const sourceWebPath = ('/' + join(baseWebPath, relativePath)).replace(/\\/g, '/');
                const minifiedWebPath = ('/' + join(baseWebPath, 'min', relativePath)).replace(/\\/g, '/');

                const newHash = createHash('sha256').update(minifiedCode).digest('hex');
                const oldHash = hashes[sourceWebPath];

                if (newHash !== oldHash) {
                    console.log(`  -> Hash has changed! (Old: ${oldHash ? oldHash.substring(0, 7) + '...' : 'N/A'}, New: ${newHash.substring(0, 7)}...)`);
                    hashesChanged = true;
                    hashes[sourceWebPath] = newHash;
                    await updateVersionInTemplates(sourceWebPath, minifiedWebPath, templateFiles);
                } else {
                    console.log('  -> Hash is unchanged. Skipping template update.');
                }
            }
            // --- End Production-Only Logic ---

        } catch (error) {
            console.error(`  -> ERROR processing ${relativePath}:`, error);
        }
    }
    return hashesChanged;
}


/**
 * The main function to run the minification and hashing process.
 */
async function main() {
    const isProduction = process.argv.includes('--prod');
    console.log(`Starting minification process in ${isProduction ? 'Production' : 'Development'} mode...`);

    // Production-only variables
    let templateFiles, hashes;
    let anyHashesChanged = false;

    if (isProduction) {
        templateFiles = await findTemplateFiles(TEMPLATES_DIR, EXCLUDED_TEMPLATE_DIRS);
        hashes = await loadHashes();
    }

    // Process JavaScript files
    const jsHashesChanged = await processFiles({
        fileType: 'JavaScript',
        sourceDir: SOURCE_JS_DIR,
        minifiedDir: MINIFIED_JS_DIR,
        excludedDirs: EXCLUDED_JS_DIRS,
        fileExt: '.js',
        minifyFn: runTerser,
        baseWebPath: 'js',
        isProduction,
        hashes,
        templateFiles
    });

    // Process CSS files
    const cssHashesChanged = await processFiles({
        fileType: 'CSS',
        sourceDir: SOURCE_CSS_DIR,
        minifiedDir: MINIFIED_CSS_DIR,
        excludedDirs: EXCLUDED_CSS_DIRS,
        fileExt: '.css',
        minifyFn: runCsso,
        baseWebPath: 'css',
        isProduction,
        hashes,
        templateFiles
    });
    
    anyHashesChanged = jsHashesChanged || cssHashesChanged;

    if (isProduction) {
        if (anyHashesChanged) {
            await saveHashes(hashes);
        } else {
            console.log('\n\nNo file changes detected across all types. Hash file is up to date.');
        }
    }

    console.log('\nMinification process complete.');
}

main().catch(error => {
    console.error('An unexpected error occurred:', error);
});
