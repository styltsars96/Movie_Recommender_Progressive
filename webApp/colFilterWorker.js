/**
 * Requires: toolbox.js , accessAPI.js , accessDB.js
 */
// Worker script for Colaborative filtering and other stuff!
importScripts("./url.js", "./toolbox.js", "./accessAPI.js", "./accessDB.js");

var noOfTopUsers = 5;

var movieExceptions = [];
var ratedMovies = [];

const getExceptions = () => {
    handleDBsuccess(accessIDB("exceptions", 'getAllKeys'), (data) => {
        movieExceptions = data;
    });
};

//Following the protocol set in toolbox.js
/*An msg object that contains:
 -command: The command(s) to be executed. 'command' = function inside worker +
    (if needed) the corresponding reaction to the function's response.
 -payload: The data to be used.
The commands object (commandsObj parameter) contains functions.
 */
//Use API to get info for movie, add movie in UI if successful. (If movie not already in cache)
const getFromAPI = (movieId) => {
    moviePropertiesAPI(movieId).then((movieObj) => {
        postMessage(constructMSG('addMovie', movieObj)); //TARGET {movieId, title, genres}
    }).catch((ajax) => {
        console.log("colFilterWorker: Error accessing API for movie with movieId: " + movieId);
        console.error(JSON.stringify(ajax));
    });
};

//Select the best movies from best users.
//bestUsers: [{userId:<val>, correlation:<val>, movies: [{movieId:<val>, rating:<val>}]}]
//Movies are only the ones cached!
//If not all the ratings for these users exist in db, they are fetched and added to db.
const selectMovies = (bestUsers) => {
    postMessage(constructMSG('refresh', false));
    console.log("Selecting best movies...");
    let movieArray = []; //Selected movies
    //Sort each user's movies based on their ratings.
    bestUsers.map((user) => {
        //sort each user's movies in an array.
        let movies = user.movies;
        movies.sort((a, b) => {
            return b.rating - a.rating;
        }); //Highest ratings in first indexes!!!
        user.movies = movies;
        return user;
    });
    // If the best brings 5, the second best brings 4 and so on...
    let limit = noOfTopUsers;
    for (let i = 0; i < bestUsers.length; i++) {
        for (let j = 0; j < limit - i && j < bestUsers[i].movies.length; j++) {
            let movieId = bestUsers[i].movies[j].movieId;
            //Exclude the movies the local user has already rated.
            //Exclude the movies the local user removed.
            //Exclude movies already selected by other users.
            if (!(contains(movieExceptions, movieId) ||
                    contains(ratedMovies, movieId) ||
                    contains(movieArray, movieId))) {
                movieArray.push(bestUsers[i].movies[j].movieId);
            } else limit++; //Get another movie from this user.
        }
    }
    //CONTINUE BY GETTING THE MISSING ATTRIBUTES OF EACH MOVIE!!! (async of course)
    movieArray.map((movie) => {
        //Get from local movie cache first.
        let store = accessIDB("movieCache", 'get', {
            getKey: movie
        });
        handleDBerror(store, () => {
            console.log("colFilterWorker: Error at accessing movie cache.");
            getFromAPI(movie);
        });
        handleDBsuccess(store, (data) => {
            if (data) { //If data exits.
                postMessage(constructMSG('addMovie', data)); //TARGET {movieId, title, genres}
                return;
            }
            getFromAPI(movie); //Search API if nothing found.
        });
    });
};

// Procedures triggered by main thread.
onmessage = workerProcess({
    recommend: () => { //Do collaborative filtering.

        //Helper function: prepare the user's movies.
        const prepMovies = (thisUser, ratings) => {
            thisUser.movies = []; //[{movieId:<val>, rating:<val>}]
            for (let movieId in ratings) {
                thisUser.movies.push({
                    movieId: movieId,
                    rating: ratings[movieId].rating
                });
            }
        };

        //Helper function: Determine if the ratings for this user need updating.
        //If, so UPDATE THE USER'S RATED MOVIES!
        const updateRatings = (bestUsers) => {
            console.log(JSON.stringify(bestUsers));
            let counter = 0; //When ==noOfTopUsers, continue execution.
            bestUsers.map((thisUser) => {
                if (!thisUser.allRatings) { // USE TIMESTAMP WHEN DATA FROM BACKEND BECOMES DYNAMIC.
                    //Call API. The API wrapper itself updates the DB.
                    userRatingsAPI(thisUser.userId).then((theRatings) => {
                        let movies = [];
                        theRatings.map((ratingObj) => { //{"userId": 1, "movieId": 2, "rating": 3.5, "timestamp": 1112486027 }
                            movies.push({
                                movieId: ratingObj.movieId,
                                rating: ratingObj.rating
                            });
                        });
                        thisUser.movies = movies;
                        counter++;
                        //In this case all ratings are updated, and can continue.
                        if (counter == noOfTopUsers) selectMovies(bestUsers);
                    }).catch((ajax) => {
                        console.log("colFilterWorker: userRatingsAPI failed");
                    });
                } else {
                    counter++;
                }
            });
            return counter == noOfTopUsers; //Return true if no update was needed.
        };

        //Preparation: Find may alter the final results....
        getExceptions();
        try {
            //TEST handleDBsuccess(accessIDB("localUserRatings", 'getAll'), localUserRatings => {console.log(localUserRatings);});
            handleDBsuccess(accessIDB("localUserRatings", 'getAll'), localUserRatings => {
                if (!localUserRatings || localUserRatings.length == 0) {
                    console.log("No local user ratings found.");
                    postMessage(constructMSG('refresh', true)); // Tell that nothing is found.
                    return;
                }
                let independent = []; //local user
                let movieIDS = []; //movie ids to select
                localUserRatings.map((elem) => {
                    independent.push(elem.rating);
                    movieIDS.push(elem.movieId);
                });
                ratedMovies = movieIDS; //Update the list of rated movies!
                let bestUsers = []; // Users who share the same rating patterns with the local user.
                postMessage(constructMSG('refresh', false)); //Tell that results are brewing...
                //The results are being sent back as soon as they are ready...
                let localStore = accessIDB("otherUserRatings", 'getAll');
                handleDBerror(localStore, () => {
                    postMessage(constructMSG('refresh', true)); // Tell that nothing is found.
                });
                handleDBsuccess(localStore, otherUserRatings => {
                    if (!otherUserRatings) {
                        console.log("Empty other user ratings!");
                    }
                    //Build independent and dependent variables!
                    //Calculate correlation with each user.
                    otherUserRatings.map((userRatings) => {
                        let ratings = userRatings.values;
                        let thisUser = {
                            userId: userRatings.userId,
                            timestamp: userRatings.timestamp,
                            allRatings: userRatings.allRatings
                        }; //By the end: userId, correlation, movies
                        let dependent = []; // other user
                        let filtered_independent = []; // local user
                        //Prepare the ratings for the correlation processing.
                        thisUser.correlationSupport = 0; //Measure of how many movies made the correlation.
                        for (let i = 0; i < movieIDS.length; i++) {
                            //Check if user has made a rating.
                            if (ratings[movieIDS[i]]) {
                                dependent.push(ratings[movieIDS[i]].rating);
                                filtered_independent.push(independent[i]);
                                thisUser.correlationSupport++;
                            }
                        };
                        //Calculate Pearson correlation with local user...
                        let resultCorr = pearsonCorrelation(filtered_independent, dependent);
                        //If result is not a number, then correlation is the lowest (fallback) .
                        thisUser.correlation = isNaN(resultCorr) ? -1 : resultCorr;
                        //Top users are those with the highest correlation.
                        //If current user is in the top noOfTopUsers, add to best Users.
                        for (let i = 0; i < noOfTopUsers && i <= bestUsers.length; i++) {
                            if (i == bestUsers.length) {
                                prepMovies(thisUser, ratings);
                                //ADD USER.
                                bestUsers[i] = thisUser;
                                if (bestUsers.length > noOfTopUsers) {
                                    bestUsers = bestUsers.slice(0, noOfTopUsers);
                                }
                                break;
                            }
                            if (bestUsers[i].correlation < thisUser.correlation) {
                                prepMovies(thisUser, ratings);
                                //ADD USER.
                                bestUsers.splice(i, 0, thisUser); //Insert at current index
                                if (bestUsers.length > noOfTopUsers) {
                                    bestUsers = bestUsers.slice(0, noOfTopUsers);
                                }
                                break;
                            }
                        }
                        if (bestUsers.length == 0) bestUsers.push(thisUser);
                    });
                    //Update the ratings of the users if required.
                    let userMovieStatus = updateRatings(bestUsers);
                    //If not, continue by selecting the best movies from the best users.
                    if (userMovieStatus) selectMovies(bestUsers);
                });
            });
        } catch (e) {
            postMessage(constructMSG('refresh', true)); // Tell that nothing is found.
            cosnole.error(e);
        }
    },
    setDB: (input) => {
        setupIDB(input.idbName, input.objStores, input.version);
    }
});
