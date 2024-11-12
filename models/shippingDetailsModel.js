const mongoose = require('mongoose');

const shippingSchema = mongoose.Schema({
    userId:{
        type:String,
    },
    branch:{
        type:String,
        default:null
    },
    transportType: {
        type: String,
        required: true
    },
    modeOfTransport: {
        type: String,
        required: true
    },
    courierCompanyName: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'courierPartnerModel'
    },
    courierNo: {
        type: String
    },
    dispatchDate: {
        type: Date // Changed to Date type
    },
 
    awbNo:{
        type:String
    },
    invoiceNo: {
        type: String,
        required: true
    },
  
    noOfBox: {
        type: Number
    },
    actualWeight: {
        type: String
    },
    volumetricWeight: {
        type: String
    },
    charges: {
        type: String
    },
    currentStatus: {
        type: String,
        default: 'Pending' // You could use an enum to restrict this field to specific values
    },
    deliveredDate: {
        type: Date // Changed to Date type
    },
    vehicleNo: {
        type: String
    },
    boaSubmittedToBank: {
        type: String,
        default: false
    },
    boaDate: {
        type: Date // Changed to Date type
    },
    shippingBillNo: {
        type: String
    },
    shippingBillDate: {
        type: Date // Changed to Date type
    },
    shippingBillSubmittedToBank: {
        type: String,
        
    },
    gstRefundStatus: {
        type: String
    },
    dimensions: {
        length: {
            type: String
        },
        breadth: {
            type: String
        },
        height: {
            type: String
        }
    },
    
    
    deliveryParty:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'partyModel'
    },
   
    supplierParty:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'partyModel'
    },
    deliveryEwayBillNo:{
        type:String
    },

   
    documents: {
        invoiceCopy: { type: String, default: null },
        courierSlip: { type: String, default: null },
        cargoPhoto: { type: String, default: null },
        BOA: { type: String, default: null },
        shippingBill: { type: String, default: null },
        courierBill: { type: String, default: null },
        otherDocuments: [{ type: String, default: null }] // Keep this as an array
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default:null
    }
},{timestamps:true});

const shippingModel = mongoose.model('shippingDetails', shippingSchema);
module.exports = shippingModel;
