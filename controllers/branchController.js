const branchModel = require("../models/branchModel");

const createBranchController = async (req, res) => {
    try {
        const { street, city, pincode, state, country, contactPersonName,branchName, contactPersonNumber,user } = req.body;

        // Check if all required fields are provided
        if (!street || !city || !pincode || !state || !country || !contactPersonName || !contactPersonNumber || !branchName) {
            return res.status(400).send({ success: false, message: 'Please provide all the details' });
        }

        // Validate pincode format (e.g., must be digits of specific length)
        const pincodePattern = /^[0-9]{5,10}$/;
        if (!pincodePattern.test(pincode)) {
            return res.status(400).send({ success: false, message: 'Invalid pincode format. It should be 5 to 10 digits long.' });
        }

        // Validate contactPersonContact (phone number format)
        const phonePattern = /^[0-9]{10,15}$/;
        if (!phonePattern.test(contactPersonNumber)) {
            return res.status(400).send({ success: false, message: 'Invalid contact number format. It should be 10 to 15 digits long.' });
        }

        // Check if a branch with the same address already exists (optional but useful)
        const existingBranch = await branchModel.findOne({ street, city, pincode, state, country });
        if (existingBranch) {
            return res.status(400).send({ success: false, message: 'Branch with this address already exists.' });
        }

        // Create a new branch entry
        const branch = new branchModel({
            user,
            street,
            city,
            pincode,
            state,
            country,
            contactPersonName,
            contactPersonNumber,
            branchName
        });

        // Save the branch to the database
        await branch.save();
        return res.status(200).send({ success: true, message: 'Branch created successfully', branch });
    } catch (error) {
        console.error(error.message);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};

const getAllBranchForUsersController = async (req, res) => {
    try {
        const { user } = req.body; // Destructure id correctly from req.params
        console.log(user)
        const branches = await branchModel.find({ user: user });
        
        if (!branches || branches.length === 0) { // Check if branches array is empty or null
            return res.status(404).send({ success: false, message: 'No branches available' });
        }

        return res.status(200).send({ success: true, message: 'Fetched successfully', branches });
    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};


const getAllBranchController=async(req,res)=>{
    try{
        const {id}=req.body;
        const branches=await branchModel.find({user:id});
        if(!branches){
            return res.status(404).send({success:false,message:'No branches available'});
        }
        return res.status(200).send({success:true,message:'fetched successfully',branches});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const changeBranchActiveStatusController=async(req,res)=>{
    try{
        const {id}=req.body;
        const branch=await branchModel.findOne({_id:id});
        if(!branch){
            return res.status(404).send({success:false,message:'branch not found'});
        }

        branch.active= !branch.active;
        await branch.save();
        return res.status(200).send({success:true,message:'status changed successfully'});

    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const deleteBranchController=async(req,res)=>{
    try{
        console.log(req.body)
        const id=req.params.id;
        const branch=await branchModel.findOneAndDelete({_id:id});
        if(!branch){
            return res.status(404).send({success:false,message:'branch not found'});
        }

        return res.status(200).send({success:true,message:'deleted successfully'});

    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const getBranchController=async(req,res)=>{
    try{
        const {id}=req.body;
        const branch=await branchModel.findOne({_id:id})
        if(!branch){
            return res.status(404).send({success:false,message:'Branch not available'})
        }
        return res.status(200).send({success:true,message:'fetched',branch});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const updateBranchController = async (req, res) => {
    try {
      const id = req.params.id;
      const {
        branchName,
        street,
        city,
        state,
        country,
        pincode,
        contactPersonName,
        contactPersonNumber,
        active,
      } = req.body.branchData;
  
      console.log(req.body); // Debugging
  
      // Find the branch by ID
      const branch = await branchModel.findOne({ _id: id });
      console.log('branch',branch)
      
      // If branch not found, return error
      if (!branch) {
        return res.status(404).send({
          success: false,
          message: 'Branch not available',
        });
      }
  
      // Update branch details
      branch.branchName = branchName ;
      branch.street = street ;
      branch.city = city ;
      branch.state = state;
      branch.country = country;
      branch.pincode = pincode;
      branch.contactPersonName = contactPersonName;
      branch.contactPersonNumber = contactPersonNumber;
      branch.active = active;
  
      // Save the updated branch
      await branch.save();
  
      // Send success response
      return res.status(200).send({
        success: true,
        message: 'Branch updated successfully',
        branch,
      });
  
    } catch (error) {
      console.error(error.message); // Log the error for debugging
      return res.status(500).send({
        success: false,
        message: 'Internal Server Error',
      });
    }
  };

  const getStatsController=async(req,res)=>{
    try{
        const id=req.params.id;
        const branches=await branchModel.find({user:id})
        return res.status(200).send({success:true,message:'success',totalBranches:branches.length});
    }catch (error) {
        console.error(error.message); // Log the error for debugging
        return res.status(500).send({
          success: false,
          message: 'Internal Server Error',
        });
      }
  }

module.exports = { createBranchController,getAllBranchController,getAllBranchForUsersController,getBranchController,updateBranchController,
    changeBranchActiveStatusController,deleteBranchController,getStatsController };
