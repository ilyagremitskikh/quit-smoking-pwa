//
//  LaunchOverlayView.swift
//  QuitKit
//

import SwiftUI

struct LaunchOverlayView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animate = false

    private let quote: String = {
        let quotes = [
            "Один чистый час уже считается",
            "Сегодня достаточно держать курс",
            "Ты не начинаешь заново, ты продолжаешь",
            "Маленький шаг всё равно шаг"
        ]
        let day = Calendar.current.component(.day, from: Date())
        return quotes[day % quotes.count]
    }()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    QuitKitTheme.ColorToken.backgroundTop,
                    QuitKitTheme.ColorToken.backgroundBottom
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            Circle()
                .fill(QuitKitTheme.mint.opacity(0.18))
                .frame(width: 310, height: 310)
                .blur(radius: 20)
                .scaleEffect(animate && !reduceMotion ? 1.08 : 0.94)
                .opacity(animate ? 1 : 0.62)

            VStack(spacing: 26) {
                ZStack {
                    Circle()
                        .trim(from: 0, to: animate || reduceMotion ? 0.78 : 0.08)
                        .stroke(
                            AngularGradient(
                                colors: [
                                    QuitKitTheme.mint,
                                    Color(red: 0.36, green: 0.84, blue: 0.55),
                                    QuitKitTheme.mint.opacity(0.08)
                                ],
                                center: .center
                            ),
                            style: StrokeStyle(lineWidth: 10, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-92))
                        .frame(width: 208, height: 208)

                    Image("LaunchLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 178, height: 178)
                        .clipShape(RoundedRectangle(cornerRadius: 48, style: .continuous))
                        .shadow(color: QuitKitTheme.mint.opacity(0.24), radius: 28, x: 0, y: 18)
                }
                .scaleEffect(animate || reduceMotion ? 1 : 0.88)
                .opacity(animate || reduceMotion ? 1 : 0)

                VStack(spacing: 12) {
                    Text("QuitKit")
                        .font(.system(size: 38, weight: .black, design: .rounded))
                        .foregroundStyle(QuitKitTheme.ink)

                    Text(quote)
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(QuitKitTheme.muted)
                        .frame(maxWidth: 310)
                }
                .offset(y: animate || reduceMotion ? 0 : 10)
                .opacity(animate || reduceMotion ? 1 : 0)
            }
        }
        .onAppear {
            withAnimation(reduceMotion ? .linear(duration: 0.01) : .snappy(duration: 0.75)) {
                animate = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("QuitKit запускается")
    }
}

#Preview {
    LaunchOverlayView()
}
