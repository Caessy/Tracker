import React from "react";
import { Box, Grid, Paper, Typography, useMediaQuery } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

export default function AuthLayout({ title, children }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const bgBase = theme.palette.background.default; // respects theme mode
  const p = theme.palette.primary.main;
  const s = theme.palette.secondary.main;

  // gentle stripes, adjustable via opacity + size
  const stripeA = alpha(p, 0.08);
  const stripeB = alpha(s, 0.08);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "stretch",
        // layered backgrounds: base color + two stripe sets for depth
        background: `
          ${bgBase},
          repeating-linear-gradient(45deg, ${stripeA}, ${stripeA} 24px, transparent 24px, transparent 48px),
          repeating-linear-gradient(135deg, ${stripeB}, ${stripeB} 24px, transparent 24px, transparent 48px)
        `,
      }}
    >
      <Grid container sx={{ flex: 1 }}>
        {/* Logo side (right on desktop, top on mobile) */}
        <Grid
          item
          xs={12}
          md={6}
          order={{ xs: 1, md: 2 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 4, md: 6 },
          }}
        >
          <LogoPanel />
        </Grid>

        {/* Form side (left on desktop, bottom on mobile) */}
        <Grid
          item
          xs={12}
          md={6}
          order={{ xs: 2, md: 1 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2, sm: 3, md: 6 },
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              maxWidth: 420,
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              backdropFilter: "saturate(120%) blur(4px)",
            }}
          >
            {title && (
              <Typography component="h1" variant={isMdUp ? "h4" : "h5"} sx={{ mb: 2, fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {/* Normalize any child page margins so your existing pages drop in nicely */}
            <Box sx={{
              "& > *:first-of-type": { mt: 0 },
              "& .MuiBox-root": { mx: 0, mt: 0 },
              "& form": { margin: 0 },
            }}>
              {children}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/** Big, friendly Workout Tracker logo block */
function LogoPanel() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark ? theme.palette.grey[300] : theme.palette.grey[800];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 640,
        textAlign: { xs: "center", md: "left" },
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: 800,
          letterSpacing: -0.5,
          lineHeight: 1.05,
          mb: 1,
        }}
      >
        Workout Tracker
      </Typography>
      <Typography variant="h6" sx={{ opacity: 0.8, mb: 3 }}>
        Log. Progress. Conquer your goals.
      </Typography>
      {/* Simple mark that scales nicely */}
      <DumbbellMark />
    </Box>
  );
}

function DumbbellMark() {
  // Inline SVG so it inherits currentColor
  return (
    <Box aria-hidden sx={{ display: "inline-flex", mt: 1 }}>
      <svg width="220" height="64" viewBox="0 0 220 64" role="img">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <g fill="url(#g1)">
          <rect x="0" y="22" width="40" height="20" rx="4" />
          <rect x="46" y="18" width="18" height="28" rx="3" />
          <rect x="68" y="30" width="84" height="4" rx="2" />
          <rect x="156" y="18" width="18" height="28" rx="3" />
          <rect x="178" y="22" width="40" height="20" rx="4" />
        </g>
      </svg>
    </Box>
  );
}

