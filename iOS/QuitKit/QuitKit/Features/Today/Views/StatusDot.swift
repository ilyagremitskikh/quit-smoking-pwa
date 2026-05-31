//
//  StatusDot.swift
//  QuitKit
//

import SwiftUI

struct StatusDot: View {
    let status: DoseStatus

    var body: some View {
        Image(systemName: status.systemImage)
            .font(.caption.bold())
            .foregroundStyle(.white)
            .frame(width: 26, height: 26)
            .background(status.tint)
            .clipShape(Circle())
            .accessibilityHidden(true)
    }
}
