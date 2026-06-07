//
//  APIClient.swift
//  QuitKit
//

import Foundation

struct APIClient {
    private let configuredBaseURL: URL?
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(baseURL: URL? = nil, session: URLSession = .shared) {
        self.configuredBaseURL = baseURL
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    private var baseURL: URL {
        configuredBaseURL ?? AppConfig.apiBaseURL
    }

    func health() async throws -> HealthResponse {
        try await request("/api/health")
    }

    func state() async throws -> AppStateResponse {
        try await request("/api/state")
    }

    func startCourse(_ input: StartCourseRequest) async throws -> Course {
        try await request("/api/course", method: "POST", body: input)
    }

    func progress() async throws -> ProgressResponse {
        try await request("/api/progress")
    }

    func updateSettings(_ input: SettingsUpdateRequest) async throws -> Settings {
        try await request("/api/settings", method: "PUT", body: input)
    }

    func takeDose(scheduleId: Int, takenAt: Date? = nil) async throws -> DoseView {
        let body = TakeDoseRequest(takenAt: takenAt.map(QuitKitDateFormatter.isoString(from:)))
        let response: DoseView = try await request("/api/doses/\(scheduleId)/take", method: "POST", body: body)
        return response
    }

    func undoDose(scheduleId: Int) async throws -> EmptyResponse {
        try await request("/api/doses/\(scheduleId)/take", method: "DELETE")
    }

    func smoke() async throws -> SmokeResponse {
        try await request("/api/smoke", method: "POST", body: EmptyRequestBody())
    }

    func undoSmoke(smokeId: Int) async throws -> EmptyResponse {
        try await request("/api/smoke/\(smokeId)", method: "DELETE")
    }

    func updateSmoke(smokeId: Int, loggedAt: Date, note: String?) async throws -> SmokeLog {
        let body = UpdateSmokeRequest(
            loggedAt: QuitKitDateFormatter.isoString(from: loggedAt),
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        return try await request("/api/smoke/\(smokeId)", method: "PUT", body: body)
    }

    private func request<Response: Decodable>(_ path: String, method: String = "GET") async throws -> Response {
        let emptyBody: EmptyRequestBody? = nil
        return try await request(path, method: method, body: emptyBody)
    }

    private func request<Response: Decodable, Body: Encodable>(_ path: String, method: String = "GET", body: Body?) async throws -> Response {
        let url = baseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(TimeZone.current.identifier, forHTTPHeaderField: "X-QuitKit-Time-Zone")

        if let body {
            request.httpBody = try encoder.encode(body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIError.httpStatus(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

struct EmptyRequestBody: Encodable {}

struct TakeDoseRequest: Encodable {
    let takenAt: String?
}

struct UpdateSmokeRequest: Encodable {
    let loggedAt: String
    let note: String?
}

struct EmptyResponse: Decodable {
    let ok: Bool?
}

enum APIError: LocalizedError {
    case invalidResponse
    case httpStatus(Int)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Сервер ответил в неожиданном формате."
        case .httpStatus(let statusCode):
            return "Backend вернул HTTP \(statusCode)."
        case .decoding(let error):
            return "Не удалось прочитать ответ backend: \(error.localizedDescription)"
        }
    }
}
