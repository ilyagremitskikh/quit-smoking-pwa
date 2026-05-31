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
    let onPressStart: () -> Void
    let action: () async -> Void

    @State private var progress = 0.0
    @State private var isPressing = false
    @State private var didComplete = false
    @State private var holdTask: Task<Void, Never>?

    var body: some View {
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
                progress: progress
            )
                .padding(.horizontal, QuitKitTheme.Spacing.compact)
        }
        .frame(minHeight: 74)
        .contentShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.control))
        .opacity(disabled ? 0.62 : 1)
        .scaleEffect(isPressing && !reduceMotion ? 0.985 : 1)
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in startHold() }
                .onEnded { _ in cancelHoldIfNeeded() }
        )
        .animation(reduceMotion ? nil : QuitKitTheme.Motion.press, value: isPressing)
        .allowsHitTesting(!disabled)
        .accessibilityElement(children: .ignore)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(title)
        .accessibilityHint(subtitle)
        .accessibilityValue(progress > 0 ? "\(Int(progress * 100)) процентов" : "")
        .accessibilityInputLabels([Text(title)])
        .accessibilityAction(named: Text("Подтвердить")) {
            guard !disabled else {
                return
            }
            Task {
                await action()
            }
        }
        .onDisappear {
            holdTask?.cancel()
        }
    }

    private func startHold() {
        guard !disabled, !isPressing else {
            return
        }

        didComplete = false
        isPressing = true
        progress = 0
        onPressStart()

        withAnimation(reduceMotion ? nil : .linear(duration: QuitKitTheme.Motion.holdDuration)) {
            progress = 1
        }

        holdTask?.cancel()
        holdTask = Task {
            try? await Task.sleep(for: .seconds(QuitKitTheme.Motion.holdDuration))
            guard !Task.isCancelled else {
                return
            }

            await MainActor.run {
                didComplete = true
                isPressing = false
            }

            await action()

            await MainActor.run {
                withAnimation(reduceMotion ? nil : QuitKitTheme.Motion.reset) {
                    progress = 0
                }
            }
        }
    }

    private func cancelHoldIfNeeded() {
        guard !didComplete else {
            return
        }

        holdTask?.cancel()
        isPressing = false
        withAnimation(reduceMotion ? nil : QuitKitTheme.Motion.reset) {
            progress = 0
        }
    }
}
