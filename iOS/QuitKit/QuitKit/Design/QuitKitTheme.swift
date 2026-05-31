//
//  QuitKitTheme.swift
//  QuitKit
//

import SwiftUI

enum QuitKitTheme {
    enum ColorToken {
        static let backgroundTop = Color(red: 0.94, green: 0.97, blue: 0.95)
        static let backgroundBottom = Color(red: 0.98, green: 0.99, blue: 0.98)
        static let ink = Color(red: 0.05, green: 0.13, blue: 0.10)
        static let muted = Color(red: 0.43, green: 0.50, blue: 0.47)
        static let mint = Color(red: 0.08, green: 0.63, blue: 0.42)
        static let mintSoft = Color(red: 0.86, green: 0.95, blue: 0.90)
        static let amber = Color(red: 0.90, green: 0.55, blue: 0.17)
        static let coral = Color(red: 0.91, green: 0.30, blue: 0.29)
        static let card = Color.white.opacity(0.84)
    }

    enum Spacing {
        static let screen: CGFloat = 20
        static let section: CGFloat = 18
        static let card: CGFloat = 20
        static let compact: CGFloat = 12
    }

    enum Radius {
        static let card: CGFloat = 28
        static let panel: CGFloat = 24
        static let control: CGFloat = 22
        static let pill: CGFloat = 18
    }

    enum Motion {
        static let standard = Animation.snappy(duration: 0.32)
        static let press = Animation.snappy(duration: 0.18)
        static let reset = Animation.snappy(duration: 0.22)
        static let holdDuration = 0.86
    }

    static let backgroundTop = ColorToken.backgroundTop
    static let backgroundBottom = ColorToken.backgroundBottom
    static let ink = ColorToken.ink
    static let muted = ColorToken.muted
    static let mint = ColorToken.mint
    static let mintSoft = ColorToken.mintSoft
    static let amber = ColorToken.amber
    static let coral = ColorToken.coral
    static let card = ColorToken.card

    static func titleFont(_ scale: CGFloat = 1) -> Font {
        .largeTitle.scaled(by: scale).weight(.black)
    }

    static func rounded(_ style: Font.TextStyle, weight: Font.Weight = .regular, scale: CGFloat = 1) -> Font {
        .system(style, design: .rounded).scaled(by: scale).weight(weight)
    }
}
