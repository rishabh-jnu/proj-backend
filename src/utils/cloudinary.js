import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        // Upload file on cloudinary
        const response = await cloudinary.uploader.upload
        (localFilePath, { resourse_type: "auto" });
        //file has been uploaded successfully
        // console.log("file is uploaded on cloudinary",
        //     response.url);
            fs.unlinkSync(localFilePath); // remove temperarly saved file from local storage
            return response;
        // Remove file from local storage
        
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove temperarly saved file from local storage 
        console.log("Error while uploading file on cloudinary", error);
        return null;
    }
}

export { uploadOnCloudinary };
