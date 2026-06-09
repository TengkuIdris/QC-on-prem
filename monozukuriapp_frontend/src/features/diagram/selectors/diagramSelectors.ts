import { RootState } from "../../../store/store";
import { DiagramState } from "../types/index"; // 追加

export const selectDiagramData = (state: RootState) => state.diagram.data;
export const selectDiagramLoading = (state: RootState) => state.diagram.loading;
export const selectDiagramError = (state: RootState) => state.diagram.error;
