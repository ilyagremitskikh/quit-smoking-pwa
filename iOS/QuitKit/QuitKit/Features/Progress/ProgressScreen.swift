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
                            SmokeHistoryCard(events: progress.smokeEvents)
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
            event?.kind == .warning ? .warning : nil
        }
    }
}

#Preview {
    ProgressScreen()
}
