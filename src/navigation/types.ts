export type RootTabParamList = {
  Home: undefined;
  Rooms: undefined;
  Calendar: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  HomeDashboard: undefined;
  Today: undefined;
  Board: undefined;
  Budget: undefined;
  TaskDetail: { taskId: string };
  EventDetail: { eventId: string };
  ExpenseDetail: { expenseId: string };
  TaskForm: { taskId?: string; roomId?: string } | undefined;
  EventForm: { eventId?: string } | undefined;
  ExpenseForm: { expenseId?: string; roomId?: string } | undefined;
  SearchFilters: { initialQuery?: string } | undefined;
  Quotes: undefined;
  QuoteForm: { quoteId?: string } | undefined;
};

export type RoomsStackParamList = {
  RoomsList: undefined;
  RoomDetail: { roomId: string };
  RoomForm: { roomId?: string } | undefined;
  AttachmentForm: { roomId: string; attachmentId?: string };
  TaskDetail: { taskId: string };
  TaskForm: { taskId?: string; roomId?: string } | undefined;
  ExpenseDetail: { expenseId: string };
  ExpenseForm: { expenseId?: string; roomId?: string } | undefined;
};

export type CalendarStackParamList = {
  Agenda: undefined;
  EventDetail: { eventId: string };
  EventForm: { eventId?: string } | undefined;
  TaskDetail: { taskId: string };
  TaskForm: { taskId?: string; roomId?: string } | undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};
