#!/bin/bash

# Script to build and package the Chrome Extension
echo "🚀 Building Tailieu Questions Chrome Extension..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extension directory
EXTENSION_DIR="c:/tailieu/src/chrome-extension"
BUILD_DIR="c:/tailieu/chrome-extension-build"
ARCHIVE_NAME="tailieu-questions-extension.zip"

echo -e "${BLUE}📁 Extension directory: $EXTENSION_DIR${NC}"

# Check if extension directory exists
if [ ! -d "$EXTENSION_DIR" ]; then
    echo -e "${RED}❌ Extension directory not found: $EXTENSION_DIR${NC}"
    exit 1
fi

# Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy files to build directory
echo -e "${BLUE}📋 Copying extension files...${NC}"
cp "$EXTENSION_DIR/manifest.json" "$BUILD_DIR/"
cp "$EXTENSION_DIR/popup.html" "$BUILD_DIR/"
cp "$EXTENSION_DIR/popup.js" "$BUILD_DIR/"
cp "$EXTENSION_DIR/content.js" "$BUILD_DIR/"
cp "$EXTENSION_DIR/styles.css" "$BUILD_DIR/"
cp "$EXTENSION_DIR/README.md" "$BUILD_DIR/"

# Copy icons if they exist
if [ -d "$EXTENSION_DIR/icons" ]; then
    echo -e "${BLUE}🎨 Copying icons...${NC}"
    cp -r "$EXTENSION_DIR/icons" "$BUILD_DIR/"
else
    echo -e "${YELLOW}⚠️  No icons directory found, creating placeholder...${NC}"
    mkdir -p "$BUILD_DIR/icons"
    # Create simple placeholder icons (you can replace these with actual icons)
    echo "Add your icon files here" > "$BUILD_DIR/icons/README.txt"
fi

# Validate manifest.json
echo -e "${BLUE}✅ Validating manifest.json...${NC}"
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not installed, skipping JSON validation${NC}"
else
    if jq . "$BUILD_DIR/manifest.json" > /dev/null; then
        echo -e "${GREEN}✅ manifest.json is valid${NC}"
    else
        echo -e "${RED}❌ manifest.json is invalid${NC}"
        exit 1
    fi
fi

# Create ZIP archive
echo -e "${BLUE}📦 Creating ZIP archive...${NC}"
cd "$BUILD_DIR"
if command -v zip &> /dev/null; then
    zip -r "$ARCHIVE_NAME" .
    echo -e "${GREEN}✅ Extension packaged: $BUILD_DIR/$ARCHIVE_NAME${NC}"
else
    echo -e "${YELLOW}⚠️  zip command not found, skipping archive creation${NC}"
    echo -e "${GREEN}✅ Extension files prepared in: $BUILD_DIR${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo -e "${BLUE}📁 Build location: $BUILD_DIR${NC}"
echo -e "${BLUE}📦 Archive: $BUILD_DIR/$ARCHIVE_NAME${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select: $BUILD_DIR"
echo "4. Or install the ZIP file if your Chrome supports it"
echo ""
echo -e "${GREEN}🚀 Happy testing!${NC}"