//
//  TodayView.swift
//  QuitKit
//

import SwiftUI

struct TodayView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var viewModel = TodayViewModel()

    let quoteText: String

    var body: some View {
        ZStack(alignment: .bottom) {
            TodayBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
                    TodayHeader()
                    TodayStateContent(
                        state: viewModel.state,
                        quoteText: quoteText,
                        isLoading: viewModel.isLoading,
                        isBusy: viewModel.isBusy,
                        errorMessage: viewModel.errorMessage,
                        onLoad: {
                            await viewModel.load()
                        },
                        onTakeDose: {
                            await viewModel.takeNextDose()
                        },
                        onSmoke: {
                            await viewModel.logSmoke()
                        },
                        onEditDose: { dose in
                            viewModel.openDoseEditor(for: dose)
                        },
                        onPressStart: {
                            viewModel.triggerFeedback(.selection)
                        },
                        onFeedback: { kind in
                            viewModel.triggerFeedback(kind)
                        }
                    )
                }
                .padding(.horizontal, QuitKitTheme.Spacing.screen)
                .padding(.top, QuitKitTheme.Spacing.card)
                .padding(.bottom, 130)
            }
            .refreshable {
                await viewModel.load()
            }

            if let toast = viewModel.undoToast {
                UndoToastView(toast: toast) {
                    Task {
                        await viewModel.undoLast()
                    }
                }
                .padding(.horizontal, QuitKitTheme.Spacing.screen)
                .padding(.bottom, QuitKitTheme.Spacing.section)
                .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
            }
        }
        .task {
            await viewModel.load()
        }
        .animation(reduceMotion ? nil : QuitKitTheme.Motion.standard, value: viewModel.undoToast)
        .animation(reduceMotion ? nil : QuitKitTheme.Motion.standard, value: viewModel.state?.nextDose?.id)
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
        .sheet(item: $viewModel.doseEditor) { editor in
            DoseEditorSheet(
                editor: editor,
                isBusy: viewModel.isBusy,
                onSave: { updatedEditor in
                    await viewModel.saveEditedDose(updatedEditor)
                },
                onDelete: { updatedEditor in
                    await viewModel.deleteEditedDose(updatedEditor)
                }
            )
        }
    }
}

#Preview {
    TodayView(quoteText: LocalQuoteStore.randomQuote())
}
