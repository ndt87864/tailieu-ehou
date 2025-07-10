import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List all js/jsx files
function getAllFiles(dir, fileList = [], extensions = [".js", ".jsx"]) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes("node_modules") && !filePath.includes("backup")) {
      fileList = getAllFiles(filePath, fileList, extensions);
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Find imports in the project
function findImports(files) {
  const imports = new Set();
  
  files.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    const importRegex = /import\s+(?:{[\s\w,]+}|[\w*]+)\s+from\s+[\'"]([\.\/\w-@]+)[\'"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        const dir = path.dirname(file);
        let absolutePath = path.resolve(dir, importPath);
        
        if (!path.extname(absolutePath)) {
          // Try common extensions
          [".js", ".jsx"].forEach(ext => {
            if (fs.existsSync(`${absolutePath}${ext}`)) {
              absolutePath = `${absolutePath}${ext}`;
            } else if (fs.existsSync(path.join(absolutePath, "index.js"))) {
              absolutePath = path.join(absolutePath, "index.js");
            }
          });
        }
        
        imports.add(absolutePath);
      }
    }
  });
  
  return imports;
}

// Main function
function findUnusedFiles() {
  const srcDir = path.resolve("src");
  const allFiles = getAllFiles(srcDir);
  const importedFiles = findImports(allFiles);
  
  
  allFiles.forEach(file => {
    // Skip index files and main entry files
    if (file.endsWith("index.js") || file.endsWith("index.jsx") || 
        file.endsWith("App.jsx") || file.endsWith("main.jsx")) {
      return;
    }
    
  });
}

findUnusedFiles();
