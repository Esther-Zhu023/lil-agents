import Foundation

/// Lil Agents wrapper that bridges Claude Code's stream-json protocol to Hermes CLI.
/// Uses a Python helper script that converts Hermes TTY output to JSON流.
class HermesSession: AgentSession {
    private var process: Process?
    private var inputPipe: Pipe?
    private var lineBuffer = ""
    private var currentResponseText = ""
    private var pendingMessages: [String] = []
    private(set) var isRunning = false
    private(set) var isBusy = false

    var onText: ((String) -> Void)?
    var onError: ((String) -> Void)?
    var onToolUse: ((String, [String: Any]) -> Void)?
    var onToolResult: ((String, Bool) -> Void)?
    var onSessionReady: (() -> Void)?
    var onTurnComplete: (() -> Void)?
    var onProcessExit: (() -> Void)?

    var history: [AgentMessage] = []

    private static let pythonWrapper: String? = {
        let paths = [
            FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".local/bin/hermes-json-wrapper.py").path,
            "/tmp/hermes-json-wrapper.py"
        ]
        return paths.first { FileManager.default.fileExists(atPath: $0) }
    }()

    // MARK: - Lifecycle

    func start() {
        // Hermes doesn't need a persistent process — each message is a new invocation.
        // We simulate a persistent session by holding a reference, but actually
        // launch a Python wrapper per message. Mark ready immediately.
        isRunning = true
        onSessionReady?()
        let pending = pendingMessages
        pendingMessages = []
        for msg in pending {
            sendInternal(message: msg)
        }
    }

    func send(message: String) {
        guard isRunning else {
            pendingMessages.append(message)
            return
        }
        sendInternal(message: message)
    }

    private func sendInternal(message: String) {
        isBusy = true
        currentResponseText = ""
        history.append(AgentMessage(role: .user, text: message))

        guard let wrapper = Self.pythonWrapper else {
            let msg = "Hermes wrapper not found.\n\nRun this to install:\n  cp /tmp/hermes-json-wrapper.py ~/.local/bin/hermes-json-wrapper.py\n  chmod +x ~/.local/bin/hermes-json-wrapper.py"
            onError?(msg)
            history.append(AgentMessage(role: .error, text: msg))
            isBusy = false
            onTurnComplete?()
            return
        }

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        proc.arguments = [wrapper, message]
        proc.currentDirectoryURL = FileManager.default.homeDirectoryForCurrentUser
        proc.environment = ProcessInfo.processInfo.environment

        let outPipe = Pipe()
        let errPipe = Pipe()
        proc.standardOutput = outPipe
        proc.standardError = errPipe

        proc.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async {
                self?.isBusy = false
                self?.onTurnComplete?()
            }
        }

        outPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            if let text = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async {
                    self?.processOutput(text)
                }
            }
        }

        errPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            if let text = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async {
                    self?.onError?(text)
                }
            }
        }

        do {
            try proc.run()
            process = proc
            inputPipe = outPipe
        } catch {
            let msg = "Failed to launch Hermes wrapper: \(error.localizedDescription)"
            onError?(msg)
            history.append(AgentMessage(role: .error, text: msg))
            isBusy = false
            onTurnComplete?()
        }
    }

    func terminate() {
        outPipe?.fileHandleForReading.readabilityHandler = nil
        errPipe?.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        inputPipe = nil
        isRunning = false
        isBusy = false
        pendingMessages.removeAll()
    }

    // MARK: - NDJSON Parsing

    private var outPipe: Pipe? { inputPipe }
    private var errPipe: Pipe?

    private func processOutput(_ text: String) {
        lineBuffer += text
        while let newlineRange = lineBuffer.range(of: "\n") {
            let line = String(lineBuffer[lineBuffer.startIndex..<newlineRange.lowerBound])
            lineBuffer = String(lineBuffer[newlineRange.upperBound...])
            if !line.isEmpty {
                parseLine(line)
            }
        }
    }

    private func parseLine(_ line: String) {
        guard let data = line.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

        let type = json["type"] as? String ?? ""

        switch type {
        case "system":
            // Subtype init already handled in start()
            break

        case "assistant":
            if let message = json["message"] as? [String: Any],
               let content = message["content"] as? [[String: Any]] {
                for block in content {
                    if block["type"] as? String == "text", let text = block["text"] as? String {
                        currentResponseText += text
                        onText?(text)
                    }
                }
            }

        case "result":
            isBusy = false
            let result = json["result"] as? String ?? ""
            if !result.isEmpty {
                history.append(AgentMessage(role: .assistant, text: result))
            }
            currentResponseText = ""

        case "error":
            isBusy = false
            let msg = json["message"] as? String ?? "Unknown error"
            history.append(AgentMessage(role: .error, text: msg))
            onError?(msg)

        default:
            break
        }
    }
}
