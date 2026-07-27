import { AppBar, Toolbar, Typography } from "@mui/material";

export function TopBar() {
  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: "1px solid #eee" }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Mixpak System
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
