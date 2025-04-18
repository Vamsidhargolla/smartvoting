// const express = require("express");
// const bodyParser = require("body-parser");
// const { Pool } = require("pg");
// const bcrypt = require("bcrypt"); // For password hashing
// const app = express();
// const port = 3000;


// // Serve static files like CSS
// app.use(express.static(__dirname));

// // Middleware
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // PostgreSQL connection
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "smartvoting",
//   password: "vamsi@123",
//   port: 5432,
// });

// // Routes

// // Home route (serves login page)
// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/index.html");
// });

// // Serve the registration page (register.html)
// app.get("/register", (req, res) => {
//   res.sendFile(__dirname + "/register.html");
// });

// // Registration route
// app.post("/register", async (req, res) => {
//   const { firstname, lastname, mailid, voterid, phonenumber, password, confirmpassword } = req.body;

//   // Validate passwords match
//   if (password !== confirmpassword) {
//     return res.status(400).send("Passwords do not match");
//   }

//   try {
//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert into database
//     await pool.query(
//       "INSERT INTO users (firstname, lastname, mailid, voterid, phonenumber, password) VALUES ($1, $2, $3, $4, $5, $6)",
//       [firstname, lastname, mailid, voterid, phonenumber, hashedPassword]
//     );

//     res.send("Successfully registered! <a href='/'>Go to Login</a>");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error registering user.");
//   }
// });

// // Login route
// // app.post("/login", async (req, res) => {
// //   const { mailid, password } = req.body;

// //   try {
// //     const result = await pool.query("SELECT * FROM users WHERE mailid = $1", [mailid]);

// //     if (result.rows.length === 0) {
// //       return res.status(400).send("User not found.");
// //     }

// //     const user = result.rows[0];

// //     // Check password
// //     const isPasswordValid = await bcrypt.compare(password, user.password);

// //     if (!isPasswordValid) {
// //       return res.status(400).send("Invalid credentials.");
// //     }

// //     res.send("Login successful!");
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send("Error logging in.");
// //   }
// // });
// // Login route
// app.post("/login", async (req, res) => {
//     const { mailid, password } = req.body;
  
//     try {
//       const result = await pool.query("SELECT * FROM users WHERE mailid = $1", [mailid]);
  
//       if (result.rows.length === 0) {
//         return res.status(400).send("User not found.");
//       }
  
//       const user = result.rows[0];
  
//       // Check password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
  
//       if (!isPasswordValid) {
//         return res.status(400).send("Invalid credentials.");
//       }
  
//       // Send a successful login response with the "Give Vote" button
//       res.send(`
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Login Success</title>
//            <link rel="stylesheet" href="styles.css">
//         </head>
//         <body>
//           <h1>Login successful, ${user.firstname}!</h1>
//           <form action="/give-vote" method="POST">
//             <button type="submit">Give Vote</button>
//           </form>
//         </body>
//         </html>
//       `);
//     } catch (err) {
//       console.error(err);
//       res.status(500).send("Error logging in.");
//     }
//   });
  

// // Forgot password route
// app.post("/forgot-password", async (req, res) => {
//   const { mailid, newPassword } = req.body;

//   try {
//     // Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     // Update password in the database
//     await pool.query("UPDATE users SET password = $1 WHERE mailid = $2", [hashedPassword, mailid]);

//     res.send("Password updated successfully! <a href='/'>Go to Login</a>");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error resetting password.");
//   }
// });

// // Start server
// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcrypt"); // For password hashing
const { spawnSync } = require("child_process");
const app = express();
const port = 3000;

// Serve static files like CSS
app.use(express.static(__dirname));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "smartvoting",
  password: "vamsi@123",
  port: 5432,
});

// Routes

// Home route (serves login page)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Serve the registration page (register.html)
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});


// Registration route with face capture
app.post("/register", async (req, res) => {
  const { firstname, lastname, mailid, voterid, phonenumber, password, confirmpassword } = req.body;

  console.log("Voter ID length:", voterid.length);
  console.log("Phone number length:", phonenumber.length);
  console.log("Email length:", mailid.length);

  // Validate input
  if (password !== confirmpassword) {
    return res.status(400).send("Passwords do not match");
  }

  if (phonenumber.length !== 10) {
    return res.status(400).send("Phone number must be 10 digits");
  }

  if (voterid.length > 50) {
    return res.status(400).send("Voter ID must be less than 50 characters.");
  }

  try {
    // Check if the email is already registered
    const existingUser = await pool.query("SELECT * FROM users WHERE mailid = $1", [mailid]);
    if (existingUser.rows.length > 0) {
      return res.status(400).send("⚠️ Email already exists!");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Format folder name for storing face data
    const faceFolder = `captured_faces/${mailid.replace(/[@.]/g, "_")}`;

    // Run the face capture script (passing email, NOT folder)
    // const captureResult = spawnSync("python", ["face_capture.py", mailid], { encoding: "utf8" });
    const captureResult = spawnSync("python", ["face_capture.py", mailid.trim()], { encoding: "utf8", stdio: "inherit" });


    if (captureResult.error) {
      console.error("❌ Error capturing face images:", captureResult.error);
      return res.status(500).send("Error capturing face images.");
    }

    console.log("📷 Face capture output:", captureResult.stdout);

    // Insert user details into database
    await pool.query(
      "INSERT INTO users (firstname, lastname, mailid, voterid, phonenumber, password, face_folder) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [firstname, lastname, mailid, voterid, phonenumber, hashedPassword, faceFolder]
    );

    res.send("✅ Successfully registered! <a href='/'>Go to Login</a>");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error registering user.");
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { mailid, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE mailid = $1", [mailid]);

    if (result.rows.length === 0) {
      return res.status(400).send("User not found.");
    }

    const user = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).send("Invalid credentials.");
    }

    // Send a successful login response with the "Give Vote" button
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Success</title>
         <link rel="stylesheet" href="styles.css">
      </head>
      <body>
        <h1>Login successful, ${user.firstname} ${user.lastname} !</h1> 
        <form action="/give-vote" method="POST">
          <button type="submit">Give Vote</button>
        </form>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error logging in.");
  }
});

// Serve the "Give Vote" page after face verification
app.post("/give-vote", async (req, res) => {
  try {
    const { spawnSync } = require("child_process");

    // Run the Python script
    const verifyResult = spawnSync("python", ["verify_face.py"], { encoding: "utf8" });

    // Log output and errors
    console.log("stdout:", verifyResult.stdout.trim());
    console.log("stderr:", verifyResult.stderr.trim());

    if (verifyResult.error) {
      console.error("Error during face verification:", verifyResult.error);
      return res.status(500).send("Error during face verification.");
    }

    const output = verifyResult.stdout.trim();
    console.log("Processed Output:", output);  // Debugging

    // ✅ Ensure output is correctly checked
    if (output.includes("Face recognized:")) {  
      const userId = output.split(":")[1].trim();
      console.log("✅ Face matched for:", userId);
      return res.sendFile(__dirname + "/vote.html");
    }

    console.log("❌ Face not recognized.");
    return res.status(401).send("Face not recognized. Access denied. <a href='/'>Go to Home</a>");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error during face verification.");
  }
});


//serves submit vote
app.post("/submit-vote", async (req, res) => {
  const { voterid, party } = req.body;

  console.log("Received Voter ID:", voterid); // Debugging line
  console.log("Received Party:", party); // Debugging line

  try {
    // Check if the voter has already voted
    const result = await pool.query("SELECT * FROM votes WHERE voterid = $1", [voterid]);

    if (result.rows.length > 0) {
      return res.status(400).send("❌ You have already voted. You cannot vote again.");
    }

    // Insert the new vote
    await pool.query("INSERT INTO votes (voterid, party) VALUES ($1, $2)", [voterid, party]);

    res.send("✅ Your vote has been successfully submitted!  <a href='/'>Go to Home</a>");
  } catch (err) {
    console.error("Error saving vote:", err);
    res.status(500).send("❌ Error saving vote.");
  }
});



// Forgot password route
app.post("/forgot-password", async (req, res) => {
  const { mailid, newPassword } = req.body;

  try {
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in the database
    await pool.query("UPDATE users SET password = $1 WHERE mailid = $2", [hashedPassword, mailid]);

    res.send("Password updated successfully! <a href='/'>Go to Login</a>");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error resetting password.");
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
