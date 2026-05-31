//
//  HeroSummaryCard.swift
//  QuitKit
//

import SwiftUI

struct HeroSummaryCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var auraVisible = false

    let state: AppStateResponse

    private var isBeforeQuit: Bool {
        state.mode == .beforeCourse || (state.mode == .course && (state.currentDay ?? 99) < 5)
    }

    private var title: String {
        if state.mode == .afterCourse {
            return "Курс завершён"
        }
        return isBeforeQuit ? "До полного отказа" : "Без срыва"
    }

    private var value: Int {
        isBeforeQuit ? max(0, 5 - (state.currentDay ?? 0)) : state.benefits.smokeFreeDays
    }

    private var caption: String {
        isBeforeQuit ? dayWord(value, tail: "до 5-го дня") : dayWord(value, tail: "чистой серии")
    }

    private var support: String {
        if isBeforeQuit {
            return "Снижай постепенно. Сегодня достаточно держать курс."
        }
        return state.benefits.nextMilestone?.text ?? state.benefits.currentMilestone?.text ?? "Держим курс, день за днём."
    }

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
                Text(title.uppercased())
                    .font(QuitKitTheme.rounded(.caption, weight: .heavy))
                    .foregroundStyle(QuitKitTheme.mint)

                HStack(alignment: .lastTextBaseline, spacing: QuitKitTheme.Spacing.compact) {
                    Text("\(value)")
                        .font(QuitKitTheme.titleFont(1.5))
                        .monospacedDigit()
                        .foregroundStyle(QuitKitTheme.mint)
                        .contentTransition(.numericText())

                    Text(caption)
                        .font(QuitKitTheme.rounded(.title3, weight: .bold))
                        .foregroundStyle(QuitKitTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Text(support)
                .font(QuitKitTheme.rounded(.body, weight: .semibold))
                .foregroundStyle(QuitKitTheme.ink)
                .lineSpacing(3)
                .padding(QuitKitTheme.Spacing.compact + 4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(QuitKitTheme.mintSoft.opacity(0.78))
                .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))

            HStack(spacing: QuitKitTheme.Spacing.compact) {
                MetricPill(label: "Не выкурено", value: "\(state.benefits.cigarettesAvoided)", suffix: "шт.")
                MetricPill(label: "Сэкономлено", value: "\(state.benefits.moneySaved ?? 0)", suffix: "₽")
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .background(alignment: .topTrailing) {
            Circle()
                .fill(QuitKitTheme.mint.opacity(auraVisible ? 0.18 : 0.08))
                .blur(radius: 28)
                .frame(width: 150, height: 150)
                .offset(x: 46, y: -54)
                .accessibilityHidden(true)
        }
        .calmCard()
        .accessibilityElement(children: .combine)
        .onAppear {
            guard !reduceMotion else {
                auraVisible = true
                return
            }

            withAnimation(.easeInOut(duration: 2.4).repeatForever(autoreverses: true)) {
                auraVisible = true
            }
        }
    }
}
