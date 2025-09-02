import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getExercises, deleteCustomExercise } from '../../services/api';
import {
  Box, Stack, Button, Typography, TextField, Grid, Card, CardContent, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCustomExerciseDialog from '../../components/addCustomExerciseDialog';
import { useConfirmDialogStore } from '../../store/useConfirmDialogStore';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'];

export default function ExercisesPage() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const navigate = useNavigate();

  const showConfirm = useConfirmDialogStore(s => s.show);

  // Fetch all exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => (await getExercises()).data,
  });

  // 删除 Custom Exercise
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCustomExercise(id),

    // optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries(['exercises']); // cancel the current request to avoid conflict
      const previousExercises = queryClient.getQueryData(['exercises']);

      queryClient.setQueryData(['exercises'], (old = []) =>
        old.filter((ex) => ex.id !== id)
      ); // remove the deleted exercise from cache
      return { previousExercises };
    },

    onError: (err, id, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(['exercises'], context.previousExercises);
      }
    },
    
    onSettled: () => queryClient.invalidateQueries(['exercises']),
  });

  // Group & filter exercises
  const groupedExercises = useMemo(() => {
    const groups = {};

    // 前端过滤：搜索 & group
    const filtered = exercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
      const matchGroup =
        selectedGroup === 'All' ||
        (selectedGroup === 'Custom' && ex.user_id) ||
        ex.muscle_group === selectedGroup;
      return matchSearch && matchGroup;
    });

    filtered.forEach(ex => {
      const group = ex.muscle_group || 'Uncategorized';

      if (!groups[group]) groups[group] = [];
      groups[group].push(ex);

      if (ex.user_id) {
        if (!groups['Custom']) groups['Custom'] = [];
        groups['Custom'].push(ex);
      }
    });

    return groups;
    }, [exercises, selectedGroup, search]);

  return (
  <Box height="calc(100vh - 64px)" display="flex">
    {/* Left Navigation */}
    <Box
      width={160}
      display={{ xs: 'none', md: 'flex' }} // 移动端隐藏
      flexDirection="column"
      position="sticky"
      top={0}
      height="100%"
      borderRight="1px solid #ddd"
      p={1}
      bgcolor="background.paper"
    >
      {['All', ...MUSCLE_GROUPS, 'Custom'].map((group) => (
        <Button
          key={group}
          variant={selectedGroup === group ? 'contained' : 'text'}
          onClick={() => setSelectedGroup(group)}
          sx={{
            justifyContent: 'flex-start',
            mb: 1,
            fontSize: '1rem',
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          {group}
        </Button>
      ))}
    </Box>

    {/* Right Content */}
    <Box
      flex={1}
      overflow="auto"
      p={{ xs: 1.5, sm: 2, md: 3 }}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      {/* Top Bar */}
      <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
        <Typography variant="h5" flex={1} fontWeight={600}>
          Exercises Base
        </Typography>
        <TextField
          size="small"
          placeholder="Search exercises"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 200 }, flexShrink: 0 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCustomDialogOpen(true)}
        >
          Add Custom
        </Button>
      </Stack>

      {/* Exercise Groups */}
      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
        Object.entries(groupedExercises).map(([groupName, exList]) => (
          <Box key={groupName}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {groupName}
            </Typography>
            <Grid container spacing={2}>
              {exList.map((ex) => (
                <Grid item key={ex.id} xs={12} sm={6} md={4} lg={3} xl={2}>
                  <Card
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 0 12px rgba(0,255,128,0.7)',
                        border: '1px solid #00ff80',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => navigate(`../exercise/${ex.id}`)}
                  >
                    {ex.user_id && (
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'error.light',
                            '&:hover': { bgcolor: 'error.main' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // 避免触发卡片跳转
                            showConfirm({
                              title: 'Delete Custom Exercise',
                              message: 'Are you sure to delete this exercise?',
                              onConfirm: () => {
                              deleteMutation.mutate(ex.id);
                          }})}}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    <CardContent
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 80,
                      }}
                    >
                      <Typography
                        align="center"
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}
                      >
                        {ex.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>

    {/* Add Custom Exercise Dialog */}
    <AddCustomExerciseDialog
      open={customDialogOpen}
      onClose={() => setCustomDialogOpen(false)}
      onSuccess={() => queryClient.invalidateQueries(['exercises'])}
    />
  </Box>
);

}
