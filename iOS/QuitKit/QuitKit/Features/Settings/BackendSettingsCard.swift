//
//  BackendSettingsCard.swift
//  QuitKit
//

import SwiftUI

struct BackendSettingsCard: View {
    @Binding var backendURL: String

    let status: String
    let isConnected: Bool
    let onSaveURL: () -> Void
    let onCheck: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            HStack {
                Label("Backend", systemImage: "server.rack")
                    .font(QuitKitTheme.rounded(.headline, weight: .black))
                Spacer()
                ConnectionBadge(text: isConnected ? "online" : "check", tint: isConnected ? QuitKitTheme.mint : QuitKitTheme.amber)
            }
            .foregroundStyle(QuitKitTheme.ink)

            TextField("Backend URL", text: $backendURL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .textFieldStyle(.roundedBorder)
                .font(QuitKitTheme.rounded(.body, weight: .semibold))
                .accessibilityHint("Для реального iPhone укажи IP Mac в локальной сети.")

            Text(status)
                .font(QuitKitTheme.rounded(.callout, weight: .bold))
                .foregroundStyle(isConnected ? QuitKitTheme.mint : QuitKitTheme.muted)
                .textSelection(.enabled)

            HStack {
                Button("Сохранить URL", systemImage: "tray.and.arrow.down", action: onSaveURL)
                Button("Проверить", systemImage: "bolt.heart", action: onCheck)
            }
            .font(QuitKitTheme.rounded(.callout, weight: .black))
            .buttonStyle(.bordered)
            .tint(QuitKitTheme.mint)
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
