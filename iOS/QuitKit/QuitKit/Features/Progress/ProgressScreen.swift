//
//  ProgressScreen.swift
//  QuitKit
//

import SwiftUI

struct ProgressScreen: View {
    @State private var viewModel = ProgressViewModel()

    var body: some View {
        ZStack {
            TodayBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
                    ScreenHeader(title: "Progress", subtitle: "Динамика курса без шума")

                    if let progress = viewModel.progress {
                        ProgressSummaryCard(progress: progress)
                        AdherenceCard(adherence: progress.adherence)
                        CourseTimelineCard(days: progress.days, milestones: progress.milestones)

                        if !progress.smokeEvents.isEmpty {
                            SmokeHistoryCard(events: progress.smokeEvents) { event in
                                viewModel.openSmokeEditor(for: event)
                            }
                        }
                    } else if viewModel.isLoading {
                        LoadingCard()
                    }

                    if let errorMessage = viewModel.errorMessage {
                        ErrorCard(message: errorMessage) {
                            Task {
                                await viewModel.load()
                            }
                        }
                    }
                }
                .padding(.horizontal, QuitKitTheme.Spacing.screen)
                .padding(.top, QuitKitTheme.Spacing.card)
                .padding(.bottom, QuitKitTheme.Spacing.card)
            }
            .refreshable {
                await viewModel.load()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.load()
        }
        .sensoryFeedback(trigger: viewModel.feedbackEvent) { _, event in
            switch event?.kind {
            case .selection:
                return .selection
            case .success:
                return .success
            case .warning:
                return .warning
            case .none:
                return nil
            }
        }
        .sheet(item: $viewModel.smokeEditor) { editor in
            SmokeEditorSheet(
                editor: editor,
                isBusy: viewModel.isBusy,
                onSave: { updatedEditor in
                    await viewModel.saveEditedSmoke(updatedEditor)
                },
                onDelete: { updatedEditor in
                    await viewModel.deleteEditedSmoke(updatedEditor)
                }
            )
        }
    }
}

#Preview {
    ProgressScreen()
}
