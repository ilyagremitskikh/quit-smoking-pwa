//
//  FeedbackEvent.swift
//  QuitKit
//

import Foundation

struct FeedbackEvent: Equatable {
    let id = UUID()
    let kind: FeedbackKind
}
