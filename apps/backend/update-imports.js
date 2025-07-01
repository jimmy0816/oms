const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files
function findAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update imports in a file
function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace all imports from 'shared-types' with '@/types'
    content = content.replace(/from ['"]shared-types['"]/g, "from '@/types'");
    
    // Only write back if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Main function
function main() {
  const srcDir = path.join(__dirname, 'src');
  const tsFiles = findAllTsFiles(srcDir);
  
  console.log(`Found ${tsFiles.length} TypeScript files to process`);
  
  tsFiles.forEach(file => {
    updateImportsInFile(file);
  });
  
  console.log('Import update complete');
}

main();
