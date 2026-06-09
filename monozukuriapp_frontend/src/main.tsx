import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import "raphael";
import "treant-js/Treant.css";
import "treant-js";

// 開発環境でのモックを適用
// if (import.meta.env.DEV) {
//   // モジュールモックの設定
//   import("./mocks/authMock").then(({ setupMockAuth }) => {
//     setupMockAuth();
//   });
// }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
    <Toaster />
  </Provider>,
);
