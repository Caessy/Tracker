import { create } from 'zustand';

const defaultSet = () => ({
    reps: '',
    weight: '',
    weight_unit: 'kg',
    rest_sec: 60,
    completed: false,
    suggested: null,
});

const initialRestTimer = {
    isActive: false,
    seconds: 0,
    targetSet: null,
    startTimestamp: null,
};

const initialState = {
    active: false,
    type: null,
    routineId: null,
    routineName: '',
    startedAt: null,
    isPaused: false,
    durationSec: 0,
    exercises: [],
    _restInterval: null,
    isModified: false,
    restTimer: { ...initialRestTimer },
};

export const useSessionStore = create((set, get) => ({
    ...initialState,

    // total session timer
    startTimer: () => set({ startedAt: Date.now(), isPaused: false }),
    pauseTimer: () => set({ isPaused: true }),
    resumeTimer: () => set({ isPaused: false }),
    tick: (delta = 1) => set({ durationSec: get().durationSec + delta }),

    // session lifecycle
    startCustomSession: (initialExercises = []) =>
        set({
            active: true,
            type: 'custom',
            routineId: null,
            routineName: '',
            startedAt: Date.now(),
            isPaused: false,
            durationSec: 0,
            exercises: initialExercises.map(ex => ({
                exercise_type_id: ex.exercise_type_id,
                name: ex.exercise_name || ex.name || '',
                sets: (ex.sets && ex.sets.length > 0)
                    ? ex.sets.map(s => ({
                        reps: s.reps ?? '',
                        weight: s.weight ?? '',
                        weight_unit: s.weight_unit ?? 'kg',
                        rest_sec: s.rest_sec ?? '',
                        completed: false,
                        }))
                    : [{
                        reps: '',
                        weight: '',
                        weight_unit: 'kg',
                        rest_sec: '',
                        completed: false,
                    }]
            }))

        }),

    startRoutineSession: (routineData) => {
    // routineData 从 GET /routine/:id 返回
    // routineData.exercises 是数组，每个元素包含：
    // id, name, order, placeholder = { reps, weight, weight_unit, rest_sec }
    if (!routineData) {
        console.error('startRoutineSession: routineData is undefined');
        return;
    }
    set({
        active: true,
        type: 'routine',
        routineId: routineData.id,
        routineName: routineData.name,
        startedAt: Date.now(),
        isPaused: false,
        durationSec: 0,
        exercises: routineData.exercises.map((e) => ({
            id: e.id,
            name: e.name,
            exercise_type_id: e.id,
            sets: Array.from({ length: e.placeholder?.set_count || 1 }).map((_, idx) => ({
                completed: false,
                suggested: e.placeholder ? {
                    reps: e.placeholder.reps ?? 0,
                    weight: e.placeholder.weight ?? 0,
                    weight_unit: e.placeholder.weight_unit ?? 'kg',
                    rest_sec: e.placeholder.rest_sec ?? 60,
                } : null,
                reps: '',
                weight: '',
                weight_unit: e.placeholder?.weight_unit ?? 'kg',
                rest_sec: e.placeholder?.rest_sec ?? 60,
            })),
        })),
        isModified: false, // 是否已经从 routine 转 custom
    });
},


    // change routine workout to custom workout
    convertToCustom: () => {
        const { exercises } = get();
        set({
            type: 'custom',
            routineId: null,
            routineName: '',
            isModified: true,
            exercises: exercises.map(e => ({
                ...e,
                sets: e.sets.map(s => ({
                    ...s,
                    sets: e.sets.map(s => ({ ...s, suggested: null })),
                }))
            }))
        });
    },

    stopAndReset: () => {
        if (get()._restInterval) clearInterval(get()._restInterval);
        set({ ...initialState });
    },

    // exercises operations
    addExercises: (toAdd) => {
        const current = get().exercises;
        const map = new Map(current.map((e) => [e.exercise_type_id, e]));
        
        const newExs = toAdd.filter(e => !map.has(e.id));
        if (newExs.length === 0) return;

        if (get().type === 'routine') {
            const confirmChange = window.confirm(
                'You are editing exercise types in a routine, which will make this workout to a custom workout, continue?'
            );
            if (!confirmChange) return;
            get().convertToCustom();
        }
        
        newExs.forEach((e) => {
            map.set(e.id, {
                exercise_type_id: e.id,
                name: e.name,
                sets: [defaultSet()],
            });
        });

        set({ exercises: Array.from(map.values()) });
    },

    removeExercise: (exercise_type_id) => {
        if (get().type === 'routine') {
            const confirmChange = window.confirm(
                'You are now deleting exercise in a routine, which will make this workout a custom workout, continue?'
            );
            if (!confirmChange) return
            get().convertToCustom();
        }

        set({
            exercises: get().exercises.filter(
                (e) => e.exercise_type_id !== exercise_type_id
            ),
        });
    },
    
    addSet: (exercise_type_id) =>
        set({
            exercises: get().exercises.map((e) =>
                e.exercise_type_id === exercise_type_id
                    ? { ...e, sets: [...e.sets, defaultSet()] }
                    : e
            ),
        }),

    updateSet: (exercise_type_id, setIndex, key, value) =>
        set({
            exercises: get().exercises.map((e) => {
                if (e.exercise_type_id !== exercise_type_id) return e;
                const sets = e.sets.map((s, i) =>
                    i === setIndex ? { ...s, [key]: value } : s
                );
                return { ...e, sets };
            }),
        }),

    removeSet: (exercise_type_id, setIndex) =>
        set({
            exercises: get().exercises.map((e) => {
                if (e.exercise_type_id !== exercise_type_id) return e;
                const sets = e.sets.filter((_, i) => i !== setIndex);
                return { ...e, sets: sets.length ? sets : [defaultSet()] };
            }),
        }),

    // rest timer
    restTimer: { isActive: false, seconds: 0, targetSet: null, startTimestamp: null },

    startRest: (exercise_type_id = null, setIndex = null, seconds = 60) => {
        if (get()._restInterval) clearInterval(get()._restInterval);

        const startTimestamp = Date.now();
        set({ restTimer: { isActive: true, seconds, targetSet: { exercise_type_id, setIndex }, startTimestamp} });

        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        const interval = setInterval(() => {
            const { restTimer } = get();
            if (!restTimer.isActive) {
                clearInterval(interval);
                return;
            }
            if (restTimer.seconds > 0) {
                set({
                    restTimer: { ...restTimer, seconds: restTimer.seconds - 1 },
                });
            } else {
                clearInterval(interval);
                
                // calculate the actual rest time
                const actualRest = Math.round((Date.now() - restTimer.startTimestamp) / 1000);
                
                if (restTimer.targetSet) {
                    const { exercise_type_id, setIndex } = restTimer.targetSet;
                    set({
                        exercises: get().exercises.map(e => {
                            if (e.exercise_type_id !== exercise_type_id) return e;
                            const sets = e.sets.map((s, i) => {
                                if (i === setIndex) {
                                    return {
                                        ...s,
                                        actual_rest_sec: actualRest,
                                        rest_sec: actualRest,
                                    };
                                }
                                return s;
                            });
                            return { ...e, sets };
                        }),
                        restTimer: { isActive: false, seconds: 0, targetSet: null, startTimestamp: null }
                    });
                } else {
                    set({ restTimer: { isActive: false, seconds: 0, targetSet: null, startTimestamp: null } });
                }

                //notification (if browser allows)
                if (Notification.permission === 'granted') {
                    new Notification('Rest complete! Time to lift!');
                }
            }
        }, 1000);

        set({ _restInterval: interval });
    },

    stopRest: () => {
        if (get()._restInterval) clearInterval(get()._restInterval);
        set({ restTimer: { ...initialRestTimer } });
    },

    addRestSeconds: (delta) =>
        set((state) => ({
            restTimer: {
                ...state.restTimer,
                seconds: Math.max(0, state.restTimer.seconds + delta),
            },
        })),
    
    completeSet: (exercise_type_id, setIndex) => {
        const { exercises } = get();
        let triggeredRest = false;

        const newExercises = exercises.map((e) => {
            if (e.exercise_type_id !== exercise_type_id) return e;

            const sets = e.sets.map((s, i) => {
                if (i === setIndex) {
                    const newCompleted = !s.completed;
                    if (newCompleted) triggeredRest = true;
                    return { ...s, completed: newCompleted };
                }
                return s;
            });
            return { ...e, sets };
        });
        set({ exercises: newExercises });

        if (triggeredRest) {
            // read current rest time Textfield
            const ex = newExercises.find(e => e.exercise_type_id === exercise_type_id);
            if (!ex || !ex.sets[setIndex]) return;
            const targetSet = ex.sets[setIndex];
            get().startRest(exercise_type_id, setIndex, targetSet.rest_sec);
        }
    },

    reset: () => {
        if (get()._restInterval) clearInterval(get()._restInterval);
        set({ ...initialState });
    },
    
}));