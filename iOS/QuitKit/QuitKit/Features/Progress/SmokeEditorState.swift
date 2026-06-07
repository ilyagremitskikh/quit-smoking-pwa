//
//  SmokeEditorState.swift
//  QuitKit
//

import Foundation

struct SmokeEditorState: Identifiable {
    let id: Int
    let event: SmokeEvent
    var loggedAt: Date
    var note: String
    var errorMessage: String?

    init(event: SmokeEvent, loggedAt: Date) {
        self.id = event.id
        self.event = event
        self.loggedAt = loggedAt
        self.note = event.note ?? ""
    }
}
