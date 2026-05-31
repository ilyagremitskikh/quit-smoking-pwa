//
//  StatusBadge.swift
//  QuitKit
//

import SwiftUI

struct StatusBadge: View {
    let status: DoseStatus

    var body: some View {
        Label(status.title, systemImage: status.systemImage)
            .font(QuitKitTheme.rounded(.caption, weight: .black))
            .labelStyle(.titleAndIcon)
            .foregroundStyle(status.tint)
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(status.tint.opacity(0.12))
            .clipShape(Capsule())
            .accessibilityLabel("Статус: \(status.title)")
    }
}
