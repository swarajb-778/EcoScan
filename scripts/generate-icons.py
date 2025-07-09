#!/usr/bin/env python3
"""
PWA Icon Generator for EcoScan
Generates PNG icons from SVG favicon for PWA manifest
"""

import os
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        subprocess.run(['convert', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ ImageMagick not found. Please install ImageMagick:")
        print("  macOS: brew install imagemagick")
        print("  Ubuntu: sudo apt-get install imagemagick")
        print("  Windows: Download from https://imagemagick.org/script/download.php")
        return False

def generate_icon(svg_path, output_path, size, background_color="#ffffff"):
    """Generate a PNG icon from SVG"""
    try:
        cmd = [
            'convert',
            '-background', background_color,
            '-size', f'{size}x{size}',
            svg_path,
            '-resize', f'{size}x{size}',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✅ Generated {output_path} ({size}x{size})")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to generate {output_path}: {e}")
        return False

def generate_maskable_icon(svg_path, output_path, size):
    """Generate a maskable icon with padding"""
    try:
        # Create maskable icon with 20% padding (safe zone)
        padding = int(size * 0.1)  # 10% padding on each side
        icon_size = size - (padding * 2)
        
        cmd = [
            'convert',
            '-size', f'{size}x{size}',
            'xc:#22c55e',  # EcoScan theme color
            '(',
            '-background', 'transparent',
            '-size', f'{icon_size}x{icon_size}',
            svg_path,
            '-resize', f'{icon_size}x{icon_size}',
            ')',
            '-gravity', 'center',
            '-composite',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✅ Generated maskable {output_path} ({size}x{size})")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to generate maskable {output_path}: {e}")
        return False

def main():
    """Main function to generate all required PWA icons"""
    print("🎨 EcoScan PWA Icon Generator")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Set up paths
    project_root = Path(__file__).parent.parent
    svg_path = project_root / "static" / "favicon.svg"
    static_dir = project_root / "static"
    
    if not svg_path.exists():
        print(f"❌ SVG favicon not found at {svg_path}")
        sys.exit(1)
    
    print(f"📁 Input SVG: {svg_path}")
    print(f"📁 Output directory: {static_dir}")
    print()
    
    # Icon sizes and configurations
    icons = [
        # Regular icons
        {"size": 192, "filename": "icon-192.png", "maskable": False},
        {"size": 512, "filename": "icon-512.png", "maskable": False},
        # Maskable icons
        {"size": 192, "filename": "icon-maskable-192.png", "maskable": True},
        {"size": 512, "filename": "icon-maskable-512.png", "maskable": True},
    ]
    
    success_count = 0
    total_count = len(icons)
    
    # Generate each icon
    for icon_config in icons:
        output_path = static_dir / icon_config["filename"]
        
        if icon_config["maskable"]:
            success = generate_maskable_icon(
                str(svg_path), 
                str(output_path), 
                icon_config["size"]
            )
        else:
            success = generate_icon(
                str(svg_path), 
                str(output_path), 
                icon_config["size"],
                background_color="#ffffff"
            )
        
        if success:
            success_count += 1
    
    print()
    print(f"📊 Generation complete: {success_count}/{total_count} icons created")
    
    if success_count == total_count:
        print("✅ All PWA icons generated successfully!")
        print()
        print("📋 Generated files:")
        for icon_config in icons:
            output_path = static_dir / icon_config["filename"]
            if output_path.exists():
                size_kb = output_path.stat().st_size // 1024
                print(f"  • {icon_config['filename']} ({icon_config['size']}x{icon_config['size']}, {size_kb}KB)")
        
        print()
        print("🔗 These icons are referenced in static/manifest.json")
        print("🚀 Your PWA should now install without icon warnings!")
    else:
        print("⚠️  Some icons failed to generate. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 