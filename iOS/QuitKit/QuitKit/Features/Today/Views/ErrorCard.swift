//
//  ErrorCard.swift
//  QuitKit
//

import SwiftUI

struct ErrorCard: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact) {
            Label("Не удалось обновить", systemImage: "exclamationmark.triangle.fill")
                .font(QuitKitTheme.rounded(.body, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            Text(message)
                .font(QuitKitTheme.rounded(.subheadline, weight: .semibold))
                .foregroundStyle(QuitKitTheme.muted)
                .textSelection(.enabled)

            Button("Повторить", systemImage: "arrow.clockwise", action: onRetry)
                .font(QuitKitTheme.rounded(.callout, weight: .black))
                .buttonStyle(.borderedProminent)
                .tint(QuitKitTheme.mint)
        }
        .padding(QuitKitTheme.Spacing.section)
        .calmCard()
    }
}
