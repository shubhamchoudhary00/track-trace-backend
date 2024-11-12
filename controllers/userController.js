const bcryptjs=require('bcryptjs')
const jwt=require('jsonwebtoken');
const userModel = require('../models/userModel');
const nodemailer=require('nodemailer')

const registerController = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check for missing fields
        if (!name || !email || !phone || !password) {
            return res.status(400).send({ success: false, message: 'Please provide all the details' });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email: email });
        if (existingUser) {
            return res.status(409).send({ success: false, message: 'User already exists' });
        }

        // Hash the password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create new user
        const newUser = new userModel({ name, email, phone, password: hashedPassword });
        await newUser.save();

        return res.status(201).send({ success: true, message: 'User created. Please login.' });
    } catch (error) {
        console.error('Error during user registration:', error.message); // More descriptive error logging
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};


const loginController=async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
            return res.status(400).send({success:true,message:'Please provide email and password'})
        }
        const user=await userModel.findOne({email:email});
        if(!user){
            return res.status(400).send({success:true,message:'User does not exist'});
        }
        const isMatch=bcryptjs.compare(password,user?.password);
        if(!isMatch){
            return res.status(400).send({success:true,message:'Email Id or Password invalid'});
        }

        const token=jwt.sign({id:user?._id},process.env.JWT_SECRET_KEY,{expiresIn:'1d',});
        return res.status(200).send({success:true,message:'Logged In',user,token});

    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }

};

const authController = async (req, res) => {
    
    try {
      const user = await userModel.findOne({ _id: req.body.userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
  
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: error.message, // Include the error message for debugging (not recommended in production)
      });
    }
  };


  const changeUserActiveStatusController=async(req,res)=>{
    try{
        const {id}=req.body;
        const user=await userModel.findOne({_id:id});
        if(!user){
            return res.status(404).send({success:false,message:'User does not exist'});
        }
        user.active= !user.active;
        await user.save();
        return res.status(200).send({success:true,message:'changed successfully',user});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
  }

  const deleteUserController=async(req,res)=>{
    try{
        const {id}=req.body;
        const user=await userModel.findOne({_id:id});
        if(!user){
            return res.status(404).send({success:false,message:'User does not exist'});
        }
        await user.delete();
        return res.status(200).send({success:true,message:'User deleted successfully'});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'});
    }
  }

  const modifyUserController=async(req,res)=>{
    try{
        const {name,email,phone,id}=req.body;
        const user=await userModel.findOne({_id:id});
        if(!user){
            return res.status(404).send({success:false,message:'User does not exist'});
        }
        user.name=name;
        user.email=email;
        user.phone=phone;
        await user.save();
        return res.status(200).send({success:true,message:'Modified successfully'});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'});
    }
  }



  const changePasswordController = async (req, res) => {
    try {
      console.log(req.body);
      const { id, password, newPassword } = req.body;
  
      // Find user by id
      const user = await userModel.findOne({ _id: id });
      if (!user) {
        return res.status(404).send({ success: false, message: 'User does not exist' });
      }
  
      // Compare current password
      const isMatch = await bcryptjs.compare(password, user?.password); // Added 'await' here
      if (!isMatch) {
        return res.status(400).send({ success: false, message: 'Wrong Password' });
      }
  
      // Hash new password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
  
      // Update user's password
      user.password = hashedPassword;
      await user.save();
  
      // Send success response
      return res.status(200).send({ success: true, message: 'Password changed successfully' });
  
    } catch (error) {
      console.error('Error in changePasswordController:', error.message);
      return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  };
  

  
  const resetPasswordController=async(req,res)=>{
    try{
        const id=req.params.id;
        const {password}=req.body
        const user=await userModel.findOne({_id:id});
        if(!user){
            return res.status(404).send({success:false,message:'User does not exist'});
        }
        
        const salt=await bcryptjs.genSalt(10);
        const hashedPassword=await bcryptjs.hash(password,salt);

        user.password=hashedPassword;
        await user.save();

        return res.status(200).send({success:true,message:'Password reset successfully'});


    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
  }


  const getUserDetailsController=async(req,res)=>{
    try{
        const id=req.params.id;
        const user=await userModel.findOne({_id:id});
        if(!user){
            return res.status(404).send({success:false,message:'User not found'});
        }
        return res.status(200).send({success:true,message:'User data fetched',user});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
  }

const forgotPasswordController=async(req,res)=>{
  try{
    const {email}=req.body;
    if(!email){
      return res.status(400).send({success:false,message:'Please provide email'})
    };
    const user=await userModel.findOne({email:email});
    if(!user){
      return res.status(404).send({success:false,message:'User not found'})
    }
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shubhamsur09@gmail.com',
        pass: 'cnpgkkumhduwgqub'
      }
    });
    
    var mailOptions = {
      from: 'shubhamsur09@gmail.com',
      to: user.email,
      subject: 'ResetPassword Link',
      text: `http://localhost:5173/reset-password/${user?._id}`
    };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        return res.status(400).send({message:"Some Error Occured",success:false});
      } else {
        return res.status(200).json({ message: "Mail Sent Successfully", success: true });
      }
    });


  }catch(error){
    console.log(error.message);
    return res.status(500).send({success:false,message:'Internal Server Error'})
  }
}



const sendMessageController=async(req,res)=>{
  try{
  const {values}=req.body
  var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });
    
   var mailOptions = {
    from: process.env.EMAIL, // Sender's email address
    to: process.env.PERSONAL_EMAIL_ID, // Recipient's email address
    subject: 'Message from Contact us', // Subject of the email
    text: ` ${values?.name} has messaged you from the track trace. Below is the message and his phone number is ${values?.phone} and mail id is ${values?.email}
    ${values?.message}` // Body of the email
};

    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        return res.status(400).send({message:"Some Error Occured",success:false});
      } else {
        return res.status(200).json({ message: "Mail Sent Successfully", success: true });
      }
    });
  }catch(error){
    console.log(error.message);
    return res.status(500).send({success:false,message:'Internal Server Error'})
  }
}

  
module.exports={registerController,loginController,authController,changeUserActiveStatusController,deleteUserController,changePasswordController
    ,modifyUserController,resetPasswordController,getUserDetailsController,forgotPasswordController,sendMessageController};