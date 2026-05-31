//
//  TodayHeader.swift
//  QuitKit
//

import SwiftUI

struct TodayHeader: View {
    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
            Text("QuitKit")
                .font(QuitKitTheme.titleFont(1.16))
                .foregroundStyle(QuitKitTheme.ink)

            Text("Сегодня держим курс")
                .font(QuitKitTheme.rounded(.body, weight: .semibold))
                .foregroundStyle(QuitKitTheme.muted)
        }
        .padding(.top, QuitKitTheme.Spacing.section)
        .accessibilityElement(children: .combine)
    }
}
