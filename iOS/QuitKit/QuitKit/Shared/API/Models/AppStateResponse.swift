//
//  AppStateResponse.swift
//  QuitKit
//

import Foundation

struct HealthResponse: Decodable {
    let ok: Bool
}

struct AppStateResponse: Decodable {
    let setupNeeded: Bool
    let course: Course?
    let mode: AppMode
    let currentDay: Int?
    let currentPhase: Int?
    let todaySchedule: [DoseView]
    let nextDose: DoseView?
    let streak: Streak
    let benefits: Benefits
    let quote: Quote?
    let settings: Settings
}

struct StartCourseRequest: Encodable {
    let startDate: String
    let firstDoseTime: String
}

struct SettingsUpdateRequest: Encodable {
    let packPrice: Double?
    let remindersEnabled: Bool?
    let cigarettesPerDay: Int?
}

struct Course: Decodable, Identifiable {
    let id: Int
    let startDate: String
    let firstDoseTime: String
    let status: CourseStatus
    let createdAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case startDate = "start_date"
        case firstDoseTime = "first_dose_time"
        case status
        case createdAt = "created_at"
    }
}

enum CourseStatus: String, Decodable {
    case active
    case done
    case aborted
}

enum AppMode: String, Decodable {
    case setup
    case beforeCourse
    case course
    case afterCourse
}

struct DoseView: Decodable, Identifiable {
    let id: Int
    let dayNumber: Int
    let phase: Int
    let plannedTime: String
    let effectiveTime: String
    let intervalMinutes: Int
    let flexible: Bool
    let status: DoseStatus
    let takenAt: String?
    let shifted: Bool
}

enum DoseStatus: String, Decodable {
    case pending
    case taken
    case late
    case skipped
}

struct Quote: Decodable {
    let id: Int
    let text: String
    let author: String?
}

struct Benefits: Decodable {
    let quitStartedAt: String?
    let smokeFreeHours: Int
    let smokeFreeDays: Int
    let cigarettesAvoided: Int
    let moneySaved: Int?
    let currentMilestone: HealthMilestone?
    let nextMilestone: HealthMilestone?
}

struct HealthMilestone: Decodable {
    let hours: Int
    let title: String
    let text: String
}

struct Streak: Decodable {
    let currentStartedAt: String?
    let currentDays: Int
    let currentHours: Int
    let recordDays: Int
    let recordHours: Int
}

struct Settings: Decodable {
    let id: Int
    let packPrice: Double?
    let remindersEnabled: Int
    let cigarettesPerDay: Int

    var remindersAreEnabled: Bool {
        remindersEnabled == 1
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case packPrice = "pack_price"
        case remindersEnabled = "reminders_enabled"
        case cigarettesPerDay = "cigarettes_per_day"
    }
}

struct ProgressResponse: Decodable {
    let days: [ProgressDay]
    let smokes: [SmokeLog]
    let smokeEvents: [SmokeEvent]
    let benefits: Benefits
    let streak: Streak
    let adherence: ProgressAdherence
    let missedDays: [MissedDay]
    let milestones: [CourseMilestone]
}

struct ProgressDay: Decodable, Identifiable {
    var id: Int { dayNumber }

    let dayNumber: Int
    let phase: Int
    let planned: Int
    let taken: Int
    let late: Int
    let skipped: Int
    let complete: Bool
    let partial: Bool
}

struct ProgressAdherence: Decodable {
    let percent: Int
    let elapsedPlanned: Int
    let taken: Int
    let late: Int
    let skipped: Int
}

struct SmokeEvent: Decodable, Identifiable {
    let id: Int
    let loggedAt: String
    let note: String?
    let kind: SmokeKind
    let dayNumber: Int?

    private enum CodingKeys: String, CodingKey {
        case id
        case loggedAt = "logged_at"
        case note
        case kind
        case dayNumber
    }
}

struct MissedDay: Decodable, Identifiable {
    var id: Int { dayNumber }

    let dayNumber: Int
    let dateKey: String
    let openSlots: Int
}

struct CourseMilestone: Decodable, Identifiable {
    var id: Int { day }

    let day: Int
    let label: String
}

struct SmokeResponse: Decodable {
    let smoke: SmokeLog
    let shouldOfferVideo: Bool
}

struct SmokeLog: Decodable {
    let id: Int
    let loggedAt: String
    let note: String?
    let kind: SmokeKind

    private enum CodingKeys: String, CodingKey {
        case id
        case loggedAt = "logged_at"
        case note
        case kind
    }
}

enum SmokeKind: String, Decodable {
    case transition
    case relapse
}

extension SmokeLog {
    var noticeText: String {
        kind == .transition ? "Записал факт курения" : "Записал срыв"
    }
}
