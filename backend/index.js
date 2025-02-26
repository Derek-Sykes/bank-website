import express from "express";
import userRoutes from "./routes/users.js";
import cors from "cors"; // Import the CORS package
import itemRoutes from "./routes/items.js";
import categoryRoutes from "./routes/category.js";
import cookieParser from "cookie-parser";
import { authenticateToken } from "./middleware/authenticateToken.js";

const app = express();
const port = 3000;
app.use(
  cors({
    origin: "http://localhost:5173", // Explicitly allow frontend origin
    credentials: true, // Allow cookies & authentication headers
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).send("Hello World!");
});

// can login and register, no sessions or tokens yet
app.use("/users", userRoutes);
// any routes from here down are protected
app.use(authenticateToken);
app.use("/items", itemRoutes);
app.use("/categorys", categoryRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

////////////////////////////////////////////
// NOTES:

// users can add things to wish list now.
// user should be able to create a category and add items from wish list into these categories by updating the items category_id by its item_id.
// user should also be able to create items within category which just calls the makeItem function but also passes in the category_id with the request in the body.
// i can use the getItemBY function to see all the items that the logged in user has created scoped within a specific category.

/////////////////////////////////////////////
//TODO:

// at some point i should organize my code so that all the controllers for the routes are in the controllers folder.

//

/////////////////////////////////////////////
//LATER TODO:

// CORS (cross site resourse sharing), set up configuration to say whos allowed to reqest data from my server.

//////////////////////////////////////////////
// Command line commands:

// to run this you must be in the project directory with the package.json file aka bank=>
//PS C:\Users\drock\Desktop\bank> npm run dev
