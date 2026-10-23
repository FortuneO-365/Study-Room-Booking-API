import { Router } from "express";
import { listRooms, getRoom, createRoom, updateRoom, deleteRoom } from "../controllers/rooms.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { createRoomSchema, listRoomsQuerySchema, roomIdParamSchema, updateRoomSchema } from "../validation/room.schema.js";

const router = Router();

router.get('/', requireAuth, validate(listRoomsQuerySchema, 'query'), listRooms);
router.get('/:id', requireAuth, validate(roomIdParamSchema, 'params'), getRoom);
router.post('/', validate(createRoomSchema), createRoom);
router.patch('/:id', validate(roomIdParamSchema, 'params'), validate(updateRoomSchema), updateRoom);
router.delete('/:id', validate(roomIdParamSchema, 'params'), deleteRoom);


export default router;