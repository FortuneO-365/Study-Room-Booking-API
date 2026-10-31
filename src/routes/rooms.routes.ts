import { Router } from "express";
import { listRooms, getRoom, createRoom, updateRoom, deleteRoom, getAvailability } from "../controllers/rooms.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { availabilityQuerySchema, createRoomSchema, listRoomsQuerySchema, roomIdParamSchema, updateRoomSchema } from "../validation/room.schema.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get('/', requireAuth, validate(listRoomsQuerySchema, 'query'), listRooms);
router.get('/:id', requireAuth, validate(roomIdParamSchema, 'params'), getRoom);
router.get(
    '/:id/availability', 
    requireAuth, 
    validate(roomIdParamSchema, "params"),
    validate(availabilityQuerySchema,"query"), 
    getAvailability
)
router.post('/', requireAuth, requireRole('admin'), validate(createRoomSchema), createRoom);
router.patch(
    '/:id', 
    requireAuth, 
    requireRole('admin'),
    validate(roomIdParamSchema, 'params'), 
    validate(updateRoomSchema), updateRoom
);
router.delete('/:id', requireAuth, requireRole('admin'), validate(roomIdParamSchema, 'params'), deleteRoom);


export default router;