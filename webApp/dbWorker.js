/**
 * Requires: toolbox.js , accessDB.js
 */
// Worker script for Colaborative filtering and other stuff!
importScripts("./url.js", "./toolbox.js", "./accessDB.js", "./accessAPI.js");

const getRatings = (movies) => { // Add other user's ratings to the DB.
    //THESE ARE THE RATINGS FOR A LIST OF MOVIES. So for each user, allratings: false
    movieRatingsAPI(movies).then(result => { //If not already in DB, access API...
        console.log(JSON.stringify(result)); //TEST
        //Fetch from DB
        handleDBsuccess(accessIDB("otherUserRatings", 'getAll'), (data) => {
            let users = {}; //values object For each user.
            let userExclutions = []; //Users whose values are not to be updated.
            if (!data || data.length == 0) {
                console.log("Empty otherUserRatings!");
            } else {
                //Array to hash.
                for (user of data) {
                    // USE TIMESTAMP WHEN DATA FROM BACKEND BECOMES DYNAMIC.
                    if (!user.allRatings) {
                        //get users' values to be updated.
                        users[user.userId] = user.values; //{movieId, rating, timestamp}
                    } else {
                        //IF USER DOES HAVE ALL RATINGS ALREADY...
                        userExclutions.push(user.userId);
                    }
                }
            }
            let resAPI = result;
            resAPI.map((rating) => {
                //Don't do anything if user is excluded.
                if (contains(userExclutions, rating.userId)) {
                    return;
                }
                let forUser = {};
                if (users[rating.userId]) { //Get the local.
                    forUser = users[rating.userId]; //{movieId:{rating: value, timestamp: value}}
                }
                //Update the rating for the movie.
                forUser[rating.movieId] = {
                    rating: rating.rating,
                    timestamp: rating.timestamp
                };
                users[rating.userId] = forUser;
            });
            //Make hash into array again.
            let forDb = [];
            for (let key in users) {
                forDb.push({
                    userId: key,
                    values: users[key],
                    allRatings: false,
                    timestamp: Math.floor(Date.now() / 1000)
                });
            }
            //Put results in DB.
            batchUpdate("otherUserRatings", 'put', forDb, () => {
                    console.log("Other user's ratings inserted, for movie IDs " +
                        JSON.stringify(movies).slice(1, -1)); //TEST
                }, false //ASYNC
            );
        });
    }).catch(ajax => {
        console.log("dbWorker: Error while accessing API");
        console.trace(ajax);
    });
}

//Following the protocol set in toolbox.js
/*An msg object that contains:
 -command: The command(s) to be executed. 'command' = function inside worker +
    (if needed) the corresponding reaction to the function's response.
 -payload: The data to be used.
The commands object (commandsObj parameter) contains functions.
 */
// Procedures triggered by main thread.
onmessage = workerProcess({
    handleSearch: (input) => {
        let newSearch = {
            query: input.searchInput,
            results: input.result,
            timestamp: Math.floor(Date.now() / 1000)
        };
        //Add search...
        let transaction = accessIDB("pastAPISearches", 'put', newSearch);
        //Simple handling, without helpers.
        transaction.onsuccess = function() {
            console.log("pastAPISearches: API search saved.");
        }
        transaction.onerror = function() {
            console.log("pastAPISearches: API search saving failed.");
        }
        //Add movies to "cache".
        batchUpdate("movieCache", 'put', input.result, () => {
                console.log("dbWorker: Batch update prepared."); //TEST
            }, false //ASYNC
        );
    },
    getRatings: () =>{ //Refresh ratings and get recommendations!
        handleDBsuccess(accessIDB("localUserRatings", 'getAllKeys'), (movieList) =>{
            getRatings(movieList); //Update rarings for all movies!
            postMessage(constructMSG('recommend'));
        });
    },
    otherUser: (movieId) => { // Add other user's ratings to the DB.
        getRatings([movieId]);
    },
    setDB: (input) => {
        setupIDB(input.idbName, input.objStores, input.version);
    }

});
