import SwiftUI

// Entry point for standalone app usage.
// To use: create an Xcode project and add this as the @main App,
// or uncomment @main below for swift run.
//
// @main
public struct NineToesApp: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            GameView()
        }
    }
}
