//
//  CourseSettingsCard.swift
//  QuitKit
//

import SwiftUI

struct CourseSettingsCard: View {
    @Binding var cigarettesPerDay: Int
    @Binding var packPrice: Double
    @Binding var remindersEnabled: Bool

    let notificationStatus: String
    let isSaving: Bool
    let onSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            Label("Курс", systemImage: "slider.horizontal.below.sun.max")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            Stepper(value: $cigarettesPerDay, in: 1...200) {
                LabeledContent("Сигарет в день", value: "\(cigarettesPerDay)")
                    .font(QuitKitTheme.rounded(.body, weight: .bold))
            }

            TextField("Цена пачки", value: $packPrice, format: .number.precision(.fractionLength(0...2)))
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .font(QuitKitTheme.rounded(.body, weight: .semibold))

            Toggle("Локальные напоминания", isOn: $remindersEnabled)
                .font(QuitKitTheme.rounded(.body, weight: .bold))
                .tint(QuitKitTheme.mint)

            LabeledContent("Статус iOS", value: notificationStatus)
                .font(QuitKitTheme.rounded(.callout, weight: .bold))
                .foregroundStyle(QuitKitTheme.muted)

            Button {
                onSave()
            } label: {
                Label(isSaving ? "Сохраняю" : "Сохранить настройки", systemImage: "checkmark.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(QuitKitTheme.mint)
            .disabled(isSaving)
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
