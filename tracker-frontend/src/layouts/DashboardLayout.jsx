import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Stack,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Box,
    Divider,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import HomeIcon from '@mui/icons-material/Home';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { useState } from 'react';
import FloatingSessionBar from '../components/FloatingSessionBar';
import RestTimerFloating from '../components/RestTimerFloating';
import useWorkoutTimer from '../hooks/useWorkoutTimer';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import { logoutCleanup } from '../utils/logoutCleanup';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const drawerWidth = 240;
const collapsedWidth = 60;

export default function DashboardLayout() {
    useWorkoutTimer();
    const theme = useTheme();
    const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
    const { pathname } = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const tabs = [
        { to: '/dashboard/start', label: 'Start', icon: <HomeIcon /> },
        { to: '/dashboard/exercises', label: 'Exercises', icon: <FitnessCenterIcon /> },
        { to: '/dashboard/calendar', label: 'Calendar', icon: <CalendarMonthIcon /> },
        { to: '/dashboard/progress', label: 'Progress', icon: <ShowChartIcon /> },
        { to: '/dashboard/instructor', label: 'Instructor', icon: <PersonIcon /> },
        { to: '/dashboard/account', label: 'Account', icon: <SettingsIcon /> },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 可折叠按钮 */}
        {isSmUp && (
            <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', p: 1 }}>
            <IconButton onClick={() => setCollapsed(!collapsed)}>
                {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
            </IconButton>
            </Box>
        )}
        <Divider />
        <List sx={{ flexGrow: 1 }}>
            {tabs.map((t) => (
            <ListItem key={t.to} disablePadding sx={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <ListItemButton
                    component={Link}
                    to={t.to}
                    selected={pathname.startsWith(t.to)}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                        px: collapsed ? 1 : 2,
                        '&.Mui-selected': {
                                bgcolor: '#00bcd4',
                                color: '#fff',
                        },
                        '&:hover': {
                            bgcolor: '#00acc1',
                        },
                    }}
                >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2 }}>{t.icon}</ListItemIcon>
                    {!collapsed && <ListItemText primary={t.label} />}
                </ListItemButton>
            </ListItem>
            ))}
        </List>
        <Divider />
        </Box>
    );

    const handleLogout = () => {
        logoutCleanup(queryClient);
        navigate('/login', { replace: true });
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* 顶部 AppBar */}
        <AppBar
            position="fixed"
            sx={{
            width: {
                sm: `calc(100% - ${isSmUp ? (collapsed ? collapsedWidth : drawerWidth) : 0}px)`,
            },
            ml: { sm: `${isSmUp ? (collapsed ? collapsedWidth : drawerWidth) : 0}px` },
            }}
        >
            <Toolbar>
            {/* 移动端菜单按钮 */}
            <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2, display: { sm: 'none' } }}
            >
                <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {tabs.find((t) => pathname.startsWith(t.to))?.label || 'Dashboard'}
            </Typography>
            <Stack direction="row" spacing={2}>
                <Button color="inherit">Profile</Button>
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </Stack>
            </Toolbar>
        </AppBar>

        {/* 左侧 Drawer */}
        <Box sx={{ width: { sm: collapsed ? collapsedWidth : drawerWidth }, flexShrink: { sm: 0 } }}>
            {/* 移动端 Drawer */}
            <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            >
            {drawer}
            </Drawer>

            {/* 桌面端 Drawer */}
            <Drawer
            variant="permanent"
            sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: collapsed ? collapsedWidth : drawerWidth,
                transition: theme.transitions.create('width', { duration: theme.transitions.duration.standard }),
                },
            }}
            open
            >
            {drawer}
            </Drawer>
        </Box>

        {/* 主内容区 */}
        <Box
            component="main"
            sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            mt: 8,
            bgcolor: 'background.default',
            transition: theme.transitions.create('margin-left', { duration: theme.transitions.duration.standard }),
            }}
        >
            <Outlet />
        </Box>

        {/* 浮动组件 */}
        <FloatingSessionBar />
        <RestTimerFloating />
        </Box>
    );
}
