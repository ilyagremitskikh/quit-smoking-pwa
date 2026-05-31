//
//  MetricPill.swift
//  QuitKit
//

import SwiftUI

struct MetricPill: View {
    let label: String
    let value: String
    let suffix: String

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
            Text(label.uppercased())
                .font(QuitKitTheme.rounded(.caption, weight: .heavy, scale: 0.86))
                .foregroundStyle(QuitKitTheme.muted)

            HStack(alignment: .lastTextBaseline, spacing: 3) {
                Text(value)
                    .font(QuitKitTheme.rounded(.title, weight: .black))
                    .monospacedDigit()
                Text(suffix)
                    .font(QuitKitTheme.rounded(.callout, weight: .black))
            }
            .foregroundStyle(QuitKitTheme.ink)
        }
        .padding(QuitKitTheme.Spacing.compact + 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.pill))
        .accessibilityElement(children: .combine)
    }
}
