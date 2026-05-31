//
//  NextDoseHeader.swift
//  QuitKit
//

import SwiftUI

struct NextDoseHeader: View {
    let state: AppStateResponse
    let takenToday: Int

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
                Text(state.mode == .beforeCourse ? "До старта" : "День \(state.currentDay ?? 0) из 25")
                    .font(QuitKitTheme.rounded(.headline, weight: .heavy))
                    .foregroundStyle(QuitKitTheme.ink)

                Text(state.currentPhase.map { "Фаза \($0)" } ?? "Курс")
                    .font(QuitKitTheme.rounded(.subheadline, weight: .bold))
                    .foregroundStyle(QuitKitTheme.muted)
            }

            Spacer(minLength: QuitKitTheme.Spacing.compact)

            Text("\(takenToday) / \(max(state.todaySchedule.count, 1))")
                .font(QuitKitTheme.numeric(.callout, weight: .black))
                .monospacedDigit()
                .padding(.horizontal, QuitKitTheme.Spacing.compact)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.72))
                .clipShape(Capsule())
                .accessibilityLabel("Сегодня принято \(takenToday) из \(max(state.todaySchedule.count, 1))")
        }
    }
}
