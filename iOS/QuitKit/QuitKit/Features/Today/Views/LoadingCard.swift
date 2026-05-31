//
//  LoadingCard.swift
//  QuitKit
//

import SwiftUI

struct LoadingCard: View {
    var body: some View {
        Label {
            Text("Загружаю состояние курса")
                .font(QuitKitTheme.rounded(.body, weight: .bold))
                .foregroundStyle(QuitKitTheme.muted)
        } icon: {
            ProgressView()
        }
        .padding(QuitKitTheme.Spacing.card)
        .frame(maxWidth: .infinity, alignment: .leading)
        .calmCard()
    }
}
