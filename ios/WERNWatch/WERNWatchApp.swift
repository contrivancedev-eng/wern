import SwiftUI

@main
struct WERNWatchApp: App {
    @StateObject private var walkManager = WalkManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(walkManager)
        }
    }
}
