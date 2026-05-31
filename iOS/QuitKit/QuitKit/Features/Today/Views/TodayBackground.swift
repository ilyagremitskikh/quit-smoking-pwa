//
//  TodayBackground.swift
//  QuitKit
//

import SwiftUI

struct TodayBackground: View {
    var body: some View {
        LinearGradient(
            colors: [QuitKitTheme.backgroundTop, QuitKitTheme.backgroundBottom],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}
