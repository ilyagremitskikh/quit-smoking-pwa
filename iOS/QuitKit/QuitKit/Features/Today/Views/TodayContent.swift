//
//  TodayContent.swift
//  QuitKit
//

import SwiftUI

struct TodayContent: View {
    let state: AppStateResponse
    let quoteText: String
    let isBusy: Bool
    let onTakeDose: () async -> Void
    let onSmoke: () async -> Void
    let onEditDose: (DoseView) -> Void

    private var takenToday: Int {
        state.todaySchedule.filter { dose in
            dose.status == .taken || (dose.status == .late && dose.takenAt != nil)
        }.count
    }

    var body: some View {
        VStack(spacing: QuitKitTheme.Spacing.section) {
            HeroSummaryCard(state: state, quoteText: quoteText)
            NextDoseCard(
                state: state,
                takenToday: takenToday,
                isBusy: isBusy,
                onTakeDose: onTakeDose
            )

            if !state.todaySchedule.isEmpty {
                DoseListCard(doses: state.todaySchedule, onEditDose: onEditDose)
            }

            PressAndHoldActionButton(
                title: "Покурил",
                subtitle: "Удержи, чтобы записать без самобичевания",
                systemImage: "smoke",
                tint: QuitKitTheme.amber,
                disabled: isBusy,
                action: onSmoke
            )
        }
    }
}
