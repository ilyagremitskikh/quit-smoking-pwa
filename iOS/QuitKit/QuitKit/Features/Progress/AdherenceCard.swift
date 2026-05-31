//
//  AdherenceCard.swift
//  QuitKit
//

import SwiftUI

struct AdherenceCard: View {
    let adherence: ProgressAdherence

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            HStack {
                Label("Ритм приёма", systemImage: "checkmark.seal.fill")
                    .font(QuitKitTheme.rounded(.headline, weight: .black))
                Spacer()
                Text("\(adherence.percent)%")
                    .font(QuitKitTheme.numeric(.title2, weight: .black))
                    .monospacedDigit()
            }
            .foregroundStyle(QuitKitTheme.ink)

            ProgressView(value: Double(adherence.percent), total: 100)
                .tint(QuitKitTheme.mint)
                .accessibilityLabel("Соблюдение курса \(adherence.percent) процентов")

            HStack(spacing: QuitKitTheme.Spacing.compact) {
                MetricPill(label: "Принято", value: "\(adherence.taken)", suffix: "")
                MetricPill(label: "Поздно", value: "\(adherence.late)", suffix: "")
                MetricPill(label: "Пропуск", value: "\(adherence.skipped)", suffix: "")
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
