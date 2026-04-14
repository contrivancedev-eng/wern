import SwiftUI

struct ContentView: View {
    @EnvironmentObject var manager: WalkManager

    var body: some View {
        TabView {
            WalkingView()
            CausePickerView()
        }
        .tabViewStyle(.carousel)
    }
}

// MARK: - Main Walking View
struct WalkingView: View {
    @EnvironmentObject var manager: WalkManager

    var body: some View {
        GeometryReader { geo in
            let isSmall = geo.size.width < 180
            let ringSize: CGFloat = isSmall ? 120 : 140

            ScrollView {
                VStack(spacing: isSmall ? 8 : 12) {
                    // Progress Ring
                    ZStack {
                        // Track
                        Circle()
                            .stroke(Color.white.opacity(0.08), lineWidth: 8)
                            .frame(width: ringSize, height: ringSize)

                        // Fill
                        Circle()
                            .trim(from: 0, to: manager.progress)
                            .stroke(
                                AngularGradient(
                                    colors: [Color(hex: manager.causeColor), Color(hex: manager.causeColor).opacity(0.5)],
                                    center: .center
                                ),
                                style: StrokeStyle(lineWidth: 8, lineCap: .round)
                            )
                            .rotationEffect(.degrees(-90))
                            .frame(width: ringSize, height: ringSize)
                            .animation(.easeInOut(duration: 0.5), value: manager.progress)

                        // Center Content
                        VStack(spacing: 2) {
                            Text("\(manager.stepCount)")
                                .font(.system(size: isSmall ? 24 : 28, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .contentTransition(.numericText())

                            Text("/ \(formatGoal(manager.dailyGoal))")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.4))

                            if manager.isWalking {
                                Text(manager.formatTime(manager.elapsedTime))
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .foregroundColor(Color(hex: manager.causeColor))
                            }
                        }
                    }

                    // Stats Row
                    HStack(spacing: 0) {
                        StatPill(value: String(format: "%.1f", Double(manager.stepCount) * 0.00075), unit: "km", icon: "figure.walk")
                        StatPill(value: "\(Int(Double(manager.stepCount) * 0.05))", unit: "kcal", icon: "flame.fill")
                        StatPill(value: "\(manager.litties)", unit: "L", icon: "drop.fill")
                    }

                    // Cause Badge
                    HStack(spacing: 4) {
                        Image(systemName: manager.causeIcon)
                            .font(.system(size: 10))
                        Text(manager.causeName)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundColor(Color(hex: manager.causeColor))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(hex: manager.causeColor).opacity(0.15))
                    .clipShape(Capsule())

                    // Start/Stop Button
                    Button(action: {
                        if manager.isWalking {
                            manager.stopWalking()
                        } else {
                            manager.startWalking()
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: manager.isWalking ? "stop.fill" : "figure.walk")
                                .font(.system(size: 13, weight: .semibold))
                            Text(manager.isWalking ? "Stop" : "Start Walk")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            manager.isWalking
                                ? Color.red.opacity(0.8)
                                : Color(hex: manager.causeColor)
                        )
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 4)

                    // Connection Status
                    HStack(spacing: 4) {
                        Circle()
                            .fill(manager.isConnectedToPhone ? Color.green : Color.gray)
                            .frame(width: 5, height: 5)
                        Text(manager.isConnectedToPhone ? "Phone connected" : "Phone disconnected")
                            .font(.system(size: 9))
                            .foregroundColor(.white.opacity(0.3))
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)
                .padding(.bottom, 12)
            }
        }
    }

    func formatGoal(_ goal: Int) -> String {
        if goal >= 1000 { return "\(goal / 1000)K" }
        return "\(goal)"
    }
}

// MARK: - Stat Pill
struct StatPill: View {
    let value: String
    let unit: String
    let icon: String

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.system(size: 9))
                .foregroundColor(.white.opacity(0.35))
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            Text(unit)
                .font(.system(size: 8, weight: .medium))
                .foregroundColor(.white.opacity(0.3))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Cause Picker View
struct CausePickerView: View {
    @EnvironmentObject var manager: WalkManager

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("Select Cause")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                    .padding(.top, 8)

                ForEach(manager.causes, id: \.0) { cause in
                    Button(action: { manager.selectCause(cause.0) }) {
                        HStack(spacing: 10) {
                            Image(systemName: cause.2)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: cause.3))
                                .frame(width: 28, height: 28)
                                .background(Color(hex: cause.3).opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 7))

                            Text(cause.1)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)

                            Spacer()

                            if manager.activeCause == cause.0 {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(Color(hex: cause.3))
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(
                            manager.activeCause == cause.0
                                ? Color(hex: cause.3).opacity(0.1)
                                : Color.white.opacity(0.04)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 6)
            .padding(.bottom, 12)
        }
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
