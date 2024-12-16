const port =4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { url } = require("inspector");
const { log } = require("console");
// const { error } = require("console");

app.use(express.json());
app.use(cors());

//Database Connection With Mongodb

mongoose.connect(
    "mongodb+srv://dhruvbaraiya:dhruvbaraiya@cluster0.fxxumsp.mongodb.net/cloth"
    //   "mongodb+srv://development:bytes01@cluster0.eirgbku.mongodb.net/cloth"

    )

//Api Creation

app.get("/", (req,res)=>{
    res.send("Express App is Running");
})

//Image Storage Engine

const storage = multer.diskStorage({
    destination:  './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

//Creating Upload Endpoint for Images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for Creating Product  
//Storage The All Data

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products =await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else
    {
        id=1;
    }

    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Creating Api For Deleting Product

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Creating Api For Getting All Product

app.get('/allproducts', async (req,res)=>{
    let products = await Product.find({});
    console.log("All Product Fetched");
    res.send(products);
})

//Schema Creating for User Model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Creating Endpoint for registering the user

app.post('/singup', async (req,res) => {

    let check = await Users.findOne({email:req.body.email});
    if (check) {
        return res.status(400).json({success:false,error:"User is Already Existing"})
    }

    let cart = {};
        for (let i = 0; i < 300; i++) {
            cart [i]=0;
        }
        const user = new Users ({
            name:req.body.username,
            email:req.body.email,
            password:req.body.password,
            cartData:cart,
        }) 

        await user.save();

        const data = {
            user:{
                id:user.id
            }
        }

        const token = jwt.sign(data,'secrete_ecom');
        res.json({success:true,token})
})

//Creating Endpoint for User Login

app.post('/login',async(req,res) =>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare =req.body.password === user.password;
        if (passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secrete_ecom');
            // console.log('token===>' , token)
            res.json({success:true,token});
        }
        else{
            res.json({success:false,error:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,error:"Wrong Email id"});
    }
})

//Creating endpoint for new collection

app.get('/newcollections',async (req,res) => {
    let products = await Product.find({});
    let newcollections = products.slice(1).slice(-8);
    console.log("New Collection Fetched");
    res.send(newcollections)
})

//Creating endpoint for Popular Item

app.get('/popularitem', async (req,res) => {
    let product = await Product.find({category:"men"});
    let popularitem = product.slice(0,4);
    console.log("Popular Item Feched ");
    res.send(popularitem)
})



//Creating middelware for fetch user

// const fetchUser = async (req,res,next) => {
//     const token = req.header('Auth-Token');
//     if (!token) {
//         res.status(401).json({ errors: "Please Authenticate using valid token" });

//     }
//     else{
//         try {
//             const data = jwt.verify(token,'secret_ecom');
//             console.log("token data", data)
//             req.user = data.user;
//             next();
//         } catch (error) {
//             res.status(401).json({ errors: "Please Authenticate using valid token" });

//         }
//     }
// }

const fetchUser = async (req, res, next) => {
    const token = req.header('Auth-Token');
    console.log("token", token)
    if (!token) {
        return res.status(401).json({ error: "Authentication failed: Token is missing" });
    }
    
    try {
        const data = jwt.verify(token, 'secret_ecom');
        console.log("token data", data);
        req.user = data.user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Authentication failed: Token expired" });
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: "Authentication failed: Invalid token" });
        } else {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
};


//Creating Endpoint for adding product in cartdata

// app.post('/addtocart', async (req,res) => {
//     // console.log(req.body,req.user)
//     // console.log("added", req.body.itemid);
//     let userData =await Users.findOne({id:req.body.itemid});
//     console.log('userData====>', userData)
//     userData.cartData [req.body.itemid] +1;
//     await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Added")
// })

app.post('/addtocart',fetchUser, async (req, res) => {
    try {
        let productData = await Product.findOne({ id: req.body.itemid });
        if (!productData) {
            return res.status(404).json({ error: "User data not found" });
        }
        console.log('userData====>', req.user);
    //   console.log( productData.cartData[req.body.itemid] += 1)
        await Users.findOneAndUpdate({ _id: req.user._id }, { cartData:  productData});
        res.send("Added");
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


//Creating Endpoint for remove product in cartdata

app.post('/removefromcart', fetchUser , async (req,res) => {
    console.log("removed", req.body.itemId);
    let userData =await Users.findOne({_id:id.req.id});
    if(userData.cartData [req.body.itemId]>0)
    userData.cartData [req.body.itemId] -1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

//Creating endpoint to get cartdata

app.post('/getCart', fetchUser ,async (req,res) =>{
    console.log("GetCart");
    let userData =  await Users.findOne({_id:req.user._id});
    res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port "+port)
    }
    else{
        console.log("Error"+error)
    }
})