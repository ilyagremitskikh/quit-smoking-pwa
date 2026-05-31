//
//  ProgressSummaryCard.swift
//  QuitKit
//

import SwiftUI

struct ProgressSummaryCard: View {
    let progress: ProgressResponse

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            Label("Текущая серия", systemImage: "flame.fill")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            HStack(alignment: .lastTextBaseline, spacing: 8) {
                Text("\(progress.streak.currentDays)")
                    .font(QuitKitTheme.numeric(.largeTitle, weight: .black, scale: 1.22))
                    .monospacedDigit()
                Text("дней")
                    .font(QuitKitTheme.rounded(.title3, weight: .black))
            }
            .foregroundStyle(QuitKitTheme.ink)
            .accessibilityElement(children: .combine)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: QuitKitTheme.Spacing.compact) {
                MetricPill(label: "Без дыма", value: "\(progress.benefits.smokeFreeHours)", suffix: "ч")
                MetricPill(label: "Не выкурено", value: "\(progress.benefits.cigarettesAvoided)", suffix: "шт.")
                MetricPill(label: "Сэкономлено", value: "\(Int(progress.benefits.moneySaved ?? 0))", suffix: "₽")
                MetricPill(label: "Рекорд", value: "\(progress.streak.recordDays)", suffix: "дн.")
            }

            if let milestone = progress.benefits.nextMilestone {
                Text(milestone.text)
                    .font(QuitKitTheme.rounded(.callout, weight: .bold))
                    .foregroundStyle(QuitKitTheme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
