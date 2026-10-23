import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { cancelBooking, createBooking, listBookings } from "../controllers/booking.controller.js";

const router = Router();

router.post('/', requireAuth, createBooking)
router.get('/me', requireAuth, listBookings)
router.post('/:id/cancel', requireAuth, cancelBooking)

export default router;