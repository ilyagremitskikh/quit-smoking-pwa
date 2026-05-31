//
//  ContentView.swift
//  QuitKit
//
//  Created by TochkaMac0331 on 31.05.2026.
//

import SwiftUI

struct ContentView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showLaunchOverlay = true

    var body: some View {
        ZStack {
            TabView {
                NavigationStack {
                    TodayView()
                }
                .tabItem {
                    Label("Сегодня", systemImage: "sun.max.fill")
                }

                NavigationStack {
                    ProgressScreen()
                }
                .tabItem {
                    Label("Прогресс", systemImage: "chart.line.uptrend.xyaxis")
                }

                NavigationStack {
                    SettingsScreen()
                }
                .tabItem {
                    Label("Настройки", systemImage: "slider.horizontal.3")
                }
            }
            .tint(QuitKitTheme.mint)

            if showLaunchOverlay {
                LaunchOverlayView()
                    .transition(.opacity)
                    .zIndex(10)
            }
        }
        .task {
            let delay = reduceMotion ? 250_000_000 : 1_850_000_000
            try? await Task.sleep(nanoseconds: UInt64(delay))
            withAnimation(reduceMotion ? .linear(duration: 0.01) : .easeOut(duration: 0.28)) {
                showLaunchOverlay = false
            }
        }
    }
}

#Preview {
    ContentView()
}
