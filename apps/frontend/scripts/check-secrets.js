const fs = require('fs');
const path = require('path');

const SENSITIVE_PATTERNS = [
    /key/i,
    /secret/i,
    /password/i,
    /token/i,
    /auth/i,
    /private/i
];

const IGNORE_LIST = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_GA_ID'
];

function checkEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let foundError = false;

    lines.forEach((line, index) => {
        const match = line.match(/^NEXT_PUBLIC_([A-Z0-9_]+)=(.+)$/);
        if (match) {
            const key = `NEXT_PUBLIC_${match[1]}`;
            const value = match[2];

            if (IGNORE_LIST.includes(key)) return;

            const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
            if (isSensitive) {
                console.error(`\x1b[31m[SECURITY ERROR]\x1b[0m Potential secret leak detected in ${path.basename(filePath)}:L${index + 1}`);
                console.error(`Variable \x1b[33m${key}\x1b[0m seems to contain sensitive information.`);
                console.error(`NEXT_PUBLIC_ variables are exposed to the browser. Never store secrets in them.\n`);
                foundError = true;
            }
        }
    });

    if (foundError) {
        process.exit(1);
    }
}

// Check .env and .env.local in the project root
const projectRoot = path.resolve(__dirname, '../../');
checkEnvFile(path.join(projectRoot, '.env'));
checkEnvFile(path.join(projectRoot, '.env.local'));

console.log('\x1b[32m[SECURITY CHECK]\x1b[0m No secrets detected in NEXT_PUBLIC_ variables.');
