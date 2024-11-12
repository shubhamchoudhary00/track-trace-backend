const mongoose = require('mongoose');

const branchSchema = mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'userModel'
    },
    branchName:{
        type:String,
    },
    street: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    pincode: {
        type: String,
        required: true,
        trim: true,
        minlength: 6,
        maxlength: 6
    },
    active:{
        type:Boolean,
        default:true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    contactPersonName: {
        type: String,
        required: true,
        trim: true
    },
    contactPersonNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /\d{10}/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    }
}, { timestamps: true });


const branchModel=mongoose.model('branch',branchSchema);

module.exports=branchModel;