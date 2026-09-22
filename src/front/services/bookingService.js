import { apiRequest } from "./apiClient";

export const getWorkerBookings = (token) =>
    apiRequest("/api/bookings", { token });

export const completeBookingTask = (taskId, token) =>
    apiRequest(`/api/booking-tasks/${taskId}`, {
        method: "PATCH",
        token,
        body: { status: "completed" },
    });

export const completeBooking = (bookingId, token) =>
    apiRequest(`/api/bookings/${bookingId}/complete`, {
        method: "PATCH",
        token,
    });