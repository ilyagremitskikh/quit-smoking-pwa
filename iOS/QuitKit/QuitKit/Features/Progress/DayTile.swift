//
//  DayTile.swift
//  QuitKit
//

import SwiftUI

struct DayTile: View {
    let day: ProgressDay
    let milestone: CourseMilestone?

    private var tint: Color {
        if day.complete {
            return QuitKitTheme.mint
        }
        if day.partial {
            return QuitKitTheme.amber
        }
        if day.skipped > 0 {
            return QuitKitTheme.coral
        }
        return QuitKitTheme.muted.opacity(0.28)
    }

    private var statusImage: String? {
        if milestone != nil {
            return "star.fill"
        }
        if day.complete {
            return "checkmark"
        }
        if day.partial {
            return "circle.lefthalf.filled"
        }
        if day.skipped > 0 {
            return "exclamationmark"
        }
        return nil
    }

    private var foreground: Color {
        day.complete || day.partial || day.skipped > 0 ? .white : QuitKitTheme.ink
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Text("\(day.dayNumber)")
                .font(QuitKitTheme.rounded(.body, weight: .black))
                .monospacedDigit()
                .foregroundStyle(foreground)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if let statusImage {
                Image(systemName: statusImage)
                    .font(QuitKitTheme.rounded(.caption2, weight: .black))
                    .foregroundStyle(foreground)
                    .padding(7)
                    .accessibilityHidden(true)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .background(tint)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityLabel)
    }

    private var accessibilityLabel: String {
        if let milestone {
            return "День \(day.dayNumber), \(milestone.label)"
        }
        if day.complete {
            return "День \(day.dayNumber), завершён"
        }
        if day.partial {
            return "День \(day.dayNumber), частично"
        }
        if day.skipped > 0 {
            return "День \(day.dayNumber), есть пропуски"
        }
        return "День \(day.dayNumber)"
    }
}
