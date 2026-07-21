import { Router } from 'express';
import { branchController } from '../controllers/branch.controller.js';
import { authenticate, authorize, staffOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  createBranchSchema,
  updateBranchSchema,
} from '../validators/branch.validator.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get('/', branchController.list);
router.get('/:id', validate({ params: idParam }), branchController.get);
router.post('/', authorize('ADMIN'), validate(createBranchSchema), branchController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validate({ params: idParam, ...updateBranchSchema }),
  branchController.update
);
router.delete('/:id', authorize('ADMIN'), validate({ params: idParam }), branchController.remove);

export default router;
