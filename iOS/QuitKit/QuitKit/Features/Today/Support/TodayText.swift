//
//  TodayText.swift
//  QuitKit
//

import SwiftUI

func dayWord(_ value: Int, tail: String) -> String {
    let absolute = abs(value)
    let lastTwo = absolute % 100
    let last = absolute % 10
    let word = lastTwo >= 11 && lastTwo <= 14 ? "дней" : last == 1 ? "день" : (last >= 2 && last <= 4 ? "дня" : "дней")
    return "\(word) \(tail)"
}
