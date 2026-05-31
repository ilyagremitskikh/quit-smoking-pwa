//
//  CountdownText.swift
//  QuitKit
//

import SwiftUI

struct CountdownText: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let nextDose: DoseView?

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            Text(countdownText(now: timeline.date))
                .font(QuitKitTheme.numeric(.largeTitle, weight: .black, scale: 1.48))
                .monospacedDigit()
                .minimumScaleFactor(0.58)
                .foregroundStyle(QuitKitTheme.ink)
                .contentTransition(reduceMotion ? .identity : .numericText())
                .accessibilityLabel(accessibilityText(now: timeline.date))
        }
    }

    private func countdownText(now: Date) -> String {
        guard let nextDose else {
            return "готово"
        }
        let seconds = QuitKitDateFormatter.secondsUntil(nextDose.effectiveTime, from: now)
        return QuitKitDateFormatter.clock(from: seconds)
    }

    private func accessibilityText(now: Date) -> String {
        guard let nextDose else {
            return "На сегодня всё"
        }
        let seconds = QuitKitDateFormatter.secondsUntil(nextDose.effectiveTime, from: now)
        return seconds == 0 ? "Приём уже ожидает" : "До следующего приёма \(QuitKitDateFormatter.clock(from: seconds))"
    }
}
