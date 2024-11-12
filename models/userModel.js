
const mongoose=require('mongoose')

const user=mongoose.Schema({
    userId:{
        type:String
    },
    name:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['Admin','User','Staff'],
        default:'User'
    },
    branch:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'branchModel'
    },
    active:{
        type:Boolean,
        default:true

    }

})

const userModel=mongoose.model('users',user);

module.exports=userModel;