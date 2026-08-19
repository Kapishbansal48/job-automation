import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  searchQuery: string;
  screenshotModalJobId: string | null;
}

const initialState: UIState = {
  searchQuery: "",
  screenshotModalJobId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    openScreenshotModal(state, action: PayloadAction<string>) {
      state.screenshotModalJobId = action.payload;
    },
    closeScreenshotModal(state) {
      state.screenshotModalJobId = null;
    },
  },
});

export const { setSearchQuery, openScreenshotModal, closeScreenshotModal } = uiSlice.actions;
export default uiSlice.reducer;
