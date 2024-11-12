const express=require('express');

const router=express.Router();

const authMiddleware=require('../middleware/authMiddleware');
const { addCourierPartnerController, deleteCourierPartnerController, getAllCourierPartyController, getCourierPartyController, updateCourierController } = require('../controllers/courierPartnerController');

router.post('/add-courier-partner',authMiddleware,addCourierPartnerController)
// single partner
router.get('/get-courier/:id',authMiddleware,getCourierPartyController)
// all partner
router.post('/get-courier-partner',authMiddleware,getAllCourierPartyController)

router.post('/update-courier/:id',authMiddleware,updateCourierController)

router.delete('/delete-courier-partner/:id',authMiddleware,deleteCourierPartnerController)

module.exports=router;