import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExercises } from '../services/api';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Grid, Card, CardActionArea, CardContent, Stack, Button, Chip, Typography
} from '@mui/material';

export default function ExercisePickerDialog({ open, onClose, onConfirm }) {
    const { data } = useQuery({
        queryKey: ['exercises'],
        queryFn: async () => (await getExercises()).data,
        enabled: open });

    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());

    const searchRef = useRef(null);
    // focus search input when dialog open
    useEffect(() => {
        if (open && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open]);

    // change list of exercises when search or data changes
    // frontend filter
    const list = useMemo(() => {
        const raw = data || [];
        if (!search.trim()) return raw;
        const kw = search.toLowerCase();
        return raw.filter(e => e.name.toLowerCase().includes(kw));
    }, [data, search]);

    // always copy a new Set to send back
    const toggle = (id) => {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const confirm = () => {
        const chosen = (data || []).filter(e => selected.has(e.id));
        onConfirm(chosen);
        onClose();
        setSelected(new Set());
        setSearch('');
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Select Exercises</DialogTitle>
            <DialogContent>
                <Stack gap={2}>
                    <TextField
                    size="small"
                    label="Search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    />
                    <Grid container spacing={2}>
                        {list.map(e => {
                            const active = selected.has(e.id);
                            return (
                                <Grid item xs={12} sm={6} md={4} key={e.id}>
                                    <Card
                                        variant={active ? 'outlined' : 'elevation'}
                                        sx={{ borderColor: active ? 'primary.main' : undefined }}
                                    >
                                        <CardActionArea onClick={() => toggle(e.id)}>
                                            <CardContent>
                                                <Stack gap={1}>
                                                    <Typography variant="subtitle1">{e.name}</Typography>
                                                    <Stack direction="row" gap={1}>
                                                        <Chip size="small" label={e.muscle_group} />
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={confirm}
                    disabled={selected.size === 0}
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
}