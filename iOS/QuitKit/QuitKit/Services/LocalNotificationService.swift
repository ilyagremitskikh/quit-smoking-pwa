//
//  LocalNotificationService.swift
//  QuitKit
//

import Foundation
import UserNotifications

struct LocalNotificationService {
    private static let dosePrefix = "quitkit-dose-"
    private let center = UNUserNotificationCenter.current()

    func authorizationStatus() async -> UNAuthorizationStatus {
        await notificationSettings().authorizationStatus
    }

    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                continuation.resume(returning: granted)
            }
        }
    }

    func synchronize(with state: AppStateResponse) async {
        await removePendingDoseNotifications()

        guard state.settings.remindersAreEnabled else {
            return
        }

        let status = await authorizationStatus()
        guard status == .authorized || status == .provisional || status == .ephemeral else {
            return
        }

        for dose in state.todaySchedule where dose.status == .pending || (dose.status == .late && dose.takenAt == nil) {
            await scheduleNotification(for: dose)
        }
    }

    private func scheduleNotification(for dose: DoseView) async {
        guard let date = QuitKitDateFormatter.date(from: dose.effectiveTime), date > Date() else {
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "QuitKit"
        content.body = "Пора к следующему приёму. Спокойно, без спешки."
        content.sound = .default
        content.badge = 1

        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(
            identifier: "\(Self.dosePrefix)\(dose.id)",
            content: content,
            trigger: trigger
        )

        try? await add(request)
    }

    private func removePendingDoseNotifications() async {
        let requests = await pendingNotificationRequests()
        let identifiers = requests
            .map(\.identifier)
            .filter { $0.hasPrefix(Self.dosePrefix) }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    private func notificationSettings() async -> UNNotificationSettings {
        await withCheckedContinuation { continuation in
            center.getNotificationSettings { settings in
                continuation.resume(returning: settings)
            }
        }
    }

    private func pendingNotificationRequests() async -> [UNNotificationRequest] {
        await withCheckedContinuation { continuation in
            center.getPendingNotificationRequests { requests in
                continuation.resume(returning: requests)
            }
        }
    }

    private func add(_ request: UNNotificationRequest) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            center.add(request) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
            }
        }
    }
}
