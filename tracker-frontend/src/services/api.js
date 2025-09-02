import axios from 'axios';

const api= axios.create({
    baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 401 interceptor
let handling401 = false;
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 && !handling401) {
            handling401 = true;
            try {
                useAuthStore.getState().reset?.();
            } finally {
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    }
);

export const getMe = () => api.get('/auth/me');

// Routines API
export const getRoutines = () => api.get('/routine');
export const getRoutineById = (id) => api.get(`/routine/${id}`);
export const createRoutine = (data) => api.post('/routine', data);
export const deleteRoutine = (id) => api.delete(`/routine/${id}`);

// Exercises API
export const getExercises = (params = {}) => api.get('/exercise', { params });
export const getExerciseById = (id) => api.get(`/exercise/${id}`);
export const createExercise = (data) => api.post('/exercise', data);
export const updateExerciseInstruction = (id, instruction) => api.put(`/exercise/${id}/instruction`, { instruction });
export const updateExerciseNote = (id, note) => api.put(`/exercise/${id}/note`, {note});
export const getExerciseHistory = (exerciseId, page = 1, limit = 10) => {
    return api.get(`/exercise/${exerciseId}`, { params: { page, limit } });
};
export const deleteCustomExercise = (id) => api.delete(`/exercise/${id}`);

// workout API
export const createWorkout = (data) => api.post('/workout', data);
export const createWorkoutWithRoutine=(data)=>api.post('/workout/with-routine', data);
export const getWorkoutById = (id) => api.get(`/workout/${id}`);
export const updateWorkout = (id, data) => api.put(`/workout/${id}`, data);
export const deleteWorkout = (id) => api.delete(`/workout/${id}`);
export const detachRoutine = (id) => api.post(`/workout/${id}/detach-routine`)

// Calendar API
export const getCalendarMonth = (year, month, user_id) => {
    const params = { year, month };
    if (user_id) params.user_id = user_id;
    return api.get('/views/calendar/month', { params });
};

export const getCalendarDay = (date, user_id) => {
    const params = { date };
    if (user_id) params.user_id = user_id;
    return api.get('/views/calendar', { params });
};

// Progress API
export const getMonthlyProgress = (month) => api.get('/views/progress/monthly', { params: { month } });
export const getYearlyProgress = (year) => api.get('/views/progress/yearly', { params: { year } });

// instructor API
export const becomeInstructor = () => api.put('/instructor/become');
export const generateLink = () => api.post('/instructor/link/generate');
export const acceptLink = (token) => api.post('/instructor/link/accept', { token });
export const deleteLink = (linkId) => api.delete(`/instructor/link/${linkId}`);
export const getTrainees = () => api.get('/views/instructor/trainees');
export const getInstructors = () => api.get('/views/user/instructors');

// trainee related API
export const getTraineeCalendarMonth = (year, month, user_id) => {
    const params = { year, month, user_id };
    return api.get('/views/calendar/month', { params });
}

export const getTraineeMonthlyProgress = (month, user_id) => api.get('/views/progress/monthly', { params: { month, user_id } });
export const getTraineeYearlyProgress = (year, user_id) => api.get('/views/progress/yearly', { params: { year, user_id } });

// comment related API
export const getTraineeWorkoutComment = (userId, workoutId) => {
    return api.get(`/instructor/user/${userId}/workout/${workoutId}/my-comments`);
};

export const createTraineeWorkoutComment = (userId, workoutId, commentText) => {
    return api.post(`/instructor/user/${userId}/workout/${workoutId}/comments`, { comment_text: commentText });
};

export const updateTraineeWorkoutComment = (userId, workoutId, commentId, commentText) => {
    return api.put(`/instructor/user/${userId}/workout/${workoutId}/comments/${commentId}`, { comment_text: commentText });
};

export const deleteTraineeWorkoutComment = (userId, workoutId, commentId) => {
    return api.delete(`/instructor/user/${userId}/workout/${workoutId}/comments/${commentId}`);
};

export const getWorkoutComments = (workoutId) => {
    return api.get(`/workout/${workoutId}/comments`);
};

// MFA API
export const enableMFA = () => api.post('/mfa/enable');
export const enabledVerifyMFA = (otp) => api.post('/mfa/enable/verify', { otp });
export const verifyMFA = (otp) => api.post('/mfa/verify', { otp });
export const recoverMFA = (recoveryCode) => api.post('/mfa/recover', { recoveryCode });
export const disableMFA = () => api.post('/mfa/disable');

export const deleteAccount = () => api.delete('/auth/delete-account');

export default api;