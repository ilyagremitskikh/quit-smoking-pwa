//
//  DateFormatting.swift
//  QuitKit
//

import Foundation

enum QuitKitDateFormatter {
    private static let fractionalFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let plainFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "HH:mm"
        return formatter
    }()

    private static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "d MMM"
        return formatter
    }()

    private static let outputFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static func date(from isoString: String) -> Date? {
        fractionalFormatter.date(from: isoString) ?? plainFormatter.date(from: isoString)
    }

    static func time(from isoString: String) -> String {
        guard let date = date(from: isoString) else {
            return "--:--"
        }
        return timeFormatter.string(from: date)
    }

    static func shortDate(from date: Date) -> String {
        shortDateFormatter.string(from: date)
    }

    static func isoString(from date: Date) -> String {
        outputFormatter.string(from: date)
    }

    static func hourMinute(from date: Date) -> String {
        timeFormatter.string(from: date)
    }

    static func secondsUntil(_ isoString: String, from now: Date) -> Int {
        guard let date = date(from: isoString) else {
            return 0
        }
        return max(0, Int(date.timeIntervalSince(now)))
    }

    static func clock(from seconds: Int) -> String {
        let safeSeconds = max(0, seconds)
        let hours = safeSeconds / 3600
        let minutes = (safeSeconds % 3600) / 60
        let seconds = safeSeconds % 60

        if hours > 0 {
            return "\(hours):\(pad(minutes)):\(pad(seconds))"
        }
        return "\(minutes):\(pad(seconds))"
    }

    private static func pad(_ value: Int) -> String {
        String(format: "%02d", value)
    }
}
