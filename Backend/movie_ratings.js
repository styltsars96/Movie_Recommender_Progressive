const db = require('./connection');
/**
 * Main logic.
 * Rest API filtered input -> Get data from DB.
 * Steps for each: formulate query, (resolve, reject)promise.
 */
module.exports = {
    movieSearch: (obj) => {
        return new Promise(async (resolve, reject) => {
            if (typeof obj != "object" || !obj.keyword) {
                reject('Malformed body! Example body for POST: {"keyword":"troy"}');
                return;
            }
            //Formulate query
            let query = `select * from movies where title like ?`;
            //Handle response
            try {
                const result = await db.query(query, [`%${obj.keyword}%`]);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    },
    movieRatings: (movieObj) => {
        return new Promise(async (resolve, reject) => {
            if (typeof movieObj != "object" || !movieObj.movieList) {
                reject('Malformed body! Example body for POST: {"movieList":[4,5,12]}');
                return;
            }
            // Formulate query
            let query = `select * from ratings where`; // Incomplete, filled bellow.
            const movies = movieObj.movieList;
            //Input should be a list of IDs. Input check:
            if (!Array.isArray(movies)) {
                reject("Input is not an Array!");
                return;
            }
            let i = 0;
            movies.map((movieId) => {
                //Check if each movie id is truly a number!
                movieId = parseInt(movieId, 10);
                if (typeof movieId != "number" || isNaN(movieId))
                    reject(`${movieId} is not a valid movieId`);
                //Prepare query portion.
                if (i == 0) {
                    query = `${query} movieId = ?`;
                } else query = `${query} or movieId = ?`;
                i++;
            });
            //Handle response
            try {
                const result = await db.query(query, movies);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        })
    },
    userRatings: (userId) => {
        //Formulate query
        userId = parseInt(userId, 10);
        const query = `select * from ratings where userId = ?`;
        return new Promise(async (resolve, reject) => {
            //Input shoud just be the user id. Input check:
            if (typeof userId != "number" || isNaN(userId)) reject("The given userId is not a Number!");
            //Handle response
            try {
                const result = await db.query(query, [userId]);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        })
    },
    movieProperties: (movieId) => {
        movieId = parseInt(movieId, 10);
        //Formulate query
        const query = `select * from movies where movieId = ?`;
        return new Promise(async (resolve, reject) => {
            //Input shoud just be the user id. Input check:
            if (typeof movieId != "number" || isNaN(movieId)) reject("The given movieId is not a Number!");
            //Handle response
            try {
                const result = await db.query(query, [movieId]);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        })
    }
};
