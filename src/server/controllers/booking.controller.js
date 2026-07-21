import { bookingService } from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created, noContent } from '../utils/apiResponse.js';

export const bookingController = {
  me: asyncHandler(async (req, res) => {
    ok(res, await bookingService.me(req.user.tenantId, req.user.id));
  }),

  availability: asyncHandler(async (req, res) => {
    const { barberId, date, serviceIds } = req.validatedQuery;
    ok(
      res,
      await bookingService.availability(req.user.tenantId, {
        barberId,
        date,
        serviceIds,
      })
    );
  }),

  book: asyncHandler(async (req, res) => {
    created(res, await bookingService.book(req.user.tenantId, req.user.id, req.body));
  }),

  myAppointments: asyncHandler(async (req, res) => {
    ok(res, await bookingService.myAppointments(req.user.tenantId, req.user.id));
  }),

  cancel: asyncHandler(async (req, res) => {
    await bookingService.cancel(req.user.tenantId, req.user.id, req.params.id);
    noContent(res);
  }),
};
