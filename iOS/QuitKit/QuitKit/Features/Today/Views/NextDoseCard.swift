//
//  NextDoseCard.swift
//  QuitKit
//

import SwiftUI

struct NextDoseCard: View {
    let state: AppStateResponse
    let takenToday: Int
    let isBusy: Bool
    let onTakeDose: () async -> Void

    private var actionTitle: String {
        if state.mode == .beforeCourse {
            return "Курс ещё не начался"
        }
        return state.nextDose == nil ? "Сегодня всё" : "Принял"
    }

    private var actionHint: String {
        state.nextDose == nil ? "Следующий слот появится позже" : "Проведи вправо, чтобы отметить приём"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            NextDoseHeader(state: state, takenToday: takenToday)
            CountdownPanel(nextDose: state.nextDose)
            DoseProgressStrip(total: state.todaySchedule.count, taken: takenToday)

            SlideToConfirmActionButton(
                title: actionTitle,
                subtitle: actionHint,
                systemImage: "checkmark",
                tint: QuitKitTheme.mint,
                disabled: state.nextDose == nil || state.mode == .beforeCourse || isBusy,
                action: onTakeDose
            )
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
