//
//  SetupCourseView.swift
//  QuitKit
//

import SwiftUI

struct SetupCourseView: View {
    @State private var viewModel = SetupCourseViewModel()

    let onStarted: () async -> Void
    let onFeedback: (FeedbackKind) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.compact) {
                Label("Курс ещё не настроен", systemImage: "leaf.fill")
                    .font(QuitKitTheme.rounded(.title2, weight: .black))
                    .foregroundStyle(QuitKitTheme.ink)

                Text("Выбери старт и базовые привычки. Дальше QuitKit сам соберёт расписание на 25 дней.")
                    .font(QuitKitTheme.rounded(.body, weight: .semibold))
                    .foregroundStyle(QuitKitTheme.muted)
            }

            DatePicker("Старт курса", selection: $viewModel.startDate)
                .datePickerStyle(.compact)
                .font(QuitKitTheme.rounded(.body, weight: .bold))

            DatePicker("Первая таблетка", selection: $viewModel.firstDoseTime, displayedComponents: .hourAndMinute)
                .datePickerStyle(.compact)
                .font(QuitKitTheme.rounded(.body, weight: .bold))

            Stepper(value: $viewModel.cigarettesPerDay, in: 1...200) {
                LabeledContent("Сигарет в день", value: "\(viewModel.cigarettesPerDay)")
                    .font(QuitKitTheme.rounded(.body, weight: .bold))
            }

            TextField("Цена пачки", value: $viewModel.packPrice, format: .number.precision(.fractionLength(0...2)))
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .font(QuitKitTheme.rounded(.body, weight: .semibold))
                .accessibilityHint("Если оставить ноль, экономия денег считаться не будет.")

            Toggle("Мягкие напоминания", isOn: $viewModel.remindersEnabled)
                .font(QuitKitTheme.rounded(.body, weight: .bold))
                .tint(QuitKitTheme.mint)

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .font(QuitKitTheme.rounded(.callout, weight: .bold))
                    .foregroundStyle(QuitKitTheme.coral)
                    .textSelection(.enabled)
            }

            Button {
                Task {
                    await start()
                }
            } label: {
                Label(viewModel.isBusy ? "Запускаю" : "Начать курс", systemImage: "sparkles")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(QuitKitTheme.mint)
            .disabled(viewModel.isBusy)
            .accessibilityHint("Создаёт курс и загружает экран Сегодня.")
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }

    private func start() async {
        do {
            try await viewModel.start()
            onFeedback(.success)
            await onStarted()
        } catch {
            onFeedback(.warning)
        }
    }
}

#Preview {
    SetupCourseView(onStarted: {}, onFeedback: { _ in })
        .padding()
}
