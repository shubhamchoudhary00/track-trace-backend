
const express=require('express');
const { addStaffController, deleteSpecificStaffController, getSingleStaffController
    ,getAllStaffController, getSpecificStaffController, changeActiveStatusController,
    updateStaffController,
    getStatsController,  } = require('../controllers/staffController');

const router=express.Router();


const authMiddleware=require('../middleware/authMiddleware')

router.post('/add-staff',authMiddleware,addStaffController);

router.post('/delete-staff',authMiddleware,deleteSpecificStaffController)

router.post('/get-all-staff',authMiddleware,getAllStaffController);

router.post('/get-staff',authMiddleware,getSpecificStaffController);

router.post('/get-single-staff',authMiddleware,getSingleStaffController);

router.post('/change-status',authMiddleware,changeActiveStatusController)

router.post('/update-staff/:id',authMiddleware,updateStaffController);

router.get('/get-stats/:id',authMiddleware,getStatsController)

module.exports=router