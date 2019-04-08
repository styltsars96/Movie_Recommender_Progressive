/**
 * Requires: toolbox.js , accessDB.js (as fallback and cache)
 */

//API Requests: Input the required items. Return a Promise with ready results.--

//Search Keyword -> Movies and Attributes
const movieSearchAPI = (searchString) => {
    return new Promise((resolve, reject) => {
        doRequest('post', `${staticURL}/movie`, {}, {
                "keyword": searchString
            })
            .then(ajax => {
                const result = responseJSON(ajax);
                if(result.error){
                    console.error("API error, message: "+result.error);
                    return;
                }
                //console.log(JSON.stringify(result));// TEST
                if (result.length == 0) {
                    console.log("length==0"); // TEST
                    reject(ajax);
                } else resolve(result);
            }).catch(ajax => {
                //If it failed, use the Past API searches.
                console.log("movieSearchAPI: Failed to search movies."); // TEST
                handleDBsuccess(
                    accessIDB("pastAPISearches", 'get', {
                        getKey: searchString
                    }),
                    (data) => {
                        if (data) {
                            console.log('Data fetched from local DB');
                            resolve(data.result);
                        } else {
                            console.error("Sorry! We were unable to fetch results.");
                            reject(ajax);
                        }
                    }
                );
                console.error("Unable to fetch results from backend.");
            });
    });
};

//List of Movie IDs -> Ratings for these movies, by all users.
const movieRatingsAPI = (movieList) => { //Careful this is slow when many IDs are queried.
    if (!movieList instanceof Array) {
        console.trace('Non-array object passed!');
    } else {
        console.log("movieRatingsAPI: passed movielist: "+ JSON.stringify(movieList));
        return new Promise((resolve, reject) => {
            doRequest('post', `${staticURL}/ratings`, {}, {
                "movieList": movieList
            }).then(ajax => {
                const result = responseJSON(ajax);
                if(result.error){
                    console.error("API error, message: "+result.error);
                    return;
                }
                if (result.length < 1) {
                    reject(ajax);
                } else resolve(result);
            }).catch(() => {
                console.error("Sorry! We were unable to fetch the ratings.");
                reject(ajax);
            });
        });
    }
};

// User ID -> All ratings the user submited.
const userRatingsAPI = (userId) => {
    userId = parseInt(userId);
    if (!Number.isInteger(userId)) {
        console.trace('Non-integer passed!');
    } else {
        return new Promise((resolve, reject) => {
            doRequest('get', `${staticURL}/ratings/${userId}`)
                .then(ajax => {
                    const result = responseJSON(ajax);
                    if(result.error){
                        console.error("API error, message: "+result.error);
                        return;
                    }
                    if (result.length < 1) {
                        reject(ajax);
                    } else {
                        let dbInput = {
                            userId: userId,
                            allRatings: true,
                            timestamp: Math.floor(Date.now() / 1000),
                            values: {}
                        };
                        result.map((ratingObj) => { //{"userId": 1, "movieId": 2, "rating": 3.5, "timestamp": 1112486027 }
                            dbInput.values[ratingObj.movieId] = {
                                rating: ratingObj.rating,
                                timestamp: ratingObj.timestamp
                            };
                        });
                        handleDBsuccess(accessIDB("otherUserRatings", 'put', dbInput), () => {
                            console.log("Updated ratings of user in DB");
                        });
                        resolve(result);
                    }
                }).catch(() => {
                    console.error("Sorry! We could not fetch ratings for this movie.");
                    reject(ajax);
                });
        });
    }
};

// Movie ID (Integer) -> Properties of movie (Object).
const moviePropertiesAPI = (movieId) => {
    movieId = parseInt(movieId);
    if (!Number.isInteger(movieId)) {
        console.trace('Non-integer passed!');
    } else {
        return new Promise((resolve, reject) => {
            doRequest('get', `${staticURL}/movie/${movieId}`)
                .then(ajax => {
                    const result = responseJSON(ajax);
                    if(result.error){
                        console.error("API error, message: "+result.error);
                        return;
                    }
                    if (result.length < 1) {
                        reject(ajax);
                    } else {
                        resolve(result[0]);
                        //Add to movie cache
                        accessIDB("movieCache", 'put', result[0]);
                    }
                }).catch(() => {
                    reject(ajax);
                })
        });
    }
};
