//
//  SettingsScreen.swift
//  QuitKit
//

import SwiftUI

struct SettingsScreen: View {
    @State private var viewModel = SettingsViewModel()

    var body: some View {
        ZStack {
            TodayBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
                    ScreenHeader(title: "Settings", subtitle: "Подключение, привычки и напоминания")

                    BackendSettingsCard(
                        backendURL: $viewModel.backendURL,
                        status: viewModel.connectionStatus,
                        isConnected: viewModel.connectionOK,
                        onSaveURL: {
                            Task {
                                await viewModel.saveBackendURL()
                            }
                        },
                        onCheck: {
                            Task {
                                await viewModel.checkConnection()
                            }
                        }
                    )

                    CourseSettingsCard(
                        cigarettesPerDay: $viewModel.cigarettesPerDay,
                        packPrice: $viewModel.packPrice,
                        remindersEnabled: $viewModel.remindersEnabled,
                        notificationStatus: viewModel.notificationStatus,
                        isSaving: viewModel.isSaving,
                        onSave: {
                            Task {
                                await viewModel.saveSettings()
                            }
                        }
                    )

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
            case .success:
                return .success
            case .warning:
                return .warning
            case .selection:
                return .selection
            case .none:
                return nil
            }
        }
    }
}

#Preview {
    SettingsScreen()
}
