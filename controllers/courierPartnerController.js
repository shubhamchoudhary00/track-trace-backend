const courierPartnerModel = require("../models/courierPartnerModel");


const addCourierPartnerController = async (req, res) => {
    try {
      const { form, userId } = req.body;
      console.log(req.body);
  
      if (!form || !userId) {
        return res.status(400).send({ success: false, message: 'Please provide data' });
      }
  
      const { gstNo, transGstNo, pan } = form;
      const formWithUserId = { ...form, userId };
  
      // Build a query only with non-null values
      const query = {
        $or: [
          ...(gstNo ? [{ gstNo }] : []),
          ...(transGstNo ? [{ gstNo: transGstNo }] : []),
          ...(pan ? [{ pan }] : [])
        ]
      };
  
      // Check if there's an existing courier partner with the same GST or PAN
      if (query.$or.length > 0) { // Only run query if there are conditions to check
        const existingCourier = await courierPartnerModel.findOne(query);
        if (existingCourier) {
          return res.status(401).send({ success: false, message: 'Courier Partner already exists with the same GST or PAN' });
        }
      }
  
      // Create and save the new courier partner
      const newCourier = new courierPartnerModel(formWithUserId);
      await newCourier.save();
  
      return res.status(200).send({ success: true, message: 'Courier Partner added' });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  };
  
  const getCourierPartyController=async(req,res)=>{
    try{
        const id=req.params.id;
        if(id===null){
            return res.status(401).send({success:false,message:'Unauthorized'})
        }
        const courier=await courierPartnerModel.findOne({_id:id});
        return res.status(200).send({ success: true, message: 'fetched',courier });
    } catch (error) {
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
}


const getAllCourierPartyController=async(req,res)=>{
    try{
        const {id}=req.body;
        if(id===null){
            return res.status(401).send({success:false,message:'Unauthorized'})
        }
        const courier=await courierPartnerModel.find({userId:id});
        return res.status(200).send({ success: true, message: 'fetched',courier });
    } catch (error) {
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
}

const deleteCourierPartnerController = async (req, res) => {
    try {
      const id  = req.params.id;
  
      if (!id) {
        return res.status(400).send({ success: false, message: 'Bad Request: ID is required' });
      }
  
      const courier = await courierPartnerModel.findOne({ _id: id });
  
      if (!courier) {
        return res.status(404).send({ success: false, message: 'Courier partner not found' });
      }
  
      await courier.deleteOne();
      return res.status(200).send({ success: true, message: 'Deleted successfully' });
  
    } catch (error) {
      return res.status(500).send({ success: false, message: 'Internal Server Error', error: error.message });
    }
  };
  const updateCourierController = async (req, res) => {
    try {
        const id = req.params.id;
        const { courierData } = req.body;
        console.log(courierData)

        if (!id) {
            return res.status(401).send({ success: false, message: 'Unauthorized' });
        }

        // Find the courier by ID
        const courier = await courierPartnerModel.findById(id);
        
        if (!courier) {
            return res.status(404).send({ success: false, message: 'Courier not found' });
        }

        // Update the courier data with the new data
        courier.companyName = courierData.companyName || courier.companyName;
        courier.address = courierData.address || courier.address;
        courier.pincode = courierData.pincode || courier.pincode;
        courier.city = courierData.city || courier.city;
        courier.state = courierData.state || courier.state;
        courier.country = courierData.country || courier.country;
        courier.personName = courierData.personName || courier.personName;
        courier.personNo = courierData.personNo || courier.personNo;
        courier.bankAccountNo = courierData.bankAccountNo || courier.bankAccountNo;
        courier.bankName = courierData.bankName || courier.bankName;
        courier.ifscCode = courierData.ifscCode || courier.ifscCode;
        courier.aadharNo = courierData.aadharNo || courier.aadharNo;
        courier.gstNo = courierData.gstNo || courier.gstNo;
        courier.transGstNo = courierData.transGstNo || courier.transGstNo;
        courier.email = courierData.email || courier.email;
        courier.pan = courierData.pan || courier.pan;
        courier.active = courierData.active !== undefined ? courierData.active : courier.active;

        // Save the updated courier
        await courier.save();

        // Return success response
        return res.status(200).send({ success: true, message: 'Courier updated successfully', courier });

    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
}

  
module.exports = { addCourierPartnerController,getAllCourierPartyController,deleteCourierPartnerController,getCourierPartyController,updateCourierController };
