import Foundation
import CoreMotion
import HealthKit
import WatchConnectivity

class WalkManager: NSObject, ObservableObject, WCSessionDelegate {
    // MARK: - Published State
    @Published var isWalking = false
    @Published var stepCount: Int = 0
    @Published var dailyGoal: Int = 10000
    @Published var activeCause: Int = 1
    @Published var calories: Double = 0
    @Published var distance: Double = 0
    @Published var litties: Int = 0
    @Published var heartRate: Double = 0
    @Published var elapsedTime: TimeInterval = 0
    @Published var isConnectedToPhone = false

    // MARK: - Causes
    let causes = [
        (1, "Forest", "leaf.fill", "#22C55E"),
        (2, "Water", "drop.fill", "#0E7490"),
        (3, "Food", "fork.knife", "#F59E0B"),
        (4, "Women", "heart.fill", "#EC4899"),
        (5, "Kids", "figure.walk", "#003B4C")
    ]

    var causeName: String {
        causes.first(where: { $0.0 == activeCause })?.1 ?? "Forest"
    }

    var causeIcon: String {
        causes.first(where: { $0.0 == activeCause })?.2 ?? "leaf.fill"
    }

    var causeColor: String {
        causes.first(where: { $0.0 == activeCause })?.3 ?? "#22C55E"
    }

    var progress: Double {
        guard dailyGoal > 0 else { return 0 }
        return min(Double(stepCount) / Double(dailyGoal), 1.0)
    }

    // MARK: - Private
    private let pedometer = CMPedometer()
    private let healthStore = HKHealthStore()
    private var walkStartDate: Date?
    private var timer: Timer?
    private var sessionStartSteps: Int = 0

    override init() {
        super.init()
        setupWatchConnectivity()
        loadSavedState()
        startDailyPedometer()
    }

    // MARK: - WatchConnectivity
    private func setupWatchConnectivity() {
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isConnectedToPhone = activationState == .activated
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            if let goal = message["dailyGoal"] as? Int { self.dailyGoal = goal }
            if let cause = message["activeCause"] as? Int { self.activeCause = cause }
            if let walking = message["isWalking"] as? Bool { self.isWalking = walking }
            if let steps = message["stepCount"] as? Int { self.stepCount = max(self.stepCount, steps) }
            if let lit = message["litties"] as? Int { self.litties = lit }
        }
    }

    // Send data to phone
    private func syncToPhone() {
        guard WCSession.default.isReachable else { return }
        let data: [String: Any] = [
            "stepCount": stepCount,
            "isWalking": isWalking,
            "activeCause": activeCause,
            "source": "watch",
            "heartRate": heartRate
        ]
        WCSession.default.sendMessage(data, replyHandler: nil, errorHandler: nil)
    }

    // MARK: - Pedometer
    private func startDailyPedometer() {
        guard CMPedometer.isStepCountingAvailable() else { return }
        let startOfDay = Calendar.current.startOfDay(for: Date())
        pedometer.queryPedometerData(from: startOfDay, to: Date()) { [weak self] data, _ in
            DispatchQueue.main.async {
                if let steps = data?.numberOfSteps.intValue {
                    self?.stepCount = steps
                    self?.distance = data?.distance?.doubleValue ?? 0
                }
            }
        }
    }

    // MARK: - Walking Session
    func startWalking() {
        isWalking = true
        walkStartDate = Date()
        sessionStartSteps = stepCount
        elapsedTime = 0

        pedometer.startUpdates(from: Date()) { [weak self] data, _ in
            DispatchQueue.main.async {
                guard let self = self, let data = data else { return }
                self.stepCount = self.sessionStartSteps + data.numberOfSteps.intValue
                self.distance = data.distance?.doubleValue ?? 0
                self.calories = Double(self.stepCount) * 0.05
                self.litties = self.stepCount / 100
            }
        }

        // Timer for elapsed time and sync
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self = self, let start = self.walkStartDate else { return }
            self.elapsedTime = Date().timeIntervalSince(start)
            // Sync to phone every 5 seconds
            if Int(self.elapsedTime) % 5 == 0 { self.syncToPhone() }
        }

        syncToPhone()
        saveState()
    }

    func stopWalking() {
        isWalking = false
        pedometer.stopUpdates()
        timer?.invalidate()
        timer = nil
        syncToPhone()
        saveState()
    }

    func selectCause(_ id: Int) {
        activeCause = id
        saveState()
    }

    // MARK: - Persistence
    private func saveState() {
        UserDefaults.standard.set(isWalking, forKey: "wern_isWalking")
        UserDefaults.standard.set(stepCount, forKey: "wern_stepCount")
        UserDefaults.standard.set(activeCause, forKey: "wern_activeCause")
        UserDefaults.standard.set(dailyGoal, forKey: "wern_dailyGoal")
    }

    private func loadSavedState() {
        activeCause = UserDefaults.standard.integer(forKey: "wern_activeCause")
        if activeCause == 0 { activeCause = 1 }
        dailyGoal = UserDefaults.standard.integer(forKey: "wern_dailyGoal")
        if dailyGoal == 0 { dailyGoal = 10000 }
    }

    // MARK: - Helpers
    func formatTime(_ interval: TimeInterval) -> String {
        let h = Int(interval) / 3600
        let m = (Int(interval) % 3600) / 60
        let s = Int(interval) % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }
}
