//
//  PressAndHoldActionButton.swift
//  QuitKit
//

import SwiftUI

struct PressAndHoldActionButton: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let title: String
    let subtitle: String
    let systemImage: String
    let tint: Color
    let disabled: Bool
    let action: () async -> Void

    @State private var progress = 0.0
    @State private var isPressing = false
    @State private var didComplete = false
    @State private var phase: PressAndHoldPhase = .idle
    @State private var pressFeedbackSeed = 0
    @State private var releaseFeedbackSeed = 0
    @State private var completionFeedbackSeed = 0
    @State private var completionPulseSeed = 0
    @State private var hapticRampTick: PressAndHoldHapticTick?

    var body: some View {
        Button(action: runAction) {
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
                    .fill(disabled ? Color.gray.opacity(0.18) : tint.opacity(0.14))

                PressAndHoldFill(progress: progress, tint: tint)

                PressAndHoldLabel(
                    title: title,
                    subtitle: subtitle,
                    systemImage: systemImage,
                    tint: tint,
                    disabled: disabled,
                    progress: progress,
                    completionPulseSeed: completionPulseSeed
                )
                    .padding(.horizontal, QuitKitTheme.Spacing.compact)
            }
            .frame(minHeight: 74)
        }
        .buttonStyle(
            PressAndHoldButtonStyle(
                progress: $progress,
                isPressing: $isPressing,
                didComplete: $didComplete,
                phase: $phase,
                pressFeedbackSeed: $pressFeedbackSeed,
                releaseFeedbackSeed: $releaseFeedbackSeed,
                completionFeedbackSeed: $completionFeedbackSeed,
                completionPulseSeed: $completionPulseSeed,
                hapticRampTick: $hapticRampTick,
                tint: tint,
                reduceMotion: reduceMotion,
                isEnabled: !disabled
            )
        )
        .disabled(disabled)
        .opacity(disabled ? 0.62 : 1)
        .accessibilityLabel(title)
        .accessibilityHint(subtitle)
        .accessibilityValue(progress > 0 ? "\(Int(progress * 100)) процентов" : "")
        .accessibilityInputLabels([Text(title)])
        .accessibilityAction(named: Text("Подтвердить")) {
            guard !disabled else {
                return
            }
            runAction()
        }
        .sensoryFeedback(.press(.button), trigger: pressFeedbackSeed)
        .sensoryFeedback(.impact(flexibility: .soft, intensity: 0.42), trigger: releaseFeedbackSeed)
        .sensoryFeedback(.pathComplete, trigger: completionFeedbackSeed)
        .sensoryFeedback(trigger: hapticRampTick) { _, tick in
            guard let tick else {
                return nil
            }
            return .impact(flexibility: .soft, intensity: tick.intensity)
        }
    }

    private func runAction() {
        guard !disabled else {
            return
        }
        Task {
            await action()
        }
    }
}
