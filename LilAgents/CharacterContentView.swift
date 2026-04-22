import AppKit

class KeyableWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

class CharacterContentView: NSView {
    weak var character: WalkerCharacter?

    // Cache hit-test result briefly to avoid expensive CGWindowListCreateImage on every event
    private var lastHitTestResult: NSView? = nil
    private var lastHitTestTime: CFTimeInterval = 0
    private static let hitTestCacheInterval: CFTimeInterval = 0.05  // 50ms cache

    override func hitTest(_ point: NSPoint) -> NSView? {
        let localPoint = convert(point, from: superview)
        guard bounds.contains(localPoint) else { return nil }

        let now = CACurrentMediaTime()
        if now - lastHitTestTime < Self.hitTestCacheInterval {
            if let cached = lastHitTestResult {
                return cached
            }
        }
        lastHitTestTime = now

        // AVPlayerLayer is GPU-rendered so layer.render(in:) won't capture video pixels.
        // Use CGWindowListCreateImage to sample actual on-screen alpha at click point.
        let screenPoint = window?.convertPoint(toScreen: convert(localPoint, to: nil)) ?? .zero
        // Use the full virtual display height for the CG coordinate flip, not just
        // the main screen. NSScreen coordinates have origin at bottom-left of the
        // primary display, while CG uses top-left. The primary screen's height is
        // the correct basis for the flip across all monitors.
        guard let primaryScreen = NSScreen.screens.first else { return nil }
        let flippedY = primaryScreen.frame.height - screenPoint.y

        let captureRect = CGRect(x: screenPoint.x - 0.5, y: flippedY - 0.5, width: 1, height: 1)
        guard let windowID = window?.windowNumber, windowID > 0 else { return nil }

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
