//
//  TodayViewModel.swift
//  QuitKit
//

import Foundation
import Observation

@MainActor
@Observable
final class TodayViewModel {
    var state: AppStateResponse?
    var isLoading = false
    var isBusy = false
    var errorMessage: String?
    var undoToast: UndoToast?
    var feedbackEvent: FeedbackEvent?
    var doseEditor: DoseEditorState?

    private let api: APIClient
    private let notifications: LocalNotificationService
    private var undoTask: Task<Void, Never>?

    init(api: APIClient? = nil, notifications: LocalNotificationService? = nil) {
        self.api = api ?? APIClient()
        self.notifications = notifications ?? LocalNotificationService()
    }

    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            state = try await api.state()
            if let state {
                await notifications.synchronize(with: state)
            }
        } catch {
            errorMessage = error.localizedDescription
            if state == nil {
                triggerFeedback(.warning)
            }
        }

        isLoading = false
    }

    func takeNextDose() async {
        guard let nextDose = state?.nextDose, !isBusy else {
            return
        }

        isBusy = true
        errorMessage = nil

        do {
            let dose = try await api.takeDose(scheduleId: nextDose.id)
            showUndo(.dose(scheduleId: dose.id, text: "Приём отмечен"))
            triggerFeedback(.success)
            await load()
        } catch {
            errorMessage = error.localizedDescription
            triggerFeedback(.warning)
        }

        isBusy = false
    }

    func logSmoke() async {
        guard !isBusy else {
            return
        }

        isBusy = true
        errorMessage = nil

        do {
            let result = try await api.smoke()
            showUndo(.smoke(smokeId: result.smoke.id, text: result.smoke.noticeText))
            triggerFeedback(.success)
            await load()
        } catch {
            errorMessage = error.localizedDescription
            triggerFeedback(.warning)
        }

        isBusy = false
    }

    func undoLast() async {
        guard let undoToast, !isBusy else {
            return
        }

        isBusy = true
        errorMessage = nil

        do {
            switch undoToast {
            case .dose(let scheduleId, _):
                _ = try await api.undoDose(scheduleId: scheduleId)
            case .smoke(let smokeId, _):
                _ = try await api.undoSmoke(smokeId: smokeId)
            }

            self.undoToast = nil
            undoTask?.cancel()
            triggerFeedback(.selection)
            await load()
        } catch {
            errorMessage = error.localizedDescription
            triggerFeedback(.warning)
        }

        isBusy = false
    }

    func openDoseEditor(for dose: DoseView) {
        guard let takenAt = dose.takenAt, let date = QuitKitDateFormatter.date(from: takenAt) else {
            return
        }

        doseEditor = DoseEditorState(dose: dose, takenAt: date)
    }

    func saveEditedDose(_ editor: DoseEditorState) async -> String? {
        guard !isBusy else {
            return "Дождись завершения текущего действия."
        }

        isBusy = true
        doseEditor?.errorMessage = nil

        do {
            _ = try await api.takeDose(scheduleId: editor.dose.id, takenAt: editor.takenAt)
            doseEditor = nil
            triggerFeedback(.success)
            await load()
            isBusy = false
            return nil
        } catch {
            doseEditor?.errorMessage = error.localizedDescription
            triggerFeedback(.warning)
            isBusy = false
            return error.localizedDescription
        }
    }

    func deleteEditedDose(_ editor: DoseEditorState) async -> String? {
        guard !isBusy else {
            return "Дождись завершения текущего действия."
        }

        isBusy = true
        doseEditor?.errorMessage = nil

        do {
            _ = try await api.undoDose(scheduleId: editor.dose.id)
            doseEditor = nil
            triggerFeedback(.selection)
            await load()
            isBusy = false
            return nil
        } catch {
            doseEditor?.errorMessage = error.localizedDescription
            triggerFeedback(.warning)
            isBusy = false
            return error.localizedDescription
        }
    }

    private func showUndo(_ toast: UndoToast) {
        undoTask?.cancel()
        undoToast = toast
        undoTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(5))
            await MainActor.run {
                guard self?.undoToast?.id == toast.id else {
                    return
                }
                self?.undoToast = nil
            }
        }
    }

    func triggerFeedback(_ kind: FeedbackKind) {
        feedbackEvent = FeedbackEvent(kind: kind)
    }
}
