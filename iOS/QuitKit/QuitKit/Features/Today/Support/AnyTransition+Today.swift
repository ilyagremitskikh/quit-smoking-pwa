//
//  AnyTransition+Today.swift
//  QuitKit
//

import SwiftUI

extension AnyTransition {
    static func todayPulse(reduceMotion: Bool) -> AnyTransition {
        reduceMotion ? .opacity : .scale(scale: 0.96).combined(with: .opacity)
    }
}
