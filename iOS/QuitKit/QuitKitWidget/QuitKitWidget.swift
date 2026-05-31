//
//  QuitKitWidget.swift
//  QuitKitWidget
//

import SwiftUI
import WidgetKit
import AppIntents

struct QuitKitWidgetEntry: TimelineEntry {
    let date: Date
    let content: QuitKitWidgetContent
}

enum QuitKitWidgetContent {
    case loading
    case setup
    case ready(QuitKitWidgetSnapshot)
    case done(QuitKitWidgetSnapshot)
    case failure(String, Date)
}

struct QuitKitWidgetSnapshot {
    let currentDay: Int?
    let currentPhase: Int?
    let takenToday: Int
    let totalToday: Int
    let nextDose: DoseView?

    var nextDoseDate: Date? {
        guard let nextDose else {
            return nil
        }
        return QuitKitDateFormatter.date(from: nextDose.effectiveTime)
    }

    static func from(_ state: AppStateResponse) -> QuitKitWidgetSnapshot {
        QuitKitWidgetSnapshot(
            currentDay: state.currentDay,
            currentPhase: state.currentPhase,
            takenToday: state.todaySchedule.filter { dose in
                dose.status == .taken || (dose.status == .late && dose.takenAt != nil)
            }.count,
            totalToday: state.todaySchedule.count,
            nextDose: state.nextDose
        )
    }

    static let sample = QuitKitWidgetSnapshot(
        currentDay: 2,
        currentPhase: 1,
        takenToday: 2,
        totalToday: 6,
        nextDose: DoseView(
            id: 1,
            dayNumber: 2,
            phase: 1,
            plannedTime: ISO8601DateFormatter().string(from: Date().addingTimeInterval(5400)),
            effectiveTime: ISO8601DateFormatter().string(from: Date().addingTimeInterval(5400)),
            intervalMinutes: 120,
            flexible: false,
            status: .pending,
            takenAt: nil,
            shifted: false
        )
    )
}

struct QuitKitWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuitKitWidgetEntry {
        QuitKitWidgetEntry(date: .now, content: .ready(.sample))
    }

    func getSnapshot(in context: Context, completion: @escaping (QuitKitWidgetEntry) -> Void) {
        if context.isPreview {
            completion(QuitKitWidgetEntry(date: .now, content: .ready(.sample)))
            return
        }

        Task {
            completion(await loadEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuitKitWidgetEntry>) -> Void) {
        Task {
            let entry = await loadEntry()
            completion(Timeline(entries: [entry], policy: .after(nextRefreshDate(for: entry))))
        }
    }

    private func loadEntry() async -> QuitKitWidgetEntry {
        do {
            let state = try await APIClient().state()
            if state.setupNeeded {
                return QuitKitWidgetEntry(date: .now, content: .setup)
            }

            let snapshot = QuitKitWidgetSnapshot.from(state)
            return QuitKitWidgetEntry(
                date: .now,
                content: snapshot.nextDose == nil ? .done(snapshot) : .ready(snapshot)
            )
        } catch {
            return QuitKitWidgetEntry(date: .now, content: .failure(error.localizedDescription, .now))
        }
    }

    private func nextRefreshDate(for entry: QuitKitWidgetEntry) -> Date {
        switch entry.content {
        case .ready(let snapshot):
            if let nextDoseDate = snapshot.nextDoseDate {
                return max(nextDoseDate.addingTimeInterval(30), Date().addingTimeInterval(60))
            }
            return Date().addingTimeInterval(15 * 60)
        case .failure:
            return Date().addingTimeInterval(5 * 60)
        default:
            return Date().addingTimeInterval(15 * 60)
        }
    }
}

struct QuitKitWidgetView: View {
    @Environment(\.widgetFamily) private var widgetFamily

    let entry: QuitKitWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [QuitKitTheme.backgroundTop, QuitKitTheme.backgroundBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            content
                .padding(widgetPadding)
        }
        .containerBackground(QuitKitTheme.backgroundTop, for: .widget)
    }

    private var widgetPadding: EdgeInsets {
        switch widgetFamily {
        case .systemLarge:
            EdgeInsets(top: 24, leading: 24, bottom: 24, trailing: 24)
        default:
            EdgeInsets(top: 8, leading: 18, bottom: 10, trailing: 18)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch entry.content {
        case .loading:
            messageView(title: "QuitKit", message: "Обновляем состояние")
        case .setup:
            messageView(title: "Курс ещё не настроен", message: "Открой приложение, чтобы начать")
        case .failure(_, let date):
            messageView(title: "Backend недоступен", message: "Проверка: \(QuitKitDateFormatter.hourMinute(from: date))")
        case .done(let snapshot):
            widgetLayout(snapshot: snapshot, isDone: true)
        case .ready(let snapshot):
            widgetLayout(snapshot: snapshot, isDone: false)
        }
    }

    @ViewBuilder
    private func widgetLayout(snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> some View {
        switch widgetFamily {
        case .systemLarge:
            largeWidgetLayout(snapshot: snapshot, isDone: isDone)
        default:
            mediumWidgetLayout(snapshot: snapshot, isDone: isDone)
        }
    }

    private func mediumWidgetLayout(snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                Text(compactDayTitle(snapshot))
                    .font(QuitKitTheme.Typography.heading(.subheadline))
                    .foregroundStyle(QuitKitTheme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)

                Spacer()

                Text("\(snapshot.takenToday) / \(max(snapshot.totalToday, 1))")
                    .font(QuitKitTheme.numeric(.subheadline, weight: .black))
                    .monospacedDigit()
                    .foregroundStyle(QuitKitTheme.ink)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.74))
                    .clipShape(Capsule())
                    .accessibilityLabel("Принято \(snapshot.takenToday) из \(max(snapshot.totalToday, 1))")
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(compactNextDoseTitle(snapshot, isDone: isDone))
                    .font(QuitKitTheme.Typography.body(.caption2, weight: .heavy))
                    .foregroundStyle(QuitKitTheme.muted)
                    .lineLimit(1)

                countdown(snapshot)
                    .font(QuitKitTheme.numeric(.title3, weight: .black, scale: 1.12))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .foregroundStyle(QuitKitTheme.ink)
                    .accessibilityLabel(countdownAccessibility(snapshot, isDone: isDone))
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            progressStrip(snapshot, height: 4, spacing: 5)

            if isDone {
                completedAction(height: 36, font: QuitKitTheme.Typography.body(.subheadline, weight: .black))
            } else {
                takeDoseAction(height: 36, font: QuitKitTheme.Typography.body(.subheadline, weight: .black))
            }
        }
    }

    private func largeWidgetLayout(snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(dayTitle(snapshot))
                        .font(QuitKitTheme.Typography.heading(.title3))
                        .foregroundStyle(QuitKitTheme.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Text(snapshot.currentPhase.map { "Фаза \($0)" } ?? "Курс")
                        .font(QuitKitTheme.Typography.body(.footnote, weight: .heavy))
                        .foregroundStyle(QuitKitTheme.muted)
                        .lineLimit(1)
                }

                Spacer()

                Text("\(snapshot.takenToday) / \(max(snapshot.totalToday, 1))")
                    .font(QuitKitTheme.numeric(.title3, weight: .black))
                    .monospacedDigit()
                    .foregroundStyle(QuitKitTheme.ink)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.82))
                    .clipShape(Capsule())
                    .accessibilityLabel("Принято \(snapshot.takenToday) из \(max(snapshot.totalToday, 1))")
            }

            VStack(alignment: .center, spacing: 8) {
                Text(nextDoseTitle(snapshot, isDone: isDone))
                    .font(QuitKitTheme.Typography.body(.subheadline, weight: .heavy))
                    .foregroundStyle(QuitKitTheme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)

                countdown(snapshot)
                    .font(QuitKitTheme.numeric(.largeTitle, weight: .black, scale: 1.08))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
                    .foregroundStyle(QuitKitTheme.ink)
                    .accessibilityLabel(countdownAccessibility(snapshot, isDone: isDone))

                if snapshot.nextDose?.shifted == true {
                    Text("сдвинуто от фактического приёма")
                        .font(QuitKitTheme.Typography.body(.caption, weight: .black))
                        .foregroundStyle(QuitKitTheme.amber)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 18)
            .padding(.vertical, snapshot.nextDose?.shifted == true ? 16 : 22)
            .background(Color.white.opacity(0.72))
            .clipShape(RoundedRectangle(cornerRadius: QuitKitTheme.Radius.card))

            progressStrip(snapshot, height: 8, spacing: 8)

            if isDone {
                completedAction(height: 52, font: QuitKitTheme.Typography.body(.headline, weight: .black))
            } else {
                takeDoseAction(height: 52, font: QuitKitTheme.Typography.body(.headline, weight: .black))
            }
        }
    }

    private func takeDoseAction(height: CGFloat, font: Font) -> some View {
        Button(intent: TakeDoseIntent()) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .imageScale(.medium)

                Text("Принял")
                    .lineLimit(1)
            }
            .font(font)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: height)
            .background(
                LinearGradient(
                    colors: [QuitKitTheme.mint, QuitKitTheme.mint.opacity(0.86)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Отметить следующий приём")
    }

    private func completedAction(height: CGFloat, font: Font) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .imageScale(.medium)

            Text("На сегодня всё")
                .lineLimit(1)
        }
        .font(font)
        .foregroundStyle(QuitKitTheme.mint)
        .frame(maxWidth: .infinity, minHeight: height)
        .background(QuitKitTheme.mintSoft.opacity(0.82))
        .clipShape(Capsule())
    }

    private func messageView(title: String, message: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(QuitKitTheme.Typography.heading(widgetFamily == .systemLarge ? .title3 : .subheadline))
                .foregroundStyle(QuitKitTheme.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.78)

            Text(message)
                .font(QuitKitTheme.Typography.body(widgetFamily == .systemLarge ? .callout : .caption, weight: .bold))
                .foregroundStyle(QuitKitTheme.muted)
                .lineLimit(2)
                .minimumScaleFactor(0.78)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func countdown(_ snapshot: QuitKitWidgetSnapshot) -> Text {
        guard let nextDoseDate = snapshot.nextDoseDate else {
            return Text("готово")
        }

        if nextDoseDate <= Date() {
            return Text("ждёт")
        }

        return Text(timerInterval: Date()...nextDoseDate, countsDown: true)
    }

    private func progressStrip(_ snapshot: QuitKitWidgetSnapshot, height: CGFloat, spacing: CGFloat) -> some View {
        HStack(spacing: spacing) {
            ForEach(0..<max(snapshot.totalToday, 1), id: \.self) { index in
                Capsule()
                    .fill(index < snapshot.takenToday ? QuitKitTheme.mint : Color.secondary.opacity(0.18))
                    .frame(height: height)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Принято \(snapshot.takenToday) из \(max(snapshot.totalToday, 1))")
    }

    private func dayTitle(_ snapshot: QuitKitWidgetSnapshot) -> String {
        guard let currentDay = snapshot.currentDay else {
            return "Сегодня"
        }
        return "День \(currentDay) из 25"
    }

    private func compactDayTitle(_ snapshot: QuitKitWidgetSnapshot) -> String {
        guard let currentDay = snapshot.currentDay else {
            return "Сегодня"
        }
        return "День \(currentDay)"
    }

    private func nextDoseTitle(_ snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> String {
        if isDone || snapshot.nextDose == nil {
            return "Приёмы завершены"
        }
        return "Следующий приём в \(QuitKitDateFormatter.time(from: snapshot.nextDose!.effectiveTime))"
    }

    private func compactNextDoseTitle(_ snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> String {
        if isDone || snapshot.nextDose == nil {
            return "готово"
        }
        return "до \(QuitKitDateFormatter.time(from: snapshot.nextDose!.effectiveTime))"
    }

    private func countdownAccessibility(_ snapshot: QuitKitWidgetSnapshot, isDone: Bool) -> String {
        if isDone || snapshot.nextDose == nil {
            return "На сегодня все приёмы завершены"
        }
        return "До следующего приёма \(QuitKitDateFormatter.time(from: snapshot.nextDose!.effectiveTime))"
    }
}

struct QuitKitWidget: Widget {
    let kind = "QuitKitWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuitKitWidgetProvider()) { entry in
            QuitKitWidgetView(entry: entry)
        }
        .configurationDisplayName("QuitKit")
        .description("Таймер следующего приёма и быстрый чек-ин.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct QuitKitWidgetBundle: WidgetBundle {
    var body: some Widget {
        QuitKitWidget()
    }
}

#Preview(as: .systemMedium) {
    QuitKitWidget()
} timeline: {
    QuitKitWidgetEntry(date: .now, content: .ready(.sample))
}

#Preview(as: .systemLarge) {
    QuitKitWidget()
} timeline: {
    QuitKitWidgetEntry(date: .now, content: .ready(.sample))
}
