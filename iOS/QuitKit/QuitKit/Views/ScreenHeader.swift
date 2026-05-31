//
//  ScreenHeader.swift
//  QuitKit
//

import SwiftUI

struct ScreenHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
            Text(title)
                .font(QuitKitTheme.titleFont(1.15))
                .foregroundStyle(QuitKitTheme.ink)

            Text(subtitle)
                .font(QuitKitTheme.rounded(.body, weight: .bold))
                .foregroundStyle(QuitKitTheme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
