const fs = require('fs');
const path = require('path');

// Helper to convert hex to rgb
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        // handle shorthand hex
        result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
        if (result) {
            return {
                r: parseInt(result[1] + result[1], 16),
                g: parseInt(result[2] + result[2], 16),
                b: parseInt(result[3] + result[3], 16)
            };
        }
        return null;
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    let totalReplaced = 0;

    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (['node_modules', '.git', 'assets', 'build'].includes(file)) continue;
            totalReplaced += processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            totalReplaced += processFile(fullPath);
        }
    }
    return totalReplaced;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We'll use regex to find blocks of shadow properties.
    // This is a naive regex approach tailored to the typical formatting found via grep
    const shadowBlockRegex = /shadowColor:\s*['"]([^'"]+)['"],\s*shadowOffset:\s*{\s*width:\s*(-?[\d.]+),\s*height:\s*(-?[\d.]+)\s*},\s*shadowOpacity:\s*([\d.]+),\s*shadowRadius:\s*([\d.]+),?/g;
    
    let matchCount = 0;
    const newContent = content.replace(shadowBlockRegex, (match, color, width, height, opacity, radius) => {
        matchCount++;
        
        // Build rgba
        let rgbaStr = color;
        if (color.startsWith('#') || color.toLowerCase() === 'black' || color.toLowerCase() === 'white') {
           let r=0, g=0, b=0;
           if (color.toLowerCase() === 'black') { r=0; g=0; b=0; }
           else if (color.toLowerCase() === 'white') { r=255; g=255; b=255; }
           else {
               const parsed = hexToRgb(color);
               if (parsed) {
                   r = parsed.r; g = parsed.g; b = parsed.b;
               }
           }
           rgbaStr = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else if (color.startsWith('rgba')) {
            // Already rgba, we could try to merge opacity but leave it simple for now or replace the alpha
            rgbaStr = color.replace(/[\d.]+\)$/, `${opacity})`);
        }

        // Construct BoxShadow string: "offsetX offsetY blurRadius color"
        const boxShadowStr = `${width}px ${height}px ${radius}px ${rgbaStr}`;
        
        return `boxShadow: "${boxShadowStr}",`;
    });

    // Also look for blocks that might have different ordering or missing one prop.
    // For safety, let's just run the strict regex above. If they are formatted differently, we will catch them manually.

    if (matchCount > 0) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Replaced ${matchCount} shadow blocks in ${filePath}`);
    }
    
    return matchCount;
}

const targetDir = path.resolve(__dirname, '../src');
console.log(`Starting scan in ${targetDir}...`);
const replaced = processDirectory(targetDir);
console.log(`Done! Replaced a total of ${replaced} shadow blocks.`);
