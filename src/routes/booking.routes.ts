import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { cancelBooking, createBooking, listBookings } from "../controllers/booking.controller.js";
import { bookingIdParamSchema, createBookingSchema, listMyBookingsQuerySchema,  } from "../validation/booking.schema.js";

const router = Router();

router.post('/', requireAuth, validate(createBookingSchema), createBooking)
router.get('/me', requireAuth,validate(listMyBookingsQuerySchema, "query"), listBookings)
router.post('/:id/cancel', requireAuth,validate(bookingIdParamSchema, "params"), cancelBooking)

export default router;