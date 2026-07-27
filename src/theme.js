import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#006CFF",
    },
    secondary: {
      main: "#00C853",
    },
    background: {
      default: "#F7F9FC",
      paper: "#FFFFFF",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    h6: { fontWeight: 600 },
  },
});
