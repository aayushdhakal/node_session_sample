/*
 This is basic login and signup using express,express-session using node app.
 This code shows the use of express authentication based on session using the hbs as the primary template 
 The session cookie can only save the cookie for the time being of 2 hours which can be extented as wished.
 cookie or the session can be decided as the user when to remember it or not
 we used the mongodb database for this example
*/

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');// body parser is not mainly used now mainly express.urlencoded is used in current verssion of the express
const hbs = require('hbs'); //this is for the templating as partials  and views  
const path = require('path'); // this is available as the default node apis 
const User = require('./models/users')//this is used for the user model of the mongodb database
const TWO_HOURS = 1000 * 60 * 60 * 2; // time for the cookie to expires 

require('./db/db'); // running the mongodb database 


//setting up the default variable used in the express
//this variable is used in the default express-session values
const {
   PORT = 3000,
   NODE_ENV = 'development',

   SESS_NAME = 'sid',
   SESS_SECRECT = 'this is the secrect key @% %should be kept secrect@@',
   SESS_LIFETIME = TWO_HOURS
} = process.env;


//setting the default variable used in the templating(hbs) path declaration
const {
   publicDirectoryPath = path.join(__dirname, './public'),//path file for the default image, js and css files
   viewspath = path.join(__dirname, './templates/views'),// path declaration for the views for hbs  
   partialsPath = path.join(__dirname, './templates/partials') //path declaration for the partials for hbs
} = process.env 

const IN_PROD = NODE_ENV === 'production'; // in production we have to implement the tls system for https

const app = express();
app.use(express.json());//it is used to parse the incomming request with JSON payload
app.use(express.urlencoded({ extended: true })) //expects request data to be sent encoded in the URL, usually in strings or arrays
//we have to explicitly define extende:true  otherwise it might show the warning 

//for partials or hbs
app.set('view engine', 'hbs');//declaring the templating langauge as hbs, some other templating language are Mustache,ejs,handlebars,dot,nuckjucks,underscore,pub,webix,hogan,marko,jsrender
app.set('views', viewspath);//setting the views path
hbs.registerPartials(partialsPath);//setting the partials path
app.use(express.static(publicDirectoryPath));//declaring the public(js,css,image) path


// setting up the express-session with the some various default values and setting for the cookie 
app.use(session({
   name: SESS_NAME,
   resave: false, 
   saveUninitialized: false,
   secret: SESS_SECRECT,
   cookie: {
      sameSite: true,
      secure: IN_PROD,
      maxAge:SESS_LIFETIME
   }
}))

//this is the function used to render the views along with the default values like name,email,userSession 
const renderpage = (
   req, 
   res, 
   pageName, 
   objectData = {})=>{
   return res.render(`${pageName}`, {
      name: req.session.data.name,
      email: req.session.data.email,
      userSession: req.session.userSession
   })
}

const redirectLogin = (req, res, next) => { // middleware use such that if the session does't exists redirect it to Login page
   if (!req.session.userSession) {
      res.render('login');
   } else {
      next()
   }
}

const redirectHome = (req, res, next) => { // middleware use such that if logged and wehn users goes to login page then it will redirect it to the home page

   if (req.session.userSession) {
      return renderpage(req,res, 'index');
   } else {
      next()
   }
}

const useSessionData = (req,res, next) => {//if the middleware has the req.session.data then set the req.session.data with some datas and then process it
   if(req.session.data){
      const user = {
         name: req.session.data.name,
         email: req.session.data.email
      }
   }
   next()
}

app.get('/', redirectLogin, useSessionData ,(req, res) => {
   return renderpage(req,res, 'index');
})

app.get('/profile', redirectLogin, (req, res) => { // demo link for checking the user data
   const { user } = res.locals;
   renderpage(req,res,'profile')
})

app.get('/login', redirectHome, async (req, res) => { // get request for providing the page in login request
   res.render('login');

})

app.get('/register', redirectHome, (req, res) => { // get request for providing the page in register request
   res.render('register')
})


app.post('/login', redirectHome, async (req, res) => { // post request for login
   try {
      //running the function passing the email and password which will go throught the User model which will check the database and return user info if found else throw error
      const user = await User.findByCredentials(req.body.email, req.body.password);

      //if the user is found then it willed be proccessed
      if (user) {
         //setting the user session
         req.session.userSession = user.id
         
         //check if the checkbox is ticked or not if not ticked then the session-cookie with will set as the session expires when browers closes but when it is ticked then the session cookie will have the expiration date as given above
         if (req.body.remember !== 'on') {
            req.session.cookie.expires = false //make the session-cookie expires when the bowser exits 
         }

         //passing the information on the session using req.session.data as object
         req.session.data = {
            name: user.name,
            email: user.email
         }

         //running the function as the with numerous parameters
         return renderpage(req,res,'index');
      }

   } catch (e) {
      //catches the error if the User.findByCredentials throw the error if the user is not found or the password doesn't matches or any other error like connection timeout so on. and error will be processed it with the message as the object and render it
      return res.render('login', {
         error: e.message
      })
   }
})

app.post('/register', redirectHome, async (req, res) => { // post request for the register a new user

   //check if the both password and re-password matches and render the page register page with the error 
   if (req.body.password !== req.body.rePassword) {
      return res.render('register', {
         error: "Password doesn't match"
      });
   }

   //extracting the user from the request body and setting as the new class model with various parameters
   const user = new User({ name, email, password } = req.body);

   // console.log(user);
   try {
      //trying to save the new user on the database 
      await user.save()
   } catch (e) {
      //it will process the error on the render page if any occurs like email address already exists soo on with the message
      return res.render('register', {
         error: e.message
      })
   }

   //if the registration of the new user is successful then we redirect it to login page
   res.redirect('/login');
})

app.post('/logout', redirectLogin, (req, res) => { // post route for the logout

   //destroying the session on the browers and as it logout
   req.session.destroy(err => {
      if (err) {// if the req.session is not destroyed in case then procced on err callback and redirect to home without logout
         return res.redirect('/home');
      }

      //clearing the cookie when logout
      res.clearCookie(SESS_NAME); // clearing the cookie which has the name of SESS_NAME
      res.redirect('/login');
   });
})

app.listen(PORT, () => {
   console.log(`Server is running in port  http://localhost:${PORT}`);
})


