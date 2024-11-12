const express=require('express');

const router=express.Router();

const authMiddleware=require('../middleware/authMiddleware');
const { addPartyController, getAllPartyController, deletePartyController, getPartyController, updatePartyController } = require('../controllers/partyController');

router.post('/add-party',authMiddleware,addPartyController)

router.get('/get-party/:id',authMiddleware,getPartyController)

router.post('/get-all-party',authMiddleware,getAllPartyController)

router.post('/update-party/:id',authMiddleware,updatePartyController)

router.delete('/delete-party/:id',authMiddleware,deletePartyController)

module.exports=router;