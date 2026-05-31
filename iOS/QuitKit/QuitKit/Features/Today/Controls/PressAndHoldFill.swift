//
//  PressAndHoldFill.swift
//  QuitKit
//

import SwiftUI

struct PressAndHoldFill: View {
    let progress: Double
    let tint: Color

    var body: some View {
        GeometryReader { proxy in
            let fillWidth = proxy.size.width * min(max(progress, 0), 1)

            Rectangle()
                .fill(tint.gradient)
                .mask(alignment: .leading) {
                    Rectangle()
                        .frame(width: fillWidth)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
                        .strokeBorder(Color.white.opacity(progress > 0 ? 0.18 : 0), lineWidth: 1)
                }
        }
        .allowsHitTesting(false)
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
    }
}
