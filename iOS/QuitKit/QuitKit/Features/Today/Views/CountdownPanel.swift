//
//  CountdownPanel.swift
//  QuitKit
//

import SwiftUI

struct CountdownPanel: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let nextDose: DoseView?

    var body: some View {
        VStack(spacing: QuitKitTheme.Spacing.compact / 2) {
            Text(nextDose.map { "Следующий приём в \(QuitKitDateFormatter.time(from: $0.effectiveTime))" } ?? "На сегодня всё")
                .font(QuitKitTheme.rounded(.body, weight: .heavy))
                .foregroundStyle(QuitKitTheme.muted)

            CountdownText(nextDose: nextDose)

            if nextDose?.shifted == true {
                Text("сдвинуто от фактического приёма")
                    .font(QuitKitTheme.rounded(.footnote, weight: .bold))
                    .foregroundStyle(QuitKitTheme.amber)
            }
        }
        .padding(QuitKitTheme.Spacing.section)
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.66))
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.panel))
        .transition(.todayPulse(reduceMotion: reduceMotion))
        .accessibilityElement(children: .combine)
    }
}
