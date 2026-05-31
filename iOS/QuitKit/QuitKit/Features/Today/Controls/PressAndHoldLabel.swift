//
//  PressAndHoldLabel.swift
//  QuitKit
//

import SwiftUI

struct PressAndHoldLabel: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let tint: Color
    let disabled: Bool
    let progress: Double

    var body: some View {
        HStack(spacing: QuitKitTheme.Spacing.compact + 2) {
            Image(systemName: systemImage)
                .font(.headline.weight(.black))
                .foregroundStyle(disabled ? QuitKitTheme.muted : (progress > 0.5 ? .white : tint))
                .frame(width: 44, height: 44)
                .background(Color.white.opacity(disabled ? 0.52 : 0.88))
                .clipShape(Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(QuitKitTheme.rounded(.headline, weight: .black))
                    .foregroundStyle(progress > 0.62 ? .white : QuitKitTheme.ink)

                Text(subtitle)
                    .font(QuitKitTheme.rounded(.caption, weight: .bold))
                    .foregroundStyle(progress > 0.62 ? .white.opacity(0.84) : QuitKitTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: QuitKitTheme.Spacing.compact)

            Image(systemName: "touchid")
                .font(.title3.weight(.bold))
                .foregroundStyle(progress > 0.62 ? .white : tint)
                .opacity(disabled ? 0.32 : 1)
                .accessibilityHidden(true)
        }
        .padding(.vertical, 10)
    }
}
