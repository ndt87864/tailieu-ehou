#!/usr/bin/env python3
"""
Tạo icon PNG đơn giản cho Chrome Extension
"""

def create_minimal_png(width, height, filename):
    """Tạo file PNG đơn giản với màu xanh"""
    
    # PNG header cho ảnh đơn giản
    png_data = b'\x89PNG\r\n\x1a\n'  # PNG signature
    
    # IHDR chunk - thông tin ảnh
    ihdr = b'\x00\x00\x00\r'  # chunk length (13 bytes)
    ihdr += b'IHDR'  # chunk type
    ihdr += width.to_bytes(4, 'big')  # width
    ihdr += height.to_bytes(4, 'big')  # height  
    ihdr += b'\x08\x02\x00\x00\x00'  # bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
    
    # Tính CRC cho IHDR
    import zlib
    crc = zlib.crc32(ihdr[4:]) & 0xffffffff
    ihdr += crc.to_bytes(4, 'big')
    
    png_data += ihdr
    
    # IDAT chunk - dữ liệu ảnh (màu xanh solid)
    # Tạo dữ liệu RGB đơn giản: màu xanh #667eea
    pixel_data = b''
    for y in range(height):
        pixel_data += b'\x00'  # filter type
        for x in range(width):
            pixel_data += b'\x66\x7e\xea'  # RGB: #667eea
    
    # Nén dữ liệu pixel
    compressed = zlib.compress(pixel_data)
    
    idat = len(compressed).to_bytes(4, 'big')  # chunk length
    idat += b'IDAT'  # chunk type
    idat += compressed  # compressed pixel data
    crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat += crc.to_bytes(4, 'big')
    
    png_data += idat
    
    # IEND chunk
    iend = b'\x00\x00\x00\x00IEND'
    crc = zlib.crc32(b'IEND') & 0xffffffff
    iend += crc.to_bytes(4, 'big')
    
    png_data += iend
    
    # Ghi file
    with open(filename, 'wb') as f:
        f.write(png_data)

def main():
    """Tạo các icon với kích thước khác nhau"""
    try:
        create_minimal_png(16, 16, 'c:/tailieu/src/chrome-extension/icons/icon16.png')
        create_minimal_png(48, 48, 'c:/tailieu/src/chrome-extension/icons/icon48.png')
        create_minimal_png(128, 128, 'c:/tailieu/src/chrome-extension/icons/icon128.png')
        
        print("✅ Đã tạo thành công các file icon PNG!")
        print("- icon16.png (16x16)")
        print("- icon48.png (48x48)")
        print("- icon128.png (128x128)")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    main()