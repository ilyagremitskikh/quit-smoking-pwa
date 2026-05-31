//
//  AppConfig.swift
//  QuitKit
//

import Foundation

enum AppConfig {
    static let backendURLDefaultsKey = "QuitKitBackendBaseURL"
    static let appGroupIdentifier = "group.com.gremitskikh.QuitKit"

    static var apiBaseURL: URL {
        URL(string: apiBaseURLString) ?? defaultAPIBaseURL
    }

    static var apiBaseURLString: String {
        for (index, storage) in [defaults, UserDefaults.standard].enumerated() {
            let override = storage.string(forKey: backendURLDefaultsKey)?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let override, !override.isEmpty {
                if index > 0 {
                    defaults.set(override, forKey: backendURLDefaultsKey)
                }
                return override
            }
        }
        return defaultAPIBaseURL.absoluteString
    }

    static func updateAPIBaseURL(_ value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        defaults.set(trimmed, forKey: backendURLDefaultsKey)
        UserDefaults.standard.set(trimmed, forKey: backendURLDefaultsKey)
    }

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupIdentifier) ?? .standard
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
