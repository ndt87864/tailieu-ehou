#!/usr/bin/env python3
"""
Script tạo icon PNG đơn giản cho Chrome Extension
"""

import base64

# Data cho icon PNG 16x16 màu xanh đơn giản
icon16_data = """
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA
dGAAAHRgBd5ZsEYAAAAkSURBVDjL7dMxEQAACAMwwb8k7o8weCjN4CwgK8AIMAKMACPACDQAeFoIREZh
rwAAAABJRU5ErkJggg==
"""

# Data cho icon PNG 48x48
icon48_data = """
iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA
dGAAAHRgBd5ZsEYAAADcSURBVGjN7dkxDQAACAMwwP8k7o8weCjN4CwgK8AIMAKMACPACDACjAAjwAgw
AowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAj
wAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACj
AAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AImAD+WARF
RNKhwAAAAASUVORK5CYII=
"""

# Data cho icon PNG 128x128
icon128_data = """
iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA
dGAAAHRgBd5ZsEYAAAJtSURBVHja7dkxEQAACAMwwP8k7o8weCjN4CwgK8AIMAKMACPACDACjAAjwAgw
AowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAj
wAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACj
AAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDAi
jAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AIMAKMACPACDACjAAjwAgwAowAI8AImAB7LARFrgAOB
gAAAABJRU5ErkJggg==
"""

def create_icon_files():
    """Tạo các file icon từ base64 data"""
    
    # Tạo icon 16x16
    with open('c:/tailieu/src/chrome-extension/icons/icon16.png', 'wb') as f:
        f.write(base64.b64decode(icon16_data.replace('\n', '')))
    
    # Tạo icon 48x48  
    with open('c:/tailieu/src/chrome-extension/icons/icon48.png', 'wb') as f:
        f.write(base64.b64decode(icon48_data.replace('\n', '')))
    
    # Tạo icon 128x128
    with open('c:/tailieu/src/chrome-extension/icons/icon128.png', 'wb') as f:
        f.write(base64.b64decode(icon128_data.replace('\n', '')))
    
    print("✅ Đã tạo thành công các file icon PNG!")
    print("- icon16.png")
    print("- icon48.png") 
    print("- icon128.png")

if __name__ == "__main__":
    create_icon_files()