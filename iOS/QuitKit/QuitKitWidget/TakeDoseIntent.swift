//
//  TakeDoseIntent.swift
//  QuitKitWidget
//

import AppIntents
import WidgetKit

struct TakeDoseIntent: AppIntent {
    static let title: LocalizedStringResource = "Принял"
    static let description = IntentDescription("Отметить следующий приём QuitKit.")
    static let openAppWhenRun = false

    func perform() async throws -> some IntentResult {
        do {
            let api = APIClient()
            let state = try await api.state()

            if let nextDose = state.nextDose {
                _ = try await api.takeDose(scheduleId: nextDose.id)
            }
        } catch {
            // Keep the widget lightweight: refresh its offline state instead of opening the app.
        }

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
