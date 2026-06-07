//
//  SmokeHistoryCard.swift
//  QuitKit
//

import SwiftUI

struct SmokeHistoryCard: View {
    let events: [SmokeEvent]
    let onEditSmoke: (SmokeEvent) -> Void

    private var visibleEvents: [SmokeEvent] {
        Array(events.prefix(6))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            Label("Записи курения", systemImage: "smoke.fill")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            ForEach(visibleEvents) { event in
                Button {
                    onEditSmoke(event)
                } label: {
                    HStack(alignment: .firstTextBaseline) {
                        Text(event.kind.title)
                            .font(QuitKitTheme.rounded(.body, weight: .black))
                            .foregroundStyle(QuitKitTheme.ink)

                        Spacer()

                        Text(detail(for: event))
                            .font(QuitKitTheme.rounded(.callout, weight: .bold))
                            .foregroundStyle(QuitKitTheme.muted)
                            .multilineTextAlignment(.trailing)

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(QuitKitTheme.muted.opacity(0.68))
                            .accessibilityHidden(true)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(event.kind.title), \(detail(for: event))")
                .accessibilityHint("Открыть редактирование записи курения.")

                if event.id != visibleEvents.last?.id {
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
