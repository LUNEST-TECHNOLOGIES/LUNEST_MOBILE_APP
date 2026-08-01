import AppKit

func createCompositeLogo() {
    let cwd = FileManager.default.currentDirectoryPath
    let bgPath = "\(cwd)/assets/images/android-icon-background.png"
    let splashPath = "\(cwd)/assets/images/splash-icon.png"

    guard let bgImage = NSImage(contentsOfFile: bgPath),
          let splashImage = NSImage(contentsOfFile: splashPath) else {
        print("Error: Could not load background or splash icon")
        exit(1)
    }

    let targetSize = NSSize(width: 1024, height: 1024)
    let compositeImage = NSImage(size: targetSize)

    compositeImage.lockFocus()

    // 1. Draw background (1024x1024)
    bgImage.draw(in: NSRect(origin: .zero, size: targetSize))

    // 2. Calculate centered foreground splash icon size (e.g. 600x600 inside 1024x1024)
    let iconSize: CGFloat = 620
    let xOffset = (targetSize.width - iconSize) / 2.0
    let yOffset = (targetSize.height - iconSize) / 2.0
    let fgRect = NSRect(x: xOffset, y: yOffset, width: iconSize, height: iconSize)

    // 3. Draw splash icon in center
    splashImage.draw(in: fgRect)

    compositeImage.unlockFocus()

    guard let tiffData = compositeImage.tiffRepresentation,
          let bitmapRep = NSBitmapImageRep(data: tiffData),
          let pngData = bitmapRep.representation(using: .png, properties: [:]) else {
        print("Error: Failed to encode PNG data")
        exit(1)
    }

    // Save master app-logo.png
    let appLogoPath = "\(cwd)/assets/images/app-logo.png"
    let iconPath = "\(cwd)/assets/images/icon.png"
    let androidFgPath = "\(cwd)/assets/images/android-icon-foreground.png"

    try? pngData.write(to: URL(fileURLWithPath: appLogoPath))
    try? pngData.write(to: URL(fileURLWithPath: iconPath))
    try? pngData.write(to: URL(fileURLWithPath: androidFgPath))

    print("✅ Created master composite app-logo.png, icon.png, and android-icon-foreground.png successfully!")
}

createCompositeLogo()
