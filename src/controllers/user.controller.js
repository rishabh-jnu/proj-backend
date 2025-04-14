import { asyncHandler } from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiReponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - should not empty
    // check if user already exists: by username and email
    //check  for images, check for avatar
    // upload them to cloudinary - avatar
    // create user object - create entry in db
    // remove password and refresh tocken field from response 
    // check for user created or not
    // return response  

    const { fullName, username, email, password } = req.body;
    console.log("email", email);

    if ([fullName, username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    // console.log("req.files", req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiReponse(200, createdUser, "User registered successfully")
    );

});


const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    //username or email, password
    //find the user
    //passsword check
    //access and refresh token
    //send cookies

    const {email, username, password} = req.body;
    if(!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })
    if(!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid =  await user.isPasswordCorrect(password);
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiReponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { 
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly : true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiReponse(200, {}, "User logged out successfully")
    )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken, 
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken._id);
     if(!user) {
         throw new ApiError(401, "Invalid refresh token");
     }
 
     if(incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used");
     }
 
     const options = {
         httpOnly : true,
         secure: true
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiReponse(
             200,
             {
                 accessToken,
                 refreshToken: newRefreshToken
             },
             "Access token refreshed successfully"
         )
     )
   } catch (error) {
       throw new ApiError(401, "Invalid refresh token");
   }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiReponse(200, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiReponse(200, {}, "User details fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;
    if(!fullName || !email) {
        throw new ApiError(400, "Atleast one field is required to update");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");
    return res
    .status(200)
    .json(
        new ApiReponse(200, user, "User details updated successfully")
    );

});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    //todo : delete old image 

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiReponse(200, user, "Avatar Image updated successfully")
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiReponse(200, user, "Cover Image updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => { 
    const { username } = req.params;

    if(!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            }
        },
        {
            $addFields: {
                subscribersCount: { 
                    $size: "$subscribers" 
                },
                channelsSubscribedToCount: { 
                    $size: "$subscribedTo" 
                },
                isSubscribed: {
                    $cond:{
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiReponse(200, channel[0], "Channel details fetched successfully")
    ); 
});

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
};