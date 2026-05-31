//
//  SmokeHistoryCard.swift
//  QuitKit
//

import SwiftUI

struct SmokeHistoryCard: View {
    let events: [SmokeEvent]

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            Label("Записи курения", systemImage: "smoke.fill")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            ForEach(events.prefix(6)) { event in
                HStack(alignment: .firstTextBaseline) {
                    Text(event.kind == .relapse ? "Срыв" : "Переход")
                        .font(QuitKitTheme.rounded(.body, weight: .black))
                        .foregroundStyle(QuitKitTheme.ink)

                    Spacer()

                    Text(detail(for: event))
                        .font(QuitKitTheme.rounded(.callout, weight: .bold))
                        .foregroundStyle(QuitKitTheme.muted)
                        .multilineTextAlignment(.trailing)
                }
                .accessibilityElement(children: .combine)

                if event.id != events.prefix(6).last?.id {
                    Divider()
                }
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }

    private func detail(for event: SmokeEvent) -> String {
        let day = event.dayNumber.map { "день \($0), " } ?? ""
        return "\(day)\(QuitKitDateFormatter.time(from: event.loggedAt))"
    }
}
