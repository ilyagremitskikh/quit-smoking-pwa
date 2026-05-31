//
//  PressAndHoldButtonStyle.swift
//  QuitKit
//

import SwiftUI

struct PressAndHoldButtonStyle: PrimitiveButtonStyle {
    @Binding var progress: Double
    @Binding var isPressing: Bool
    @Binding var didComplete: Bool
    @Binding var phase: PressAndHoldPhase
    @Binding var pressFeedbackSeed: Int
    @Binding var releaseFeedbackSeed: Int
    @Binding var completionFeedbackSeed: Int
    @Binding var completionPulseSeed: Int
    @Binding var hapticRampTick: PressAndHoldHapticTick?

    let tint: Color
    let reduceMotion: Bool
    let isEnabled: Bool

    func makeBody(configuration: Configuration) -> some View {
        PressAndHoldButtonStyleBody(
            configuration: configuration,
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
            isEnabled: isEnabled
        )
    }
}

private struct PressAndHoldButtonStyleBody: View {
    let configuration: PrimitiveButtonStyleConfiguration
    @Binding var progress: Double
    @Binding var isPressing: Bool
    @Binding var didComplete: Bool
    @Binding var phase: PressAndHoldPhase
    @Binding var pressFeedbackSeed: Int
    @Binding var releaseFeedbackSeed: Int
    @Binding var completionFeedbackSeed: Int
    @Binding var completionPulseSeed: Int
    @Binding var hapticRampTick: PressAndHoldHapticTick?

    let tint: Color
    let reduceMotion: Bool
    let isEnabled: Bool

    @State private var hapticRampTask: Task<Void, Never>?
    @State private var resetTask: Task<Void, Never>?
    @State private var hapticTickID = 0

    var body: some View {
        configuration.label
            .brightness(phase.isVisuallyActive && !reduceMotion ? 0.025 : 0)
            .scaleEffect(isPressing && !reduceMotion ? 0.985 : 1)
            .keyframeAnimator(initialValue: 1.0, trigger: completionPulseSeed) { content, scale in
                content.scaleEffect(reduceMotion ? 1 : scale)
            } keyframes: { _ in
                KeyframeTrack {
                    CubicKeyframe(1.026, duration: 0.08)
                    CubicKeyframe(0.996, duration: 0.08)
                    SpringKeyframe(1.0, duration: 0.16)
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
            .onLongPressGesture(
                minimumDuration: QuitKitTheme.Motion.holdDuration,
                maximumDistance: 14,
                perform: completePress,
                onPressingChanged: updatePressing
            )
            .animation(reduceMotion ? nil : QuitKitTheme.Motion.press, value: isPressing)
            .onDisappear {
                cancelScheduledWork()
            }
    }

    private func updatePressing(_ pressing: Bool) {
        guard isEnabled else {
            resetPressState(playReleaseFeedback: false)
            return
        }

        if pressing {
            didComplete = false
            isPressing = true
            phase = .holding
            progress = reduceMotion ? 1 : 0
            pressFeedbackSeed += 1
            startHapticRamp()

            withAnimation(reduceMotion ? nil : .linear(duration: QuitKitTheme.Motion.holdDuration)) {
                progress = 1
            }
        } else {
            guard phase != .completing else {
                return
            }
            resetPressState(playReleaseFeedback: !didComplete)
        }
    }

    private func completePress() {
        guard isEnabled else {
            return
        }

        didComplete = true
        hapticRampTask?.cancel()
        phase = .completing
        isPressing = false
        progress = 1
        completionFeedbackSeed += 1

        if !reduceMotion {
            completionPulseSeed += 1
        }

        resetTask?.cancel()
        resetTask = Task {
            try? await Task.sleep(for: .seconds(reduceMotion ? 0.05 : 0.16))
            guard !Task.isCancelled else {
                return
            }

            await MainActor.run {
                configuration.trigger()
            }

            try? await Task.sleep(for: .seconds(reduceMotion ? 0.05 : 0.14))
            guard !Task.isCancelled else {
                return
            }

            await MainActor.run {
                completeReset()
            }
        }
    }

    private func resetPressState(playReleaseFeedback: Bool) {
        hapticRampTask?.cancel()
        resetTask?.cancel()

        if playReleaseFeedback, isPressing || progress > 0 {
            releaseFeedbackSeed += 1
        }

        phase = playReleaseFeedback ? .cancelling : .idle
        isPressing = false
        withAnimation(reduceMotion ? nil : QuitKitTheme.Motion.reset) {
            progress = 0
        }

        resetTask = Task {
            try? await Task.sleep(for: .seconds(QuitKitTheme.Motion.resetDuration))
            guard !Task.isCancelled else {
                return
            }

            await MainActor.run {
                guard phase == .cancelling else {
                    return
                }
                phase = .idle
            }
        }
    }

    private func completeReset() {
        withAnimation(reduceMotion ? nil : QuitKitTheme.Motion.reset) {
            progress = 0
        }
        phase = .idle
        didComplete = false
    }

    private func startHapticRamp() {
        hapticRampTask?.cancel()
        guard !reduceMotion else {
            return
        }

        hapticRampTask = Task {
            let holdDuration = QuitKitTheme.Motion.holdDuration
            let ticks: [(delay: Double, intensity: Double)] = [
                (holdDuration * 0.30, 0.16),
                (holdDuration * 0.30, 0.24),
                (holdDuration * 0.26, 0.34)
            ]

            for tick in ticks {
                try? await Task.sleep(for: .seconds(tick.delay))
                guard !Task.isCancelled else {
                    return
                }

                await MainActor.run {
                    guard phase == .holding else {
                        return
                    }
                    hapticTickID += 1
                    hapticRampTick = PressAndHoldHapticTick(id: hapticTickID, intensity: tick.intensity)
                }
            }
        }
    }

    private func cancelScheduledWork() {
        hapticRampTask?.cancel()
        resetTask?.cancel()
    }
}
