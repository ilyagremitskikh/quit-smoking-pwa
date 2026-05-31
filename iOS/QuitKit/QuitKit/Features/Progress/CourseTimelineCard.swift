//
//  CourseTimelineCard.swift
//  QuitKit
//

import SwiftUI

struct CourseTimelineCard: View {
    let days: [ProgressDay]
    let milestones: [CourseMilestone]

    var body: some View {
        VStack(alignment: .leading, spacing: QuitKitTheme.Spacing.section) {
            Label("25 дней", systemImage: "calendar")
                .font(QuitKitTheme.rounded(.headline, weight: .black))
                .foregroundStyle(QuitKitTheme.ink)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 7), count: 5), spacing: 7) {
                ForEach(days, id: \.dayNumber) { day in
                    DayTile(day: day, milestone: milestones.first { $0.day == day.dayNumber })
                }
            }
        }
        .padding(QuitKitTheme.Spacing.card)
        .calmCard()
    }
}
