//
//  TodayStateContent.swift
//  QuitKit
//

import SwiftUI

struct TodayStateContent: View {
    let state: AppStateResponse?
    let isLoading: Bool
    let isBusy: Bool
    let errorMessage: String?
    let onLoad: () async -> Void
    let onTakeDose: () async -> Void
    let onSmoke: () async -> Void
    let onEditDose: (DoseView) -> Void
    let onPressStart: () -> Void
    let onFeedback: (FeedbackKind) -> Void

    var body: some View {
        Group {
            if state?.setupNeeded == true {
                SetupCourseView(onStarted: onLoad, onFeedback: onFeedback)
            } else if let state {
                TodayContent(
                    state: state,
                    isBusy: isBusy,
                    onTakeDose: onTakeDose,
                    onSmoke: onSmoke,
                    onEditDose: onEditDose,
                    onPressStart: onPressStart
                )
            } else if isLoading {
                LoadingCard()
            }

            if let errorMessage {
                ErrorCard(message: errorMessage) {
                    Task {
                        await onLoad()
                    }
                }
            }
        }
    }
}
