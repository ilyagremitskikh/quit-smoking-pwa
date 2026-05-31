//
//  ContentView.swift
//  QuitKit
//
//  Created by TochkaMac0331 on 31.05.2026.
//

import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var todayQuote = LocalQuoteStore.randomQuote()

    var body: some View {
        TabView {
            NavigationStack {
                TodayView(quoteText: todayQuote)
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
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                todayQuote = LocalQuoteStore.randomQuote(excluding: todayQuote)
            }
        }
    }
}

#Preview {
    ContentView()
}
