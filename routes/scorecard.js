const express = require('express');
const { insertScorecard, getHeadToHead, getMatchDetails } = require('../controllers/scorecard');

const router = express.Router();

// Define endpoints
router.post('/insert', insertScorecard);
router.get('/head2head', getHeadToHead);
router.get('/details', getMatchDetails);

module.exports = router;