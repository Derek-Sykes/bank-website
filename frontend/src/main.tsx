import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

// command to start project: cd ./frontend/
// then: npm run dev

//Notes to self about progress
/* 


NEXT TASK:


- implement the percentage allocation for each category and account. (will involve adding field to the accounts and category tables in DB)
- then build redistribue functions that allow the user to delete a category or account and have the money redistributed to all accounts or put directly into the main account.
- directly send money from any account to a category

- organize code that i have a controller of useful functions like capitalize and the one that can retry requests to the backend as long as the refresh token is there. and i want to be able to access these from anywhere.


COMPLETED TASKS:
- allowed the home page to display the categories of the user logged in
- once the user clicks on the category let them see the accounts within that category of theirs
- add a balance field to the item object in sql, my backend and make my frontend then access it also.
- let user create, update, and delete accounts within a category (things to consider, what if they try to delete an account with money in it? )
- let user do the things above also for accounts.
- let category show  the decription when you click on it within  the categoryPage.
- initialize each user with a main account when they register and initialize it with 5000 for now 
- add ability to move money between accounts
- see how much money is allowcated in each category (this number is constructed through the frontend asking the backend for all the accounts then thre frontend figures out the total of money from each account for each category and sums them up.)

HOW IT WORKS:
- built the frontend structure for the categories and items and displaying them

NEED TO DO:

- the front end should allow the user to create update and delete categories and items (mostly done just no cascade delete for category yet)
- when money is recieved by the main account or a category it should trigger a function that distributes the money based on the previously allocated percentages.
THEY SHOULD BE ABLE TO...
- update account info 
- delete their account

- allocate precentages of new money to go into each category and each account there after
- directly send money from any account to a category
- see the percent allocated for distribution between categorys on the home page next to the category name.
- let user create, update, and delete categories (things to consider, what if they try to delete a category with money in it? )


THINGS TO KEEP IN MIND (CONSTRAINTS)
- dont let the user put more money into an account that has reached its cost.
- dont let user lower cost below money currently in the acccount (they should get a message to transfer money out first.)
- let the user decide what happens to accounds they delete with money in it. (go straight to main account, or get redistributed in category or to all catgories)
- what if they try to delete a category with accounts within? 
- ask if they would like money to be redristributed abmong all accounts, or just put in the main account, or nevermind.
- what happens to the percentages when an account or catgeory gets delteted.

*/
