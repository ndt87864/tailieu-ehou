const fs = require('fs');
const path = require('path');

// Danh sách các thư mục và file cần giữ lại
const essentialFolders = [
  'src',
  'public',
  'node_modules',
  'scripts',
  'build',
  'dist'
];

// Các file quan trọng cần giữ lại
const essentialFiles = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'README.md',
  '.gitignore',
  '.env',
  '.env.local',
  'vite.config.js',
  'tsconfig.json',
  'jsconfig.json',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json'
];

// Các file/thư mục bắt đầu bằng '.' thường là file cấu hình quan trọng
const keepIfStartsWith = [
  '.',
  'firebase'
];

// Các extension cần giữ lại
const keepExtensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.scss',
  '.html',
  '.json',
  '.md',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.env'
];

// Các thư mục/file cần xóa (có thể chỉnh sửa dựa trên dự án cụ thể)
const foldersToRemove = [
  'temp',
  'tmp',
  '.cache',
  'coverage',
  '.vscode',
  '.idea',
  '__tests__',
  'docs'
];

// Các patterns của file cần xóa
const filePatternsToRemove = [
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.bak',
  '*.tmp',
  '*.old'
];

// Bỏ qua các file zip
const shouldIgnore = (filename) => {
  return filename.endsWith('.zip');
};

// Hàm kiểm tra xem file/folder có cần giữ lại không
const shouldKeep = (filePath) => {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Bỏ qua file zip
  if (shouldIgnore(basename)) {
    return true;
  }
  
  // Kiểm tra nếu là thư mục/file quan trọng
  if (essentialFolders.includes(basename) || essentialFiles.includes(basename)) {
    return true;
  }
  
  // Kiểm tra nếu file/folder bắt đầu bằng ký tự đặc biệt
  for (const prefix of keepIfStartsWith) {
    if (basename.startsWith(prefix)) {
      return true;
    }
  }
  
  // Kiểm tra extension
  if (keepExtensions.includes(ext)) {
    return true;
  }
  
  // Kiểm tra nếu nằm trong danh sách xóa
  if (foldersToRemove.includes(basename)) {
    return false;
  }
  
  // Kiểm tra patterns xóa
  for (const pattern of filePatternsToRemove) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(basename)) {
        return false;
      }
    } else if (basename === pattern) {
      return false;
    }
  }
  
  // Mặc định giữ lại để an toàn
  return true;
};

// Hàm xóa file/folder không quan trọng
const cleanupProject = (directory) => {
  // Đọc nội dung thư mục
  const items = fs.readdirSync(directory);
  
  items.forEach(item => {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Nếu là thư mục, xử lý đệ quy
      if (!shouldKeep(itemPath)) {
        console.log(`Đang xóa thư mục: ${itemPath}`);
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        // Nếu giữ lại thư mục, kiểm tra nội dung bên trong
        cleanupProject(itemPath);
      }
    } else {
      // Nếu là file, kiểm tra và xóa nếu không cần thiết
      if (!shouldKeep(itemPath)) {
        console.log(`Đang xóa file: ${itemPath}`);
        fs.unlinkSync(itemPath);
      }
    }
  });
};

// Thư mục gốc dự án
const projectRoot = path.resolve(__dirname, '..');

// Thêm chức năng tìm file không sử dụng
const findUnusedFiles = () => {
  console.log('Đang phân tích để tìm file không sử dụng...');
  
  // Lấy tất cả file JavaScript/JSX/TypeScript trong thư mục src
  const getAllSourceFiles = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        getAllSourceFiles(filePath, fileList);
      } else {
        // Chỉ lấy file JavaScript/JSX/TypeScript
        const ext = path.extname(file).toLowerCase();
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          fileList.push(filePath);
        }
      }
    }
    
    return fileList;
  };
  
  // Tìm các import trong file
  const findImportsInFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = [];
    
    // Tìm import statements trong JS/TS/JSX/TSX
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Tìm require statements
    const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  };
  
  // Chuyển đổi import path thành file path thực tế
  const resolveImportPath = (importPath, currentFilePath) => {
    // Bỏ qua package imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    // Xử lý các alias phổ biến
    if (importPath.startsWith('@/')) {
      importPath = importPath.replace('@/', '/src/');
    }
    
    // Chuyển đổi đường dẫn tương đối thành tuyệt đối
    let absolutePath;
    if (importPath.startsWith('/')) {
      absolutePath = path.join(projectRoot, importPath);
    } else {
      absolutePath = path.join(path.dirname(currentFilePath), importPath);
    }
    
    // Kiểm tra file với extensions khác nhau
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    
    // Nếu import path không có extension, thử các extension phổ biến
    if (!path.extname(absolutePath)) {
      for (const ext of extensions) {
        const pathWithExt = absolutePath + ext;
        if (fs.existsSync(pathWithExt)) {
          return pathWithExt;
        }
      }
      
      // Kiểm tra xem đây có phải là thư mục chứa index file
      for (const ext of extensions) {
        const indexPath = path.join(absolutePath, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    } else if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    
    return null;
  };
  
  // Lấy tất cả file
  const srcPath = path.join(projectRoot, 'src');
  const allFiles = getAllSourceFiles(srcPath);
  
  // Đánh dấu các file entry point luôn là "đã sử dụng"
  const entryPoints = [
    path.join(projectRoot, 'src', 'index.js'),
    path.join(projectRoot, 'src', 'index.jsx'),
    path.join(projectRoot, 'src', 'index.ts'),
    path.join(projectRoot, 'src', 'index.tsx'),
    path.join(projectRoot, 'src', 'App.js'),
    path.join(projectRoot, 'src', 'App.jsx'),
    path.join(projectRoot, 'src', 'App.ts'),
    path.join(projectRoot, 'src', 'App.tsx'),
    path.join(projectRoot, 'src', 'main.js'),
    path.join(projectRoot, 'src', 'main.jsx'),
    path.join(projectRoot, 'src', 'main.ts'),
    path.join(projectRoot, 'src', 'main.tsx')
  ];
  
  // Tạo map để theo dõi file đã sử dụng
  const usedFiles = new Map();
  
  // Đánh dấu entry points
  entryPoints.forEach(entryPoint => {
    if (fs.existsSync(entryPoint)) {
      usedFiles.set(entryPoint, true);
    }
  });
  
  // Hàm kiểm tra file đã được sử dụng, đệ quy
  const checkUsed = (filePath) => {
    if (usedFiles.has(filePath)) {
      return;
    }
    
    // Đánh dấu file hiện tại đã được sử dụng
    usedFiles.set(filePath, true);
    
    // Phân tích imports của file này
    const imports = findImportsInFile(filePath);
    
    // Kiểm tra các file được import
    imports.forEach(importPath => {
      const resolvedPath = resolveImportPath(importPath, filePath);
      if (resolvedPath && !usedFiles.has(resolvedPath)) {
        checkUsed(resolvedPath);
      }
    });
  };
  
  entryPoints.forEach(entryPoint => {
    if (fs.existsSync(entryPoint)) {
      checkUsed(entryPoint);
    }
  });
  
  // Tìm các file không được sử dụng
  const unusedFiles = allFiles.filter(file => !usedFiles.has(file));
  
  console.log(`Tìm thấy ${unusedFiles.length} file không được sử dụng trong tổng số ${allFiles.length} file.`);
  
  if (unusedFiles.length > 0) {
    console.log('\nDanh sách file không được sử dụng:');
    unusedFiles.forEach(file => {
      // Hiển thị đường dẫn tương đối từ thư mục gốc dự án
      const relativePath = path.relative(projectRoot, file);
      console.log(`- ${relativePath}`);
    });
    
    // Lưu danh sách file không sử dụng
    const unusedFilesListPath = path.join(projectRoot, 'unused-files.txt');
    fs.writeFileSync(
      unusedFilesListPath, 
      unusedFiles.map(file => path.relative(projectRoot, file)).join('\n')
    );
    
    // Thêm phân tích kích thước file
    analyzeFileSize(unusedFiles);
  } else {
    console.log('Không có file không sử dụng nào được tìm thấy.');
  }
};

// Thêm hàm phân tích kích thước file để xác định các file lớn
const analyzeFileSize = (files) => {
  console.log('\nPhân tích kích thước file:');
  
  const fileSizes = files.map(file => {
    const stats = fs.statSync(file);
    return {
      file: path.relative(projectRoot, file),
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024 * 100) / 100
    };
  });
  
  // Sắp xếp theo kích thước từ lớn đến nhỏ
  fileSizes.sort((a, b) => b.size - a.size);
  
  // Hiển thị 10 file lớn nhất
  console.log('\nTop 10 file không sử dụng lớn nhất:');
  fileSizes.slice(0, 10).forEach(({file, sizeKB}, index) => {
    console.log(`${index + 1}. ${file} - ${sizeKB} KB`);
  });
  
  // Tổng kích thước
  const totalSize = fileSizes.reduce((sum, {size}) => sum + size, 0);
  console.log(`\nTổng kích thước file không sử dụng: ${Math.round(totalSize / 1024 / 1024 * 100) / 100} MB`);
};

// Thêm chức năng xóa file không sử dụng vào quy trình dọn dẹp
const cleanupAndFindUnused = () => {
  console.log('Bắt đầu quá trình dọn dẹp các file tạm...');
  cleanupProject(projectRoot);
  console.log('Hoàn tất quá trình dọn dẹp file tạm!');
  
  console.log('\nBắt đầu tìm kiếm file không sử dụng...');
  findUnusedFiles();
};

// Chạy chức năng dọn dẹp và tìm file không sử dụng
cleanupAndFindUnused();
