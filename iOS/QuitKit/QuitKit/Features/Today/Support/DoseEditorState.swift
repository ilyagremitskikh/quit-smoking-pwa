//
//  DoseEditorState.swift
//  QuitKit
//

import Foundation

struct DoseEditorState: Identifiable {
    let id: Int
    let dose: DoseView
    var takenAt: Date
    var errorMessage: String?

    init(dose: DoseView, takenAt: Date) {
        self.id = dose.id
        self.dose = dose
        self.takenAt = takenAt
    }
}
