//
//  AppConfig.swift
//  QuitKit
//

import Foundation

enum AppConfig {
    static let backendURLDefaultsKey = "QuitKitBackendBaseURL"

    static var apiBaseURL: URL {
        URL(string: apiBaseURLString) ?? defaultAPIBaseURL
    }

    static var apiBaseURLString: String {
        let override = UserDefaults.standard.string(forKey: backendURLDefaultsKey)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let override, !override.isEmpty {
            return override
        }
        return defaultAPIBaseURL.absoluteString
    }

    static func updateAPIBaseURL(_ value: String) {
        UserDefaults.standard.set(value.trimmingCharacters(in: .whitespacesAndNewlines), forKey: backendURLDefaultsKey)
    }

    #if targetEnvironment(simulator)
    private static let defaultAPIBaseURL = URL(string: "http://127.0.0.1:3000")!
    #else
    private static var defaultAPIBaseURL: URL {
        let value = Bundle.main.object(forInfoDictionaryKey: "QuitKitDeviceAPIBaseURL") as? String
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
        return URL(string: trimmed ?? "") ?? URL(string: "http://127.0.0.1:3000")!
    }
    #endif
}
