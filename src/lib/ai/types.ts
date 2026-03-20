export interface MusicSuggestion {
  id: string;
  title: string;
  reason: string;
}

export interface SuggestionContext {
  churchId: string;
  serviceId: string;
  slotType: string;
  date: string;
  liturgicalName: string;
  season: string;
  colour: string;
  readings: { position: string; reference: string }[];
  collect?: string;
  recentPerformances: { title: string; date: string }[];
  availableBooks: string[];
}

export interface LLMProvider {
  suggestMusic(context: SuggestionContext): Promise<MusicSuggestion[]>;
}
