const fs = require('fs');
const path = require('path');

// 절대 경로로 안전하게 접근
const directory = path.join(__dirname, '../public/characters');
console.log('Target directory:', directory);

try {
    if (!fs.existsSync(directory)) {
        console.error('Directory does not exist!');
        process.exit(1);
    }

    const files = fs.readdirSync(directory);
    console.log(`Found ${files.length} files.`);

    let processedCount = 0;

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(directory, file);
            console.log(`Checking ${file}...`);
            
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const content = JSON.parse(raw);
                
                if (content.persona) {
                    delete content.persona;
                    // utf8 명시적으로 지정
                    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
                    console.log(`[OK] Removed persona from ${file}`);
                    processedCount++;
                } else {
                    console.log(`[SKIP] No persona in ${file}`);
                }
            } catch (err) {
                console.error(`[ERROR] Failed to process ${file}:`, err.message);
            }
        }
    });

    console.log(`Done. Processed ${processedCount} files.`);

} catch (err) {
    console.error('[FATAL] Script failed:', err);
    process.exit(1);
}
