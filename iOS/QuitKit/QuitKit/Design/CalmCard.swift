//
//  CalmCard.swift
//  QuitKit
//

import SwiftUI

struct CalmCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: QuitKitTheme.Radius.card)
                    .stroke(Color.white.opacity(0.62), lineWidth: 1)
            )
            .shadow(color: QuitKitTheme.ink.opacity(0.08), radius: 24, x: 0, y: 14)
    }
}
