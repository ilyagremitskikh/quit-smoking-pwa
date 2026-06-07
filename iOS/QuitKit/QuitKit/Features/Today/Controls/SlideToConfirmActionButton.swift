//
//  SlideToConfirmActionButton.swift
//  QuitKit
//

import SwiftUI

struct SlideToConfirmActionButton: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let title: String
    let subtitle: String
    let systemImage: String
    let tint: Color
    let disabled: Bool
    let action: () async -> Void

    @State private var progress = 0.0
    @State private var phase: SlideActionPhase = .idle
    @State private var dragStartProgress = 0.0
    @State private var dragAxis: SlideDragAxis?
    @State private var completionPulseSeed = 0
    @State private var pressFeedbackSeed = 0
    @State private var releaseFeedbackSeed = 0
    @State private var completionFeedbackSeed = 0
    @State private var hapticTick: SlideHapticTick?
    @State private var hapticTickID = 0
    @State private var passedThresholds: Set<Int> = []

    private let controlHeight: CGFloat = 74
    private let handleSize: CGFloat = 56
    private let inset: CGFloat = 9
    private let completionThreshold = 0.92

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let travel = max(width - handleSize - inset * 2, 1)
            let handleOffset = travel * progress

            ZStack(alignment: .leading) {
                trackBackground
                fill(width: width, handleOffset: handleOffset)
                content(handleOffset: handleOffset, travel: travel)
                completionOverlay
            }
            .frame(height: controlHeight)
            .opacity(disabled ? 0.62 : 1)
            .accessibilityElement(children: .ignore)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel(title)
            .accessibilityHint(accessibilityHint)
            .accessibilityValue(progress > 0 ? "\(Int(progress * 100)) процентов" : "")
            .accessibilityInputLabels([Text(title)])
            .accessibilityAction(named: Text("Подтвердить")) {
                complete()
            }
        }
        .frame(minHeight: controlHeight)
        .sensoryFeedback(.press(.button), trigger: pressFeedbackSeed)
        .sensoryFeedback(.impact(flexibility: .soft, intensity: 0.22), trigger: releaseFeedbackSeed)
        .sensoryFeedback(.pathComplete, trigger: completionFeedbackSeed)
        .sensoryFeedback(trigger: hapticTick) { _, tick in
            guard let tick else {
                return nil
            }
            return .impact(flexibility: .soft, intensity: tick.intensity)
        }
    }

    private var trackBackground: some View {
        RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
            .fill(disabled ? Color.gray.opacity(0.18) : tint.opacity(0.14))
    }

    private func fill(width: CGFloat, handleOffset: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
            .fill(tint.gradient)
            .frame(width: min(width, inset + handleSize + handleOffset))
            .opacity(phase == .idle && progress == 0 ? 0 : 1)
    }

    private func content(handleOffset: CGFloat, travel: CGFloat) -> some View {
        ZStack(alignment: .leading) {
            label
                .padding(.leading, handleSize + inset + QuitKitTheme.Spacing.compact)
                .padding(.trailing, QuitKitTheme.Spacing.compact)
                .opacity(phase.showsCompletion ? 0 : 1)

            handle(offset: handleOffset, travel: travel)
                .opacity(phase.showsCompletion ? 0 : 1)
        }
    }

    private var label: some View {
        HStack(spacing: QuitKitTheme.Spacing.compact) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(QuitKitTheme.Typography.body(.headline, weight: .black))
                    .foregroundStyle(progress > 0.68 ? .white : QuitKitTheme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)

                Text(subtitle)
                    .font(QuitKitTheme.Typography.body(.caption, weight: .bold))
                    .foregroundStyle(progress > 0.68 ? .white.opacity(0.86) : QuitKitTheme.muted)
                    .lineLimit(2)
                    .minimumScaleFactor(0.82)
            }

            Spacer(minLength: QuitKitTheme.Spacing.compact)

            Text("проведи")
                .font(QuitKitTheme.Typography.label(.caption2))
                .foregroundStyle(progress > 0.68 ? .white.opacity(0.78) : tint)
                .opacity(disabled ? 0.35 : 0.86)
        }
    }

    private func handle(offset: CGFloat, travel: CGFloat) -> some View {
        Circle()
            .fill(.white.opacity(disabled ? 0.72 : 0.96))
            .overlay {
                Image(systemName: phase == .completing ? "checkmark" : systemImage)
                    .font(.headline.weight(.black))
                    .foregroundStyle(disabled ? QuitKitTheme.muted : tint)
                    .symbolEffect(.bounce, value: reduceMotion ? 0 : completionPulseSeed)
            }
            .shadow(color: tint.opacity(disabled ? 0 : 0.24), radius: 16, x: 0, y: 8)
            .frame(width: handleSize, height: handleSize)
            .offset(x: inset + offset)
            .gesture(dragGesture(travel: travel))
            .contentShape(Circle())
            .accessibilityHidden(true)
    }

    private var completionOverlay: some View {
        ZStack {
            RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control)
                .fill(tint.gradient)

            HStack(spacing: QuitKitTheme.Spacing.compact) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3.weight(.black))
                    .symbolEffect(.bounce, value: reduceMotion ? 0 : completionPulseSeed)

                Text("Готово")
                    .font(QuitKitTheme.Typography.body(.headline, weight: .black))
            }
            .foregroundStyle(.white)
        }
        .opacity(phase.showsCompletion ? 1 : 0)
        .animation(reduceMotion ? .easeOut(duration: 0.08) : .easeOut(duration: 0.18), value: phase.showsCompletion)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func dragGesture(travel: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 6)
            .onChanged { value in
                guard !disabled, phase.allowsInteraction else {
                    return
                }

                if phase == .idle {
                    phase = .dragging
                    dragStartProgress = progress
                    dragAxis = nil
                    passedThresholds.removeAll()
                    pressFeedbackSeed += 1
                }

                if dragAxis == nil {
                    let horizontal = abs(value.translation.width)
                    let vertical = abs(value.translation.height)
                    if horizontal > 8 || vertical > 8 {
                        dragAxis = horizontal >= vertical ? .horizontal : .vertical
                    }
                }

                guard dragAxis != .vertical else {
                    return
                }

                let nextProgress = dragStartProgress + (value.translation.width / travel)
                let clamped = min(max(nextProgress, 0), 1)
                progress = clamped
                playThresholdFeedback(for: clamped)

                if clamped >= completionThreshold {
                    complete()
                }
            }
            .onEnded { _ in
                guard phase == .dragging else {
                    return
                }

                if progress >= completionThreshold {
                    complete()
                } else {
                    cancel()
                }
            }
    }

    private var accessibilityHint: String {
        if disabled {
            return "Сейчас действие недоступно."
        }
        return "Проведи вправо, чтобы подтвердить. VoiceOver может выполнить действие двойным касанием."
    }

    private func playThresholdFeedback(for progress: Double) {
        for threshold in [25, 50, 75] where progress >= Double(threshold) / 100 && !passedThresholds.contains(threshold) {
            passedThresholds.insert(threshold)
            hapticTickID += 1
            hapticTick = SlideHapticTick(id: hapticTickID, intensity: Double(threshold) / 260)
        }
    }

    private func complete() {
        guard !disabled, phase.allowsInteraction else {
            return
        }

        phase = .completing
        dragAxis = nil
        completionPulseSeed += 1
        completionFeedbackSeed += 1

        withAnimation(reduceMotion ? nil : .snappy(duration: 0.18)) {
            progress = 1
        }

        Task {
            try? await Task.sleep(for: .seconds(reduceMotion ? 0.04 : 0.14))
            await action()
            try? await Task.sleep(for: .seconds(reduceMotion ? 0.08 : 0.18))
            await MainActor.run {
                resetAfterCompletion()
            }
        }
    }

    private func cancel() {
        dragAxis = nil
        releaseFeedbackSeed += progress > 0 ? 1 : 0
        phase = .cancelling
        withAnimation(reduceMotion ? nil : QuitKitTheme.Motion.reset) {
            progress = 0
        }

        Task {
            try? await Task.sleep(for: .seconds(QuitKitTheme.Motion.resetDuration))
            await MainActor.run {
                guard phase == .cancelling else {
                    return
                }
                phase = .idle
            }
        }
    }

    private func resetAfterCompletion() {
        var transaction = Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction) {
            progress = 0
            passedThresholds.removeAll()
        }

        withAnimation(reduceMotion ? .easeOut(duration: 0.08) : .easeOut(duration: 0.18)) {
            phase = .idle
        }
    }
}

private enum SlideActionPhase {
    case idle
    case dragging
    case completing
    case cancelling

    var allowsInteraction: Bool {
        self == .idle || self == .dragging
    }

    var showsCompletion: Bool {
        self == .completing
    }
}

private enum SlideDragAxis {
    case horizontal
    case vertical
}
