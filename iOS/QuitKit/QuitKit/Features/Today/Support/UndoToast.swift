//
//  UndoToast.swift
//  QuitKit
//

enum UndoToast: Identifiable, Equatable {
    case dose(scheduleId: Int, text: String)
    case smoke(smokeId: Int, text: String)

    var id: String {
        switch self {
        case .dose(let scheduleId, _):
            return "dose-\(scheduleId)"
        case .smoke(let smokeId, _):
            return "smoke-\(smokeId)"
        }
    }

    var text: String {
        switch self {
        case .dose(_, let text), .smoke(_, let text):
            return text
        }
    }
}
