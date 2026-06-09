import { DataItem } from "../../features/pareto/types";

export type Action =
  | { type: "ADD_ITEM" }
  | { type: "REMOVE_ITEM"; index: number }
  | { type: "UPDATE_ITEM"; index: number; field: keyof DataItem; value: string | number }
  | { type: "SET_ITEMS"; items: DataItem[]; upload: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

export function reducer(state: { items: DataItem[]; error: string | null; upload: boolean }, action: Action) {
  switch (action.type) {
    case "ADD_ITEM":
      return { ...state, items: [...state.items, { name: "", quantity: 0 }] };
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((_, index) => index !== action.index) };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item, index) =>
          index === action.index ? { ...item, [action.field]: action.value } : item,
        ),
      };
    case "SET_ITEMS":
      return { ...state, items: action.items, upload: action.upload };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}
