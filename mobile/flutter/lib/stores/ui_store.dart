import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class UiState {
  final ThemeMode themeMode;
  final bool dataSaverEnabled;
  final String language;

  const UiState({this.themeMode = ThemeMode.system, this.dataSaverEnabled = false, this.language = 'en'});

  UiState copyWith({ThemeMode? themeMode, bool? dataSaverEnabled, String? language}) {
    return UiState(
      themeMode: themeMode ?? this.themeMode,
      dataSaverEnabled: dataSaverEnabled ?? this.dataSaverEnabled,
      language: language ?? this.language,
    );
  }
}

class UiStore extends StateNotifier<UiState> {
  UiStore() : super(const UiState());

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
  }

  void toggleTheme() {
    final newMode = state.themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    state = state.copyWith(themeMode: newMode);
  }

  void setDataSaver(bool enabled) {
    state = state.copyWith(dataSaverEnabled: enabled);
  }

  void setLanguage(String lang) {
    state = state.copyWith(language: lang);
  }
}

final uiStoreProvider = StateNotifierProvider<UiStore, UiState>((ref) {
  return UiStore();
});
