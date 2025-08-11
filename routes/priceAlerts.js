import express from 'express';
import controller from '../controllers/priceAlertsController.js';

const router = express.Router();

router.get('/', controller.getAllAlerts);
router.post('/create', controller.createAlert);

export default router;
