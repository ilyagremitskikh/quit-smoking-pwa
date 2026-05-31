//
//  DoseRow.swift
//  QuitKit
//

import SwiftUI

struct DoseRow: View {
    let dose: DoseView

    var body: some View {
        HStack(spacing: QuitKitTheme.Spacing.compact + 2) {
            StatusDot(status: dose.status)

            VStack(alignment: .leading, spacing: 4) {
                Text(QuitKitDateFormatter.time(from: dose.effectiveTime))
                    .font(QuitKitTheme.rounded(.title3, weight: .black))
                    .monospacedDigit()
                    .foregroundStyle(QuitKitTheme.ink)

                Text(detailText)
                    .font(QuitKitTheme.rounded(.footnote, weight: .semibold))
                    .foregroundStyle(QuitKitTheme.muted)
            }

            Spacer(minLength: QuitKitTheme.Spacing.compact)

            StatusBadge(status: dose.status)
        }
        .padding(QuitKitTheme.Spacing.compact + 2)
        .background(Color.white.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
    }

    private var detailText: String {
        if let takenAt = dose.takenAt {
            return "факт: \(QuitKitDateFormatter.time(from: takenAt))"
        }
        if dose.shifted {
            return "план: \(QuitKitDateFormatter.time(from: dose.plannedTime))"
        }
        if dose.flexible {
            return "гибкий слот"
        }
        return "слот курса"
    }

    private var accessibilityLabel: String {
        "Слот \(QuitKitDateFormatter.time(from: dose.effectiveTime)), статус \(dose.status.title), \(detailText)"
    }
}
