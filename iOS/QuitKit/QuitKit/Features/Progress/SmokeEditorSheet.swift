//
//  SmokeEditorSheet.swift
//  QuitKit
//

import SwiftUI

struct SmokeEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var editor: SmokeEditorState
    @State private var errorMessage: String?
    @State private var showsDeleteConfirmation = false

    let isBusy: Bool
    let onSave: (SmokeEditorState) async -> String?
    let onDelete: (SmokeEditorState) async -> String?

    init(
        editor: SmokeEditorState,
        isBusy: Bool,
        onSave: @escaping (SmokeEditorState) async -> String?,
        onDelete: @escaping (SmokeEditorState) async -> String?
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
                    DatePicker("Время записи", selection: $editor.loggedAt, displayedComponents: [.date, .hourAndMinute])
                        .accessibilityHint("Это время будет сохранено для записи курения.")

                    TextField("Заметка", text: $editor.note, axis: .vertical)
                        .lineLimit(2...4)
                        .accessibilityHint("Можно оставить пустым.")

                    LabeledContent("Тип", value: editor.event.kind.title)
                } header: {
                    Text("Запись в \(QuitKitDateFormatter.hourMinute(from: editor.loggedAt))")
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

                    Button("Удалить запись", systemImage: "trash", role: .destructive) {
                        showsDeleteConfirmation = true
                    }
                    .disabled(isBusy)
                }
            }
            .navigationTitle("Редактировать курение")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Готово") {
                        dismiss()
                    }
                }
            }
            .confirmationDialog("Удалить запись курения?", isPresented: $showsDeleteConfirmation, titleVisibility: .visible) {
                Button("Удалить запись", role: .destructive) {
                    Task {
                        errorMessage = await onDelete(editor)
                        if errorMessage == nil {
                            dismiss()
                        }
                    }
                }
                Button("Отмена", role: .cancel) {}
            } message: {
                Text("Запись исчезнет из истории, а прогресс и серия пересчитаются.")
            }
        }
        .presentationDetents([.medium, .large])
    }
}
