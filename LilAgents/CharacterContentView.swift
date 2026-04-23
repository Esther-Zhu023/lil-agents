import AppKit

class KeyableWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

class CharacterContentView: NSView {
    weak var character: WalkerCharacter?

    // Hit-test cache: avoid expensive CGWindowListCreateImage on every mouse move
    private var lastHitTestResult: NSView?
    private var lastHitTestTime: Double = 0
    private static let hitTestCacheDuration: Double = 0.05 // 50ms

    override func hitTest(_ point: NSPoint) -> NSView? {
        let now = CACurrentMediaTime()
        if now - lastHitTestTime < Self.hitTestCacheDuration {
            return lastHitTestResult
        }
        lastHitTestTime = now

        let localPoint = convert(point, from: superview)
        guard bounds.contains(localPoint) else {
            lastHitTestResult = nil
            return nil
        }

        // AVPlayerLayer is GPU-rendered so layer.render(in:) won't capture video pixels.
        // Use CGWindowListCreateImage to sample actual on-screen alpha at click point.
        let screenPoint = window?.convertPoint(toScreen: convert(localPoint, to: nil)) ?? .zero
        guard let primaryScreen = NSScreen.screens.first else {
            lastHitTestResult = nil
            return nil
        }
        let flippedY = primaryScreen.frame.height - screenPoint.y

        let captureRect = CGRect(x: screenPoint.x - 0.5, y: flippedY - 0.5, width: 1, height: 1)
        guard let windowID = window?.windowNumber, windowID > 0 else {
            lastHitTestResult = nil
            return nil
        }

        if let image = CGWindowListCreateImage(
            captureRect,
            .optionIncludingWindow,
            CGWindowID(windowID),
            [.boundsIgnoreFraming, .bestResolution]
        ) {
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            var pixel: [UInt8] = [0, 0, 0, 0]
            if let ctx = CGContext(
                data: &pixel, width: 1, height: 1,
                bitsPerComponent: 8, bytesPerRow: 4,
                space: colorSpace,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            ) {
                ctx.draw(image, in: CGRect(x: 0, y: 0, width: 1, height: 1))
                if pixel[3] > 30 {
                    lastHitTestResult = self
                    return self
                }
                lastHitTestResult = nil
                return nil
            }
        }

        // Fallback: accept click if within center 60% of the view
        let insetX = bounds.width * 0.2
        let insetY = bounds.height * 0.15
        let hitRect = bounds.insetBy(dx: insetX, dy: insetY)
        let result = hitRect.contains(localPoint) ? self : nil
        lastHitTestResult = result
        return result
    }

    override func mouseDown(with event: NSEvent) {
        character?.handleClick()
    }
}
