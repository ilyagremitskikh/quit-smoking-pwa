//
//  SettingsViewModel.swift
//  QuitKit
//

import Foundation
import Observation
import WidgetKit
import UserNotifications

@MainActor
@Observable
final class SettingsViewModel {
    var backendURL = AppConfig.apiBaseURLString
    var connectionStatus = "Не проверено"
    var connectionOK = false
    var cigarettesPerDay = 20
    var packPrice = 0.0
    var remindersEnabled = false
    var notificationStatus = "Не проверено"
    var isLoading = false
    var isSaving = false
    var errorMessage: String?
    var feedbackEvent: FeedbackEvent?

    private let api: APIClient
    private let notifications: LocalNotificationService

    init(api: APIClient? = nil, notifications: LocalNotificationService? = nil) {
        self.api = api ?? APIClient()
        self.notifications = notifications ?? LocalNotificationService()
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        backendURL = AppConfig.apiBaseURLString

        do {
            let state = try await api.state()
            apply(settings: state.settings)
            await refreshNotificationStatus()
            await checkConnection()
        } catch {
            errorMessage = error.localizedDescription
            feedbackEvent = FeedbackEvent(kind: .warning)
        }

        isLoading = false
    }

    func checkConnection() async {
        let checkedURL = backendURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: checkedURL), !checkedURL.isEmpty else {
            connectionOK = false
            connectionStatus = "Некорректный Backend URL"
            return
        }

        do {
            let response = try await APIClient(baseURL: url).health()
            connectionOK = response.ok
            connectionStatus = response.ok ? "Backend отвечает\n\(checkedURL)" : "Backend ответил неожиданно\n\(checkedURL)"
        } catch {
            connectionOK = false
            connectionStatus = "\(error.localizedDescription)\n\(checkedURL)"
        }
    }

    func saveBackendURL() async {
        AppConfig.updateAPIBaseURL(backendURL)
        WidgetCenter.shared.reloadAllTimelines()
        feedbackEvent = FeedbackEvent(kind: .selection)
        await checkConnection()
    }

    func saveSettings() async {
        isSaving = true
        errorMessage = nil

        do {
            if remindersEnabled {
                _ = await notifications.requestAuthorization()
            }
            let settings = try await api.updateSettings(
                SettingsUpdateRequest(
                    packPrice: packPrice > 0 ? packPrice : nil,
                    remindersEnabled: remindersEnabled,
                    cigarettesPerDay: cigarettesPerDay
                )
            )
            apply(settings: settings)
            let state = try await api.state()
            await notifications.synchronize(with: state)
            await refreshNotificationStatus()
            feedbackEvent = FeedbackEvent(kind: .success)
        } catch {
            errorMessage = error.localizedDescription
            feedbackEvent = FeedbackEvent(kind: .warning)
        }

        isSaving = false
    }

    private func apply(settings: Settings) {
        cigarettesPerDay = settings.cigarettesPerDay
        packPrice = settings.packPrice ?? 0
        remindersEnabled = settings.remindersAreEnabled
    }

    private func refreshNotificationStatus() async {
        switch await notifications.authorizationStatus() {
        case .authorized:
            notificationStatus = "Разрешены"
        case .provisional:
            notificationStatus = "Тихие уведомления"
        case .denied:
            notificationStatus = "Запрещены в iOS"
        case .notDetermined:
            notificationStatus = "Ещё не запрошены"
        case .ephemeral:
            notificationStatus = "Временно разрешены"
        @unknown default:
            notificationStatus = "Неизвестно"
        }
    }
}
