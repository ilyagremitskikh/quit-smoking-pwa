//
//  UndoToastView.swift
//  QuitKit
//

import SwiftUI

struct UndoToastView: View {
    let toast: UndoToast
    let onUndo: () -> Void

    var body: some View {
        HStack(spacing: QuitKitTheme.Spacing.compact) {
            Text(toast.text)
                .font(QuitKitTheme.rounded(.callout, weight: .black))
                .foregroundStyle(.white)

            Spacer(minLength: QuitKitTheme.Spacing.compact)

            Button("Отменить", action: onUndo)
                .font(QuitKitTheme.rounded(.callout, weight: .black))
                .foregroundStyle(QuitKitTheme.mintSoft)
                .accessibilityHint("Вернуть последнее действие")
        }
        .padding(.horizontal, QuitKitTheme.Spacing.section)
        .padding(.vertical, 15)
        .background(QuitKitTheme.ink.opacity(0.96))
        .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
        .shadow(color: QuitKitTheme.ink.opacity(0.24), radius: 24, x: 0, y: 12)
        .accessibilityElement(children: .contain)
    }
}
