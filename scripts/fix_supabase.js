const fs = require('fs');
const path = require('path');

const GLOBAL_PATTERN = /const supabase(Admin)? = createClient\(\s*[\s\S]*?\s*\);?\n?/g;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We only care about global instantiations, not inside functions.
      // This is a naive regex but it works for Next.js actions/API routes where it's at the top.
      const match = content.match(/const supabaseAdmin = createClient\([\s\S]*?\);/m);
      if (match && match.index < content.indexOf('export async function')) {
        const globalClientCode = match[0];
        
        // Remove global client
        content = content.replace(globalClientCode, '');
        
        // Insert it into every exported async function
        const exportFunctionRegex = /export async function \w+\([^)]*\)\s*{/g;
        content = content.replace(exportFunctionRegex, (match) => {
          return `${match}\n  ${globalClientCode}\n`;
        });
        
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, '../src/app/actions'));
processDirectory(path.join(__dirname, '../src/app/api'));
