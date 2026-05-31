//
//  PressAndHoldPhase.swift
//  QuitKit
//

enum PressAndHoldPhase {
    case idle
    case holding
    case completing
    case cancelling

    var isVisuallyActive: Bool {
        self == .holding || self == .completing
    }
}
