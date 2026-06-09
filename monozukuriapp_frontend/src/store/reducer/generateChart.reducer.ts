import { StateType } from "../../features/pareto/ParetoPage";

interface ActionType {
  type: "GENERATE_BEFORE_CHART" | "GENERATE_AFTER_CHART" | "SET_ERROR" | "CLEAR_ERROR";
  error?: string;
}

export function reducer(state: StateType, action: ActionType): StateType {
  switch (action.type) {
    case "GENERATE_BEFORE_CHART":
      return { ...state, showBeforeChart: true };
    case "GENERATE_AFTER_CHART":
      return { ...state, showAfterChart: true };
    case "SET_ERROR":
      return { ...state, error: action.error ?? null };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}
