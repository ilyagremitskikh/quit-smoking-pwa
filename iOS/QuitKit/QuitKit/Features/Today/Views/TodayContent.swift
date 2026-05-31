//
//  TodayContent.swift
//  QuitKit
//

import SwiftUI

struct TodayContent: View {
    let state: AppStateResponse
    let isBusy: Bool
    let onTakeDose: () async -> Void
    let onSmoke: () async -> Void
    let onEditDose: (DoseView) -> Void
    let onPressStart: () -> Void

    private var takenToday: Int {
        state.todaySchedule.filter { dose in
            dose.status == .taken || (dose.status == .late && dose.takenAt != nil)
        }.count
    }

    var body: some View {
        VStack(spacing: QuitKitTheme.Spacing.section) {
            HeroSummaryCard(state: state)
            NextDoseCard(
                state: state,
                takenToday: takenToday,
                isBusy: isBusy,
                onTakeDose: onTakeDose,
                onPressStart: onPressStart
            )

            if !state.todaySchedule.isEmpty {
                DoseListCard(doses: state.todaySchedule, onEditDose: onEditDose)
            }

            if let quote = state.quote {
                QuoteCard(quote: quote)
            }

            PressAndHoldActionButton(
                title: "Покурил",
                subtitle: "Удержи, чтобы записать без самобичевания",
                systemImage: "smoke",
                tint: QuitKitTheme.amber,
                disabled: isBusy,
                onPressStart: onPressStart,
                action: onSmoke
            )
        }
    }
}
