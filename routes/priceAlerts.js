const express = require('express');
const router = express.Router();
const controller = require('../controllers/priceAlertsController');

router.get('/', controller.getAllAlerts);
router.post('/create', controller.createAlert);

module.exports = router;
