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
    var errorMessage: String?
    var feedbackEvent: FeedbackEvent?

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
}
