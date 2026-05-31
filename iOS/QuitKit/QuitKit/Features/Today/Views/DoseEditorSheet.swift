//
//  DoseEditorSheet.swift
//  QuitKit
//

import SwiftUI

struct DoseEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var editor: DoseEditorState
    @State private var errorMessage: String?
    @State private var showsDeleteConfirmation = false

    let isBusy: Bool
    let onSave: (DoseEditorState) async -> String?
    let onDelete: (DoseEditorState) async -> String?

    init(
        editor: DoseEditorState,
        isBusy: Bool,
        onSave: @escaping (DoseEditorState) async -> String?,
        onDelete: @escaping (DoseEditorState) async -> String?
    ) {
        self._editor = State(initialValue: editor)
        self.isBusy = isBusy
        self.onSave = onSave
        self.onDelete = onDelete
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Фактическое время", selection: $editor.takenAt, displayedComponents: [.date, .hourAndMinute])
                        .accessibilityHint("Это время будет сохранено как фактический приём.")

                    LabeledContent("План", value: QuitKitDateFormatter.time(from: editor.dose.effectiveTime))
                    LabeledContent("Статус", value: editor.dose.status.title)
                } header: {
                    Text("Приём в \(QuitKitDateFormatter.time(from: editor.dose.effectiveTime))")
                }

                if let errorMessage = errorMessage ?? editor.errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(QuitKitTheme.rounded(.callout, weight: .bold))
                            .foregroundStyle(QuitKitTheme.coral)
                            .textSelection(.enabled)
                    }
                }

                Section {
                    Button("Сохранить", systemImage: "checkmark.circle.fill") {
                        Task {
                            errorMessage = await onSave(editor)
                            if errorMessage == nil {
                                dismiss()
                            }
                        }
                    }
                    .disabled(isBusy)

                    Button("Удалить отметку", systemImage: "trash", role: .destructive) {
                        showsDeleteConfirmation = true
                    }
                    .disabled(isBusy)
                }
            }
            .navigationTitle("Редактировать приём")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Готово") {
                        dismiss()
                    }
                }
            }
            .confirmationDialog("Удалить отметку приёма?", isPresented: $showsDeleteConfirmation, titleVisibility: .visible) {
                Button("Удалить отметку", role: .destructive) {
                    Task {
                        errorMessage = await onDelete(editor)
                        if errorMessage == nil {
                            dismiss()
                        }
                    }
                }
                Button("Отмена", role: .cancel) {}
            } message: {
                Text("Слот вернётся в непринятое состояние, а прогресс пересчитается.")
            }
        }
        .presentationDetents([.medium, .large])
    }
}
