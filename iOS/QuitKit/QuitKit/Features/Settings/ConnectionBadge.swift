//
//  ConnectionBadge.swift
//  QuitKit
//

import SwiftUI

struct ConnectionBadge: View {
    let text: String
    let tint: Color

    var body: some View {
        Label(text, systemImage: "circle.fill")
            .font(QuitKitTheme.rounded(.caption, weight: .black))
            .foregroundStyle(tint)
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(tint.opacity(0.12))
            .clipShape(Capsule())
            .accessibilityLabel("Статус подключения: \(text)")
    }
}
