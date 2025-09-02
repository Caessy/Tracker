import React from "react";
import { Box, Grid, Paper, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function AuthLayout({ title, children }) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

    const bgBase = theme.palette.background.default;
    const p = theme.palette.primary.main;
    const s = theme.palette.secondary.main;

    return (
        <Box
        sx={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "stretch",
            position: "relative",
            backgroundColor: bgBase,
            overflow: "hidden",
            '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: p,
            clipPath: { xs: 'polygon(100% 0, 100% 30%, 70% 0)', md: 'polygon(100% 0, 100% 45%, 55% 0)' },
            pointerEvents: 'none',
            zIndex: 0,
            },
            '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: s,
            clipPath: { xs: 'polygon(0 100%, 30% 100%, 0 70%)', md: 'polygon(0 100%, 45% 100%, 0 55%)' },
            pointerEvents: 'none',
            zIndex: 0,
            },
        }}
        >
        <Grid container sx={{ flex: 1, position: "relative", zIndex: 1 }}>
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

    function LogoPanel() {
    const theme = useTheme();
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
        <DumbbellMark />
        </Box>
    );
    }

    function DumbbellMark() {
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