// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NineToesEngine",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "NineToesEngine",
            targets: ["NineToesEngine"]
        ),
        .executable(
            name: "NineToesApp",
            targets: ["NineToesApp"]
        ),
    ],
    targets: [
        .target(
            name: "NineToesEngine"
        ),
        .executableTarget(
            name: "NineToesApp",
            dependencies: ["NineToesEngine"]
        ),
        .testTarget(
            name: "NineToesEngineTests",
            dependencies: ["NineToesEngine"],
            resources: [
                .copy("Fixtures")
            ]
        ),
    ]
)
