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
    ],
    targets: [
        .target(
            name: "NineToesEngine"
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
