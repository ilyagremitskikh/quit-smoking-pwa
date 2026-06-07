//
//  ProgressViewModel.swift
//  QuitKit
//

import Foundation
import Observation

@MainActor
@Observable
final class ProgressViewModel {
    var progress: ProgressResponse?
    var isLoading = false
    var isBusy = false
    var errorMessage: String?
    var feedbackEvent: FeedbackEvent?
    var smokeEditor: SmokeEditorState?

    private let api: APIClient

    init(api: APIClient? = nil) {
        self.api = api ?? APIClient()
    }

    func load() async {
        isLoading = true
        errorMessage = nil

        do {
            progress = try await api.progress()
        } catch {
            errorMessage = error.localizedDescription
            if progress == nil {
                feedbackEvent = FeedbackEvent(kind: .warning)
            }
        }

        isLoading = false
    }

    func openSmokeEditor(for event: SmokeEvent) {
        guard let loggedAt = QuitKitDateFormatter.date(from: event.loggedAt) else {
            return
        }
        smokeEditor = SmokeEditorState(event: event, loggedAt: loggedAt)
    }

    func saveEditedSmoke(_ editor: SmokeEditorState) async -> String? {
        guard !isBusy else {
            return "Дождись завершения текущего действия."
        }

        isBusy = true
        smokeEditor?.errorMessage = nil

        do {
            _ = try await api.updateSmoke(smokeId: editor.event.id, loggedAt: editor.loggedAt, note: editor.note)
            smokeEditor = nil
            feedbackEvent = FeedbackEvent(kind: .success)
            await load()
            isBusy = false
            return nil
        } catch {
            smokeEditor?.errorMessage = error.localizedDescription
            feedbackEvent = FeedbackEvent(kind: .warning)
            isBusy = false
            return error.localizedDescription
        }
    }

    func deleteEditedSmoke(_ editor: SmokeEditorState) async -> String? {
        guard !isBusy else {
            return "Дождись завершения текущего действия."
        }

        isBusy = true
        smokeEditor?.errorMessage = nil

        do {
            _ = try await api.undoSmoke(smokeId: editor.event.id)
            smokeEditor = nil
            feedbackEvent = FeedbackEvent(kind: .selection)
            await load()
            isBusy = false
            return nil
        } catch {
            smokeEditor?.errorMessage = error.localizedDescription
            feedbackEvent = FeedbackEvent(kind: .warning)
            isBusy = false
            return error.localizedDescription
        }
    }
}
