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

            ViewThatFits(in: .horizontal) {
                HStack(spacing: QuitKitTheme.Spacing.compact) {
                    backendButton("Сохранить URL", systemImage: "tray.and.arrow.down", action: onSaveURL)
                    backendButton("Проверить", systemImage: "bolt.heart", action: onCheck)
                }

                VStack(spacing: QuitKitTheme.Spacing.compact) {
                    backendButton("Сохранить URL", systemImage: "tray.and.arrow.down", action: onSaveURL)
                    backendButton("Проверить", systemImage: "bolt.heart", action: onCheck)
                }
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }

    private func backendButton(_ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(QuitKitTheme.Typography.body(.callout, weight: .black))
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 52)
                .padding(.horizontal, QuitKitTheme.Spacing.compact)
                .foregroundStyle(QuitKitTheme.mint)
                .background(QuitKitTheme.mintSoft.opacity(0.92))
                .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}
