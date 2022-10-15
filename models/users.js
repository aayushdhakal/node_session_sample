const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
   name:{
      type:String,
      required:true,
      trim:true
   },
   password:{
      type:String,
      trim:true,
      minlength:7,
      validate(value){
         if(value.toLowerCase().includes('password')){
            throw new Error('Password should not contain "password"');
         }
      }
   },
   email:{
      type:String,
      unique:true,
      required: true,
      trim: true,
      lowercase: true,
      validate(value) {
         if (!validator.isEmail(value)) {
            throw new Error('Email is invalid');
         }
      }

   }
},{
   timestamps:true
})

userSchema.pre('save', async function (next) {
   const user = this;
   if (user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 8);
   }
   next();
})

userSchema.statics.findByCredentials = async (email,password)=>{
   const user = await User.findOne({email});
   const message = 'Please enter the Email or password corectly.'

   if(!user){
      throw new Error(message);
   }

   const matchPassword = await bcrypt.compare(password,user.password);
   
   
   if (!matchPassword) {
      throw new Error(message);
   }

   return user;

}

const User = mongoose.model('User', userSchema)

module.exports = User;