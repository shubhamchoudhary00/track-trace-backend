const mongoose=require('mongoose')

const courierPartnerSchema=mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'userModel'
    },
    companyName:{
        type:String,
        required:true,
    },
    address:{
        type:String
    },
    city:{
        type:String
    },
    pincode:{
        type:String
    },
    state:{
        type:String
    },
    country:{
        type:String
    },
    gstNo:{
        type:String,
    },
    transGstNo:{
        type:String
    },
    pan:{
        type:String
    },
    // bank details
    bankAccountNo:{
        type:String
    },
    bankName:{
        type:String,
    },
    ifscCode:{
        type:String
    },
    // contact details

    email:{
        type:String
    },
    personName:{
        type:String
    },
    personNo:{
        type:String
    },

    // aadhar card

    aadharNo:{
        type:String
    },
    active:{
        type:Boolean,
        default:true
    }
},{
    timestamps:true
});

const courierPartnerModel=mongoose.model('courierPartner',courierPartnerSchema);

module.exports=courierPartnerModel