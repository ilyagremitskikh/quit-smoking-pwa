//
//  SoundFeedbackService.swift
//  QuitKit
//

import AVFoundation
import Foundation

@MainActor
final class SoundFeedbackService {
    static let shared = SoundFeedbackService()

    private var submitPlayer: AVAudioPlayer?

    private init() {
        submitPlayer = makePlayer(named: "submit", fileExtension: "wav")
    }

    func playSubmit() {
        guard let submitPlayer else {
            return
        }

        submitPlayer.currentTime = 0
        submitPlayer.play()
    }

    private func makePlayer(named name: String, fileExtension ext: String) -> AVAudioPlayer? {
        guard let url = Bundle.main.url(forResource: name, withExtension: ext) else {
            return nil
        }

        do {
            let player = try AVAudioPlayer(contentsOf: url)
            player.prepareToPlay()
            return player
        } catch {
            return nil
        }
    }
}
