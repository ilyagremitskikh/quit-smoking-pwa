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
            RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
                .fill(tint.gradient)
                .frame(width: max(0, proxy.size.width * progress))
        }
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
    }
}
