const admin = require('firebase-admin'); // Import Firebase Admin SDK
const { getDownloadURL, ref, uploadBytesResumable,getStorage } = require('firebase/storage');
const firebase = require('../helpers/firebase');
const serviceAccount = require('../courier_ms');
const shippingModel = require('../models/shippingDetailsModel');

const sharp = require('sharp'); // For image compression
const { PDFDocument } = require('pdf-lib'); // For PDF compression
const crypto = require('crypto'); // For generating file hashes
const zlib = require('zlib'); // For gzipping other files

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gs://courier-ms.appspot.com',
  });

  const getFileHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Utility function for compressing PDFs
const compressPDF = async (buffer) => {
    const pdfDoc = await PDFDocument.load(buffer);
    return pdfDoc.save({ useObjectStreams: false }); // Optimize PDF without object streams
};

// Utility function for gzipping other file types
const gzip = (buffer) => {
    return new Promise((resolve, reject) => {
        zlib.gzip(buffer, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

// Utility function to check if the file is a valid PDF
const isPDF = (buffer) => {
    // A valid PDF should start with "%PDF" header
    const pdfHeader = buffer.slice(0, 4).toString();
    return pdfHeader === '%PDF';
};

const createShippingController = async (req, res) => {
    console.log(req.body)
    try {
        const formData = req.body;
        const downloadURLs = []; // Array to hold download URLs for files
        const files = req.files; // This will contain all uploaded files
        
        // Log the form data for verification
        console.log('Form Data:', formData);
        let addedBy;
        if (formData.addedBy) {
            try {
                addedBy = JSON.parse(formData.addedBy); // Parsing the addedBy JSON string
            } catch (error) {
                return res.status(400).send({
                    success: false,
                    message: 'Invalid addedBy format. It must be a valid JSON string.',
                    error: error.message,
                });
            }
        } else {
            addedBy = null; // Handle the case when addedBy is not provided
        }


        // Parse the dimensions from string to object
        let dimensions;
        if (formData.dimensions) {
            dimensions = JSON.parse(formData.dimensions);
        } else {
            dimensions = { length: null, breadth: null, height: null }; // Fallback if dimensions are not provided
        }

        // Object to hold the URLs for documents
        const documents = {};

        // Combine all the different file fields into a single array
        let allFiles = [];
        if (files.invoiceCopy) allFiles = allFiles.concat(files.invoiceCopy);
        if (files.courierSlip) allFiles = allFiles.concat(files.courierSlip);
        if (files.cargoPhoto) allFiles = allFiles.concat(files.cargoPhoto);
        if (files.boa) allFiles = allFiles.concat(files.boa);
        if (files.shippingBill) allFiles = allFiles.concat(files.shippingBill);
        if (files.courierBill) allFiles = allFiles.concat(files.courierBill);
        if (files.otherDocuments) allFiles = allFiles.concat(files.otherDocuments);

        // Create a placeholder for storing hashes and downloadURLs after processing
        const fileProcessingPromises = allFiles.map(async (item) => {
            // Log the file details for debugging
            console.log('Processing file:', {
                filename: item.originalname,
                mimetype: item.mimetype,
                bufferSize: item.buffer.length,
            });

            const fileHash = getFileHash(item.buffer); // Generate file hash for deduplication

            // Check if the file already exists in the database (deduplication)
            const existingFile = await shippingModel.findOne({ fileHash });
            if (existingFile) {
                console.log('Duplicate file detected. Skipping upload for:', item.originalname);
                return { url: existingFile.fileUrl, fieldname: item.fieldname }; // Skip further processing if the file already exists
            }

            const storage = getStorage(firebase);
            const storageRef = ref(storage, `files/${item.originalname}`);

            let compressedBuffer;

            // Check the file type and compress accordingly
            if (item.mimetype.startsWith('image/')) {
                // Compress image using sharp
                compressedBuffer = await sharp(item.buffer)
                    .resize({ width: 1000 }) // Resize image to 1000px width (maintaining aspect ratio)
                    .jpeg({ quality: 80 }) // Compress JPEG to 80% quality
                    .toBuffer();
            } else if (item.mimetype === 'application/pdf') {
                // Check if the file is a valid PDF
                if (!isPDF(item.buffer)) {
                    throw new Error(`Invalid PDF file: ${item.originalname}`);
                }

                // Compress PDF using pdf-lib
                compressedBuffer = await compressPDF(item.buffer);
            } else {
                // For other files, gzip them
                compressedBuffer = await gzip(item.buffer);
            }

            // Upload the compressed file to Firebase Storage
            const uploadTask = uploadBytesResumable(storageRef, compressedBuffer);

            // Wait for the upload to complete
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload is ${progress.toFixed(2)}% done`);
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error);
                    },
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref)
                            .then((downloadURL) => {
                                console.log('File available at', downloadURL);

                                // Return the file hash and download URL to process later
                                resolve({
                                    downloadURL,
                                    fieldname: item.fieldname,
                                    fileHash,
                                });
                            })
                            .catch(reject);
                    }
                );
            });
        });

        // Wait for all files to finish uploading and processing
        const uploadedFiles = await Promise.all(fileProcessingPromises);

        // Populate the documents object and update the downloadURLs array
        uploadedFiles.forEach(({ downloadURL, fieldname, fileHash }) => {
            downloadURLs.push({ url: downloadURL, fieldname });

            // Map the download URL to the appropriate field in documents
            if (fieldname === 'invoiceCopy') {
                documents.invoiceCopy = downloadURL;
            } else if (fieldname === 'courierSlip') {
                documents.courierSlip = downloadURL;
            } else if (fieldname === 'cargoPhoto') {
                documents.cargoPhoto = downloadURL;
            } else if (fieldname === 'boa') {
                documents.BOA = downloadURL;
            } else if (fieldname === 'shippingBill') {
                documents.shippingBill = downloadURL;
            } else if (fieldname === 'courierBill') {
                documents.courierBill = downloadURL;
            } else if (fieldname === 'otherDocuments') {
                if (!documents.otherDocuments) documents.otherDocuments = [];
                documents.otherDocuments.push(downloadURL);
            }
        });
       

        

        // Create new shipping document with populated documents object
        const newShipping = new shippingModel({
            ...formData,
            dimensions: dimensions, // Use the parsed dimensions object
            documents: documents, // Populate the documents with URLs
            addedBy: addedBy,
            userId: addedBy?.role === 'User' 
            ? addedBy?._id 
            : addedBy?.role === 'Staff' 
                ? addedBy?.userId 
                : null,
            branch:addedBy?.role === 'Staff' 
            ? addedBy?.branch : null
        });

        // Save the new shipping document to the database
        await newShipping.save();

        // Return a success response with the download URLs
        return res.status(200).send({
            success: true,
            message: 'Shipping created successfully',
            downloadURLs, // Send the download URLs in the response
            newShipping,
        });
    } catch (error) {
        console.error('Error processing file:', error.message);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};


  



const getAllShippingDetailsController = async (req, res) => {
    try {
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const shippings = await shippingModel.find({userId:id}).sort({created:-1});

        if (!shippings || shippings.length === 0) {
            return res.status(404).send({ message: 'No shipments found', success: false });
        }

        // Initialize the array to hold shipment details with pending status
        const pendingShipment = [];

        for (let item of shippings) {
            const documents = item?.documents || {};
            const hasPendingDocuments = 
                !documents.invoiceCopy || 
                !documents.shippingBill || 
                !documents.cargoPhoto || 
                !documents.courierSlip || 
                !documents.BOA;

            pendingShipment.push({ item, pending: hasPendingDocuments });
        }

        return res.status(200).send({
            success: true,
            message: 'Fetched',
            shippings: pendingShipment // Return the array with the pending status
        });
    } catch (error) {
        console.log('Error fetching shipping details:', error.message);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};

const getAllPendingDocumentsShippingController = async (req, res) => {
    try {
        const {id}=req.body;
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const shippings = await shippingModel.find({userId:id});

        if (!shippings || shippings.length === 0) {
            return res.status(404).send({ message: 'No shipments found', success: false });
        }

        // Use filter to create an array of pending shipments
        const pendingShipment = shippings.filter(item => {
            const documents = item?.documents || {};
            return !documents?.invoiceCopy || 
                   !documents?.shippingBill || 
                   !documents?.cargoPhoto || 
                   !documents?.courierSlip || 
                   !documents?.BOA; // Check if any of these documents are missing
        });

        return res.status(200).send({ message: 'Fetched', success: true, pendingShipment });
        
    } catch (error) {
        console.log('Error fetching pending shipments:', error.message);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
};

const getShippingDetailController=async(req,res)=>{
    try{
        const id=req.params.id;
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const shipping=await shippingModel.findOne({_id:id});
        if(!shipping){
            return res.status(404).send({success:false,message:'Not found'})

        }
        return res.status(200).send({success:true,message:'Fetched',shipping});
    }catch(error){
        console.log(error.message);
        return res.status(500).send({success:false,message:'Internal Server Error'})
    }
}

const modifyShippingController = async (req, res) => {
    try {
        const id = req.params.id;
        const formData = req.body;
        const downloadURLs = [];
        const files = req.files;
        console.log(formData)
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const shipping = await shippingModel.findOne({ _id: id });
        if (!shipping) {
            return res.status(404).send({ success: false, message: 'No shipment found' });
        }

        let modifiedBy;
        if (formData.modifiedBy) {
            try {
                modifiedBy = JSON.parse(formData.modifiedBy);
            } catch (error) {
                return res.status(400).send({
                    success: false,
                    message: 'Invalid modifiedBy format. It must be a valid JSON string.',
                    error: error.message,
                });
            }
        } else {
            modifiedBy = null;
        }

        let dimensions;
        if (formData.dimensions) {
            dimensions = JSON.parse(formData.dimensions);
        } else {
            dimensions = { length: null, breadth: null, height: null };
        }

        // Use existing documents and update only the necessary fields
        const documents = { ...shipping.documents };

        let allFiles = [];
        if (!formData?.documents?.invoiceCopy && files?.invoiceCopy) allFiles = allFiles.concat(files.invoiceCopy);
        if (!formData?.documents?.courierSlip && files?.courierSlip) allFiles = allFiles.concat(files.courierSlip);
        if (!formData?.documents?.cargoPhoto && files?.cargoPhoto) allFiles = allFiles.concat(files.cargoPhoto);
        if (!formData?.documents?.BOA && files?.boa) allFiles = allFiles.concat(files.boa);
        if (!formData?.documents?.shippingBill && files?.shippingBill) allFiles = allFiles.concat(files.shippingBill);
        if (!formData?.documents?.courierBill && files?.courierBill) allFiles = allFiles.concat(files.courierBill);
        if (!formData?.documents?.otherDocuments && files?.otherDocuments) allFiles = allFiles.concat(files.otherDocuments);

        const fileProcessingPromises = allFiles.map(async (item) => {
            if (typeof item === 'string') {
                return { url: item, fieldname: item.fieldname };
            }

            const fileHash = getFileHash(item.buffer);
            const existingFile = await shippingModel.findOne({ fileHash });
            if (existingFile) {
                return { url: existingFile.fileUrl, fieldname: item.fieldname };
            }

            const storage = getStorage(firebase);
            const storageRef = ref(storage, `files/${item.originalname}`);

            let compressedBuffer;
            if (item.mimetype.startsWith('image/')) {
                compressedBuffer = await sharp(item.buffer).resize({ width: 1000 }).jpeg({ quality: 80 }).toBuffer();
            } else if (item.mimetype === 'application/pdf') {
                if (!isPDF(item.buffer)) throw new Error(`Invalid PDF file: ${item.originalname}`);
                compressedBuffer = await compressPDF(item.buffer);
            } else {
                compressedBuffer = await gzip(item.buffer);
            }

            const uploadTask = uploadBytesResumable(storageRef, compressedBuffer);

            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload is ${progress.toFixed(2)}% done`);
                    },
                    (error) => reject(error),
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref)
                            .then((downloadURL) => {
                                resolve({ downloadURL, fieldname: item.fieldname, fileHash });
                            })
                            .catch(reject);
                    }
                );
            });
        });

        const uploadedFiles = await Promise.all(fileProcessingPromises);

        // Only update document fields that have new values, keeping others unchanged
        uploadedFiles.forEach(({ downloadURL, fieldname }) => {
            downloadURLs.push({ url: downloadURL, fieldname });
            if (fieldname === 'invoiceCopy') documents.invoiceCopy = downloadURL;
            else if (fieldname === 'courierSlip') documents.courierSlip = downloadURL;
            else if (fieldname === 'cargoPhoto') documents.cargoPhoto = downloadURL;
            else if (fieldname === 'boa') documents.BOA = downloadURL;
            else if (fieldname === 'shippingBill') documents.shippingBill = downloadURL;
            else if (fieldname === 'courierBill') documents.courierBill = downloadURL;
            else if (fieldname === 'otherDocuments') {
                if (!documents.otherDocuments) documents.otherDocuments = [];
                documents.otherDocuments.push(downloadURL);
            }
        });

        // Update the shipping object with the new data
        shipping.transportType=formData.transportType;
        shipping.modeOfTransport=formData.modeOfTransport;
        shipping.courierCompanyName=formData.courierCompanyName;
        shipping.courierNo=formData.courierNo
        shipping.dispatchDate=formData.dispatchDate
        shipping.invoiceNo=formData.invoiceNo
        shipping.noOfBox=formData.noOfBox
        shipping.actualWeight=shipping.actualWeight
        shipping.charges=formData.charges
        shipping.currentStatus=formData.currentStatus;
        shipping.deliveredDate=formData.deliveredDate;
        shipping.vehicleNo=formData.vehicleNo;
        shipping.boaDate=formData.boaDate;
        shipping.boaSubmittedToBank=formData.boaSubmittedToBank;
        shipping.shippingBillNo=formData.shippingBillNo;
        shipping.shippingBillDate=formData.shippingBillDate;
        shipping.shippingBillSubmittedToBank=formData.shippingBillSubmittedToBank;
        shipping.gstRefundStatus=formData.gstRefundStatus;
     
        shipping.deliveryEwayBillNo=formData.deliveryEwayBillNo;
        shipping.deliveryParty=formData.deliveryParty;
        shipping.awbNo=formData.awbNo;
        
        shipping.supplierParty=formData.supplierParty;

        shipping.volumetricWeight=formData.volumetricWeight;
        shipping.dimensions = dimensions;
        shipping.documents = documents; // This now contains merged documents (new + existing)
        shipping.modifiedBy = modifiedBy;

        await shipping.save();

        return res.status(200).send({
            success: true,
            message: 'Shipping updated successfully',
            downloadURLs,
            shipping,
        });
    } catch (error) {
        console.error('Error processing file:', error.message);
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

const updateStatusController=async(req,res)=>{
    try{
        const id=req.params.id;
        const {value}=req.body;
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcel=await shippingModel.findOne({_id:id});
        if(!parcel){
            return res.status(404).send({success:false,message:'Parcel not found'})
        }
        parcel.currentStatus=value;
        await parcel.save();
        return res.status(200).send({success:true,message:'Updated Successfully'})
    } catch (error) {
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

const deleteParcelController=async(req,res)=>{
    try{
        const id=req.params.id;
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcel=await shippingModel.findOneAndDelete({_id:id});
        if(!parcel){
            return res.status(404).send({success:false,message:'no found'})
        }
        return res.status(200).send({success:true,message:'Deleted Successfully'});
    }catch (error) {
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}

const unsucessfullParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
       

        for(let item of parcels){
            if(item.currentStatus==='Unsuccessful Delivery Attempt'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                    filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const accedptedParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Item Accepted By Courier'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                    filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const collectedParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Collected'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const shippedParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Shipped'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const inTransitParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='In-Transit'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const arrivedParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Arrived At Destination'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const outForDeliveryParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Out for Delivery'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                    filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const pickedUpParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Picked Up'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}
const deliveredParcelController=async(req,res)=>{
    try{
        const {id}=req.body
        if(id===null){
            return res.status(404).send({ message: 'No shipments found', success: false });

        }
        const parcels=await shippingModel.find({userId:id});
        if(parcels.length===0){
            return res.status(404).send({success:false,message:'No Parcel found'})
        }
        let filteredParcels=[];
        for(let item of parcels){
            if(item.currentStatus==='Delivered'){
                const documents = item?.documents || {};
                const hasPendingDocuments = 
                    !documents.invoiceCopy || 
                    !documents.shippingBill || 
                    !documents.cargoPhoto || 
                    !documents.courierSlip || 
                    !documents.BOA;
    
                    filteredParcels.push({ item, pending: hasPendingDocuments });
            }
        }
        return res.status(200).send({success:true,message:'Fetched',filteredParcels})
    }catch(error){
        return res.status(500).send({
            success: false,
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}




module.exports = { createShippingController ,modifyShippingController,updateStatusController,deleteParcelController,unsucessfullParcelController,
    getAllShippingDetailsController,getAllPendingDocumentsShippingController,getShippingDetailController,deliveredParcelController,
    pickedUpParcelController,outForDeliveryParcelController,arrivedParcelController,accedptedParcelController,collectedParcelController,
    shippedParcelController,inTransitParcelController
};
