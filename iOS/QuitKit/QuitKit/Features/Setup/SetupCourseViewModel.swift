//
//  SetupCourseViewModel.swift
//  QuitKit
//

import Foundation
import Observation

@MainActor
@Observable
final class SetupCourseViewModel {
    var startDate = Date()
    var firstDoseTime = Date()
    var cigarettesPerDay = 20
    var packPrice = 250.0
    var remindersEnabled = true
    var isBusy = false
    var errorMessage: String?

    private let api: APIClient
    private let notifications: LocalNotificationService

    init(api: APIClient? = nil, notifications: LocalNotificationService? = nil) {
        self.api = api ?? APIClient()
        self.notifications = notifications ?? LocalNotificationService()
    }

    func start() async throws {
        isBusy = true
        errorMessage = nil

        do {
            _ = try await api.updateSettings(
                SettingsUpdateRequest(
                    packPrice: packPrice > 0 ? packPrice : nil,
                    remindersEnabled: remindersEnabled,
                    cigarettesPerDay: cigarettesPerDay
                )
            )
            _ = try await api.startCourse(
                StartCourseRequest(
                    startDate: QuitKitDateFormatter.isoString(from: startDate),
                    firstDoseTime: QuitKitDateFormatter.hourMinute(from: firstDoseTime)
                )
            )
            if remindersEnabled {
                _ = await notifications.requestAuthorization()
            }
            isBusy = false
        } catch {
            errorMessage = error.localizedDescription
            isBusy = false
            throw error
        }
    }
}
