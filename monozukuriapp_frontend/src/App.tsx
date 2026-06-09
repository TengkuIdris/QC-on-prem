import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { HelmetProvider } from "react-helmet-async";
import theme from "./theme/theme";
import Routers from "./routes/Routers";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Amplify } from "aws-amplify";
import { authConfig } from "./config/amplify-config";

// On-prem: skip Amplify.configure when auth is disabled or pool ID is missing.
// Calling configure() with an undefined userPoolId throws at boot.
const authDisabled = import.meta.env.VITE_DISABLE_AUTH === "true";
if (!authDisabled && import.meta.env.VITE_USER_POOL_ID) {
  Amplify.configure({
    Auth: authConfig,
  });
}

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routers />
        </BrowserRouter>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
