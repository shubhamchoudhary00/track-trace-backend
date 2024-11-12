const bcryptjs=require('bcryptjs');
const userModel = require('../models/userModel');
const { messaging } = require('firebase-admin');



const addStaffController = async (req, res) => {
    try {
      // Destructure finalData directly from request body
      const { name, email, phone, password, id, branch } = req.body;
      
      console.log(req.body); // Debugging
  
      // Check if staff with the same email already exists
      const existingStaff = await userModel.findOne({ email });
      if (existingStaff) {
        return res.status(400).send({
          success: false,
          message: 'Staff with the same email already exists',
        });
      }
  
      // Hash the password before saving
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);
  
      // Create a new user/staff object
      const newUser = new userModel({
        name,
        email,
        phone,
        password: hashedPassword, // Store the hashed password
        userId: id,
        branch,
        role: 'Staff', // Set role to 'Staff'
      });
  
      // Save the new staff to the database
      await newUser.save();
  
      return res.status(200).send({
        success: true,
        message: 'Staff added successfully',
      });
    } catch (error) {
      console.error(error.message); // Log the error for debugging
      return res.status(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  };
  
const getAllStaffController=async(req,res)=>{
    try{
        const {id}=req.body;
        const staffs=await userModel.find({userId:id,role:'Staff'});
        if(!staffs){
            return res.status(404).send({success:false,message:'Staff does not exist'});
        }

        return res.status(200).send({success:true,message:'Staff fetched',staffs});

    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const getSpecificStaffController=async(req,res)=>{
    console.log('init')
    try{
        const {id}=req.body;
        console.log(req.body)
        const staff=await userModel.find({branch:id,role:'Staff'});
        if(!staff){
            return res.status(404).send({success:false,message:'staff not found'});
        }
        return res.status(200).send({success:true,message:'staff fetched',staff});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const deleteSpecificStaffController = async (req, res) => {
    try {
      const { id } = req.body;
  
      // Check if the staff member exists
      const user = await userModel.findOneAndDelete({ _id: id, role: 'Staff' });
  
      if (!user) {
        return res.status(404).send({
          success: false,
          message: 'Staff member not found or does not exist.',
        });
      }
  
      // If successfully deleted
      return res.status(200).send({
        success: true,
        message: 'Staff member deleted successfully.',
      });
  
    } catch (error) {
      console.error('Error deleting staff:', error.message);
      return res.status(500).send({
        success: false,
        message: 'Internal server error. Please try again later.',
      });
    }
  };
  

const changeActiveStatusController=async(req,res)=>{
    try{
        const {id}=req.body;
        const staff=await userModel.findOne({_id:id});
        if(!staff){
            return res.status(404).send({success:false,message:'Staff not found'});
        }

        staff.active=!staff.active;
        await staff.save();
        return res.status(200).send({success:true,message:'Status changed successfully'});

    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'});
    }
}

const getSingleStaffController=async(req,res)=>{
    try{
        const {id}=req.body;
        const staff=await userModel.findOne({_id:id})
        if(!staff){
            return res.status(404).send({success:false,message:'User not found'})
        }
        return res.status(200).send({success:true,message:'fetched',staff});
    }catch(error){
        console.log(error.message)
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const updateStaffController = async (req, res) => {
    try {
      // Destructure the request body directly
      const { name, email, phone, active } = req.body; 
      const id = req.params.id;
  
      console.log(req.body); // Logs to help with debugging
  
      // Find the user by ID
      const user = await userModel.findById(id);
  
      if (!user) {
        return res.status(404).send({ success: false, message: 'User not found' });
      }
  
      // Update user fields
      user.name = name;
      user.email = email;
      user.phone = phone;
      user.active = active;
  
      // Save the updated user
      await user.save();
  
      return res.status(200).send({ success: true, message: 'Updated successfully', user });
    } catch (error) {
      console.error(error.message);
      return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  };
  
  const getStatsController=async(req,res)=>{
    try{
        const id=req.params.id;
        if(!id){
            return res.status(404).send({success:false,message:'Not found'});
        }
        const staff=await userModel.find({userId:id})
        return res.status(200).send({success:true,message:'success',totalStaffs:staff.length})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}

module.exports={addStaffController,getAllStaffController,getSpecificStaffController,changeActiveStatusController,getSingleStaffController,
    deleteSpecificStaffController,updateStaffController,getStatsController};