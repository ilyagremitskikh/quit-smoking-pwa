//
//  QuoteCard.swift
//  QuitKit
//

import SwiftUI

struct QuoteCard: View {
    let quote: Quote

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact / 2) {
            Text(quote.text)
                .font(QuitKitTheme.rounded(.title3, weight: .semibold))
                .foregroundStyle(QuitKitTheme.ink)
                .lineSpacing(4)

            if let author = quote.author {
                Text(author)
                    .font(QuitKitTheme.rounded(.subheadline, weight: .bold))
                    .foregroundStyle(QuitKitTheme.muted)
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .frame(maxWidth: .infinity, alignment: .leading)
        .calmCard()
        .accessibilityElement(children: .combine)
    }
}
