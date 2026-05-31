//
//  DoseStatusPresentation.swift
//  QuitKit
//

import SwiftUI

extension DoseStatus {
    var title: String {
        switch self {
        case .pending:
            return "ждёт"
        case .taken:
            return "принято"
        case .late:
            return "поздно"
        case .skipped:
            return "пропуск"
        }
    }

    var tint: Color {
        switch self {
        case .pending:
            return QuitKitTheme.muted
        case .taken:
            return QuitKitTheme.mint
        case .late:
            return QuitKitTheme.amber
        case .skipped:
            return QuitKitTheme.coral
        }
    }

    var systemImage: String {
        switch self {
        case .pending:
            return "clock"
        case .taken:
            return "checkmark"
        case .late:
            return "exclamationmark"
        case .skipped:
            return "minus"
        }
    }
}
