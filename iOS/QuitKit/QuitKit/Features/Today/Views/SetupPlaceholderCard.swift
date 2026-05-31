//
//  SetupPlaceholderCard.swift
//  QuitKit
//

import SwiftUI

struct SetupPlaceholderCard: View {
    var body: some View {
        ContentUnavailableView(
            "Курс ещё не настроен",
            systemImage: "leaf",
            description: Text("Первую настройку пока оставляем в веб-версии. Нативный Today подключится, когда курс уже создан.")
        )
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
