// require('dotenv').config({path:'./env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });



connectDB()
// app.on("error", (error) => {
//   console.error("Error connecting to MongoDB", error);
//   throw error
// });
// app.listen(process.env.PORT, () => {
//   console.log(`App is listening on port ${process.env.PORT}`)
// })
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`App is listening on port ${process.env.PORT}`);
  })
})
.catch((error) => {
  console.error("Error connecting to MongoDB !!!", error);
});






/*
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`
    );
    app.on("error", (error) => {
      console.error("Error connecting to MongoDB", error);
      throw error
    });
    app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`)
    })

  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    throw error
  }
})();
*/