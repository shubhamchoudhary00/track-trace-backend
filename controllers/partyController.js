const partyModel = require("../models/partyModel");

const addPartyController = async (req, res) => {
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
        const existingParty = await partyModel.findOne(query);
        if (existingParty) {
          return res.status(401).send({ success: false, message: 'Party already exists with the same GST or PAN' });
        }
      }
  
      // Create and save the new courier partner
      const newParty = new partyModel(formWithUserId);
      await newParty.save();
  
      return res.status(200).send({ success: true, message: 'Courier Partner added' });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  };

  const getPartyController=async(req,res)=>{
    try{
        const id=req.params.id;
   
        if(id===null){
            return res.status(401).send({success:false,message:'Unauthorized'})
        }
        const party=await partyModel.findOne({_id:id});
  
        return res.status(200).send({ success: true, message: 'fetched',party });
    }catch (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
  }
const getAllPartyController=async(req,res)=>{
    try{
        const {id}=req.body;
        if(id===null){
            return res.status(401).send({success:false,message:'Unauthorized'})
        }
        const party=await partyModel.find({userId:id});
        return res.status(200).send({ success: true, message: 'fetched',party });
    } catch (error) {
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
}

const deletePartyController=async(req,res)=>{
    try{
        const id=req.params.id;
        if(id===null){
            return res.status(401).send({success:false,message:'Unauthorized'})
        }
        const party=partyModel.findOne({_id:id});
        if(!party){
            return res.status(404).send({success:false,message:'Party not found'})

        }
        await party.deleteOne();
        return res.status(200).send({success:true,message:'Deleted successfully'})

    } catch (error) {
    return res.status(500).send({ success: false, message: 'Internal Server Error' });
  }
}

const updatePartyController = async (req, res) => {
    try {
        const id = req.params.id;
        const { partyData } = req.body;

        if (!id) {
            return res.status(401).send({ success: false, message: 'Unauthorized' });
        }

        // Find the party by ID
        const party = await partyModel.findById(id);
        
        if (!party) {
            return res.status(404).send({ success: false, message: 'Party not found' });
        }

        // Update the party data with the new data
        party.companyName = partyData.companyName || party.companyName;
        party.address = partyData.address || party.address;
        party.pincode = partyData.pincode || party.pincode;
        party.city = partyData.city || party.city;
        party.state = partyData.state || party.state;
        party.country = partyData.country || party.country;
        party.personName = partyData.personName || party.personName;
        party.personNo = partyData.personNo || party.personNo;
        party.bankAccountNo = partyData.bankAccountNo || party.bankAccountNo;
        party.bankName = partyData.bankName || party.bankName;
        party.ifscCode = partyData.ifscCode || party.ifscCode;
        party.aadharNo = partyData.aadharNo || party.aadharNo;
        party.gstNo = partyData.gstNo || party.gstNo;
        party.transGstNo = partyData.transGstNo || party.transGstNo;
        party.pan = partyData.pan || party.pan;
        party.email = partyData.email || party.email;
        party.active = partyData.active !== undefined ? partyData.active : party.active;

        // Save the updated party
        await party.save();

        // Return success response
        return res.status(200).send({ success: true, message: 'Party updated successfully', party });

    } catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
}



module.exports = { addPartyController ,getAllPartyController,deletePartyController,getPartyController,updatePartyController};
