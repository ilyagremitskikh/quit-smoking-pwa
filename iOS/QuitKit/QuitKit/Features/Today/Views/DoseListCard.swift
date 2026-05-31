//
//  DoseListCard.swift
//  QuitKit
//

import SwiftUI

struct DoseListCard: View {
    let doses: [DoseView]
    let onEditDose: (DoseView) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact) {
            Text("Сегодняшние слоты")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            VStack(spacing: 10) {
                ForEach(doses) { dose in
                    if dose.takenAt != nil {
                        Button {
                            onEditDose(dose)
                        } label: {
                            DoseRow(dose: dose)
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint("Открыть редактирование фактического времени приёма")
                    } else {
                        DoseRow(dose: dose)
                    }
                }
            }
        }
        .padding(QuitKitTheme.Spacing.section)
        .calmCard()
    }
}
