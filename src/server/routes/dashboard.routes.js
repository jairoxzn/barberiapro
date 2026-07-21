import { Router } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { authenticate, staffOnly } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

const router = Router();
router.use(authenticate, staffOnly);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const data = await dashboardService.summary(req.user.tenantId, req.query.branchId);
    ok(res, data);
  })
);

export default router;
