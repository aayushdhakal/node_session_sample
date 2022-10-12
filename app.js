const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');// body parser is nat mainly used as express.urlencoded is used
const { exists } = require('fs');
const TWO_HOURS = 1000 * 60 * 60 * 2;

const {
   PORT = 3000,
   NODE_ENV = 'development',

   SESS_NAME = 'sid',
   SESS_SECRECT = 'this is the secrect key @% %should be kept secrect@@',
   SESS_LIFETIME = TWO_HOURS
} = process.env;

const IN_PROD = NODE_ENV === 'production'; // in production we have to implement the tls system for https

const users = [
   { id: 1, name: 'Alex', email: 'alex@gamil.com', password: 'secret' },
   { id: 2, name: 'Jhons', email: 'jhons@gamil.com', password: 'secret' },
   { id: 3, name: 'Max', email: 'max@gmail.com', password: 'secret' },
] // acting as the temporary database 


const app = express();
app.use(express.json())
app.use(express.urlencoded({
   extended: true
})) // we have to explicitly define it otherwise it will show the warning 


app.use(session({
   name: SESS_NAME, //custom name 
   resave: false, // not to store the sessions back to the store if they were not modified during request
   saveUninitialized: false, // dont save the session if it doesnt have any data on it for auth
   secret: SESS_SECRECT, // acustom secrect
   cookie: { // foor default HTTP only and it is for the cookie options
      maxAge: SESS_LIFETIME,
      sameSite: true, //or strict // also use protection from the csrf for working in older machine in prod
      secure: IN_PROD
   }
}))

const redirectLogin = (req, res, next) => { // middleware use such that if the session does't exists redirect it to Login page working on Home page
   if (!req.session.userID) {
      res.redirect('/login');
   } else {
      next()
   }
}

const redirectHome = (req, res, next) => { // middleware use such that if logged and users goes to login page then it will redirect it to the home page
   if (req.session.userID) {
      res.redirect('/home');
   } else {
      next()
   }
}

app.get('/', (req, res) => { // this is the page for the home page accessed to everyone
   // console.log(req.session);
   const { userID } = req.session;

   res.send(`
      <html>
         <head></head>
         <body>
            <h1>Welcome</h1>
            ${userID ? `
               <a href="/home">Home</a>
               <form method='post' action='/logout'>
                  <button>Logout</button>
               </form>
            ` : `
               <a href="/login">Login</a>
               <a href="/register">Register</a>
            ` }

         </body>
      </html>
   `)
})

app.use((req, res, next) => { // middleware such that if logged in then the user is saved in the locals such that each request will be passed through this request
   const { userID } = req.session
   if (userID) {
      res.locals.user = users.find(user => user.id === userID);
   }
   next();

})

app.get('/home', redirectLogin, (req, res) => { // home page accessed only when the user is logged in
   const { user } = res.locals
   console.log(req.session);
   res.send(`
      <h1>Home</h1>
      <a href="/">Main</a>
      <ul>
         <li>Name:${user.name} </li>
         <li>Email:${user.email} </li>
      </ul>
   `)
})

app.get('/profile', redirectLogin, (req, res) => { // demo link for checking the user data
   const { user } = res.locals;
})

app.get('/login', redirectHome, (req, res) => { // get request for providing the page in login request
   res.send(`
      <h1>Login get</h1>
      <form action='/login' method='POST'>
         <input type='email' name='email' placeholder='Email'  value='${users[0].email}' required />
         <input type='password' name='password' placeholder='password' value='${users[0].password}'required />
         <button>Submit</button>
      </form>
      <a href='/register'>Register</a>
   `)
})

app.get('/register', redirectHome, (req, res) => { // get request for providing the page in register request
   res.send(`
      <h1>Register</h1>
      <form method='POST' action='/register'>
         <input type='text' name='name' placeholder='name' required />
         <input type='email' name='email' placeholder='Email' required />
         <input type='password' name='password' placeholder='password' required />
         <input type='submit' />
      </form>
      <a href='/login'>Login</a>
   `)
})

app.post('/login', redirectHome, (req, res) => { // post request for login
   const { email, password } = req.body // getting data from the user in the req.body
   console.log(req.body)

   if (email && password) { // check if the email and password is passed through

      //check in the array if the user exists or not
      const user = users.find(user => user.email === email && user.password === password)

      if (user) { // if user exists then we save the user id in user session
         req.session.userID = user.id
         return res.redirect('/home')
      }
   }

   res.redirect('/login');// if the email and password doesnt exists then redirect it to home
})

app.post('/register', redirectHome, (req, res) => { // post request for the register
   const { name, email, password } = req.body  // get name email and password from the request body

   if (name && email && password) { // check if the name, email and password exists
      const exists = users.some(user => user.email === email) // check if the email exists in the users array

      if (!exists) { // if the users doesnt exists in the array we work with
         const user = {
            id: users.length + 1,
            name,
            email,
            password
         }

         users.push(user); // addin the new user to the array
         req.session.userID = user.id // pushing the user id in the session id 
         return res.redirect('/home')
      }
   }

   res.redirect('register'); // TODO: qs /register?error=error.auth.emailTooShort

})

app.post('/logout', redirectLogin, (req, res) => { // post route for the logout
   req.session.destroy(err => {
      if (err) {// if the req.session is not destroyed then procced on err callback and redirect to home
         return res.redirect('/home');
      }

      res.clearCookie(SESS_NAME); // clearing the cookie which has the name of SESS_NAME
      res.redirect('/login');
   });
})

app.listen(PORT, () => {
   console.log(`Server is running in port  http://localhost:${PORT}`);
})


