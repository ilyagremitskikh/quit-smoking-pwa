//
//  DoseProgressStrip.swift
//  QuitKit
//

import SwiftUI

struct DoseProgressStrip: View {
    let total: Int
    let taken: Int

    var body: some View {
        if total > 0 {
            HStack(spacing: 7) {
                ForEach(0..<total, id: \.self) { index in
                    Capsule()
                        .fill(index < taken ? QuitKitTheme.mint : Color.secondary.opacity(0.18))
                        .frame(minHeight: 7)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Прогресс доз на сегодня: \(taken) из \(total)")
        }
    }
}
