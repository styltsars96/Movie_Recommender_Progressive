/**
 * Requires: toolbox.js , accessAPI.js , accessDB.js
 */
var dbVersion = 1;
var ratingTimeout; //Timeout for storing new movie rating.
var localUserRatings = {};

// Database handling -----------------------------------------------------------
const idbName = "MovieRecTsarsi2019DB"; //DB name and object stores to create.
//The following object: [{storeName, options, indexes[{indexName, property, options}]}]
const objStores = [ //Object stores to create.
    { // User's inserted movie ratings.
        storeName: "localUserRatings",
        options: {
            keyPath: "movieId" // "Primary Key" of sorts.
            //rating, timestamp are the other values.
        }
    },
    { //Movie ratings of other users. Purpose: store only movies of interest.
        storeName: "otherUserRatings",
        options: {
            keyPath: "userId"
        }
    }, {
        storeName: "pastAPISearches", //Past searches.
        options: {
            keyPath: "query" // Set query string as primary key.
        } //The rest is results, an Array with the results.
    }, {
        storeName: "movieCache",
        options: {
            keyPath: "movieId"
        }
    }, {
        storeName: "exceptions",
        options: {
            keyPath: "movieId"
        }
    }
];

checkIDB(); //Make a check for indexedDB existence in the beginning.
setupIDB(idbName, objStores, dbVersion, () =>{//Setup DB if needed, and get the promise.
    // First things to do after setting up...
    handleDBsuccess(accessIDB("localUserRatings", 'getAll'), (data)=>{
        data.map((userRating)=>{
            localUserRatings[userRating.movieId] = userRating.rating;
        });
    });
});

// Setup web workers -----------------------------------------------------------
var colFilterWorker; // Web worker for colaborative filtering recommendations.
var dbWorker; // Web worker for DB operations.

//Check for Worker Support.
if (typeof(Worker) !== "undefined") { // Web worker support!
    try {
        colFilterWorker = new Worker("./colFilterWorker.js");
        dbWorker = new Worker("./dbWorker.js");
    } catch (e) {
        console.error(e.message);
        alert(`ERROR WHILE LOADING WORKERS!`);
    }
} else {
    alert(`The application requires Web Workers to work correctly!\n Please use a modern browser that supports HTML5!`);
}

//Get workers to set up IDB!
colFilterWorker.postMessage(constructMSG('setDB', {
    objStores: objStores,
    version: dbVersion,
    idbName: idbName
}));
dbWorker.postMessage(constructMSG('setDB', {
    objStores: objStores,
    version: dbVersion,
    idbName: idbName
}));
//Frontend Components ----------------------------------------------------------
//MOVIE EXCEPTIONS
var movieExceptions = [];

const getExceptions = () => {
    handleDBsuccess(accessIDB("exceptions", 'getAllKeys'), (data) => {
        movieExceptions = data;
    });
};

//UI Template: Simple number input for Ratings
const ratingInput = (mId, value) => {
    value = value ? `value="${value}"` : '';
    return `<input type="number" class="ratingInput" id="movie_${mId}" min="0"
     max="5" step="0.5" ${value} oninput="updateMovieRating('movie_${mId}')">`;
};

//UI Template: Result options. Implemented: Remove movie.
const resultOptions = (remId) => {
    let tokens = remId.split('_');
    //rem_id_otherplace
    return `<input type="button" id="${remId}" value=" " onclick="removeMovie(${tokens[1]});">`;
};

const removeMovie = (mId) => {
    movieExceptions.push(mId);
    try{
        removeRow(`rem_${mId}`);//Remove from search
    }catch(e){
        //Nothing to be afraid of here...
    }
    try{
        removeRow(`rem_${mId}_rec`);//Remove from recommendations.
    }catch(e){
        //Nothing to be afraid of here...
    }
    //Add to exceptions.
    handleDBsuccess(accessIDB("exceptions", 'put', {
        movieId: mId
    }), (data) => {
        console.log("Added exception " + data); //TEST
    });
    //Remove from cache.
    handleDBsuccess(accessIDB("movieCache", 'delete', {
            deleteKey: mId
        }), data => {console.log("Deleted "+ mId);});
};

//Utility: Prepare movie search table
const prepTable = (array) => {
    let newArray = array.filter(movie => {
        return !contains(movieExceptions, movie.movieId);
    });
    if (newArray.length == 0) return `All movies that match your search have been removed!`;
    let newTable = array2table(newArray.map(row => {
        let {
            movieId,
            title,
            genres
        } = row;
        let your_rating = ratingInput(movieId, localUserRatings[movieId]);
        let remove = resultOptions(`rem_${movieId}`);//Remove from search
        let genre = genres;
        row = {
            title,
            genre,
            your_rating,
            remove
        };
        return row;
    }), "movieTable");
    return newTable;
};

//Utility: Prepare recommendations table
const prepRecTable = array => {
    return array2table(array.map(row => {
        let {
            movieId,
            title,
            genres
        } = row;
        let genre = genres;
        let remove = resultOptions(`rem_${mId}_rec`);//Remove from recommendations.
        row = {
            title,
            genre
        }
    }), "recommendationsTable");
};

//UI logic ---------------------------------------------------------------------
//User's movie rating is updated!
const updateMovieRating = function(elementId) {
    var isUI = true;
    clearTimeout(ratingTimeout); //Stop the previous waiting update.
    var input = document.getElementById(elementId).value;
    if (input == '') return; //Empty input
    //Check if number input is correct!
    input = Number(input);
    let correctVal = 0;
    if (input < 0 || input > 5 || ((input) => {
            for (let i = 0; i < 5; i++) {
                if (!(input > i && input < i + 1)) continue;
                //if decimal...
                if (input != i + 0.5) {
                    correctVal = i + 0.5;
                    if (input <= i + 0.25) correctVal = i;
                    if (input >= i + 0.75) correctVal = i + 1;
                    return true;
                }
            }
            return false;
        })(input)) {
        alert('Ratings are values from 0 to 5, with a 0.5 step only!');
        //Correct to the closest acceptable value.
        if (input < 0) {
            document.getElementById(elementId).value = 0;
            return;
        } else if (input > 5) {
            document.getElementById(elementId).value = 5;
            return;
        } else {
            input = correctVal;
            document.getElementById(elementId).value = correctVal;
        }
    }
    ratingTimeout = setTimeout(() => { //Wait before doing the rest!
        //Since input is correct, continue with commiting the value.
        const movieId = elementId.replace('movie_', '');
        console.log("ID:" + movieId + ': ' + input); // TEST
        if (!movieId) { //failsafe.
            console.error('UI input error');
            return
        }
        //STORE THE VALUE FOR THE MOVIE...
        localUserRatings[movieId] = input;
        accessIDB("localUserRatings", 'put', {
            movieId: movieId,
            rating: input,
            timestamp: Math.floor(Date.now() / 1000)
        });
        //TEST with handleDBsuccess(accessIDB("localUserRatings", 'getAll'),(data)=>{console.log(JSON.stringify(data))});
        //Trigger for getting and storing other user's ratings.
        dbWorker.postMessage(constructMSG('otherUser', movieId));
    }, 2000);
};

//Prepare the dynamic movie recommendations
const setRecommendations = function() {
    colFilterWorker.postMessage(constructMSG('recommend'));
    const output = document.getElementById('recommendations');
    output.innerHTML = `<h4>Finding recommendations for you! Please wait!</h4>`;
};

//Search movies based on the keyword
const movieSearch = function() {
    getExceptions();
    const searchInput = document.getElementById('searchInput').value;
    const output = document.getElementById('searchResults');
    //Check input errors...
    if (!checkChar(searchInput, 'abcdefghijklmnopqrstuvwxyz', true)) {
        output.innerHTML = `<h4>Ooops! Wrong input!</h4>`;
        return;
    }
    //Check if there is a past search exactly like this.
    handleDBsuccess(accessIDB("pastAPISearches", 'get', {
        getKey: searchInput
    }), (data => {
        //console.log(data);//TEST
        if (data) {
            if (data.results) { //If they already exist.
                output.innerHTML = `<h2>Rate movies you've seen!</h2> ${prepTable(data.results)}`;
                return;
            }
        }
        //Do request and store data if not...
        movieSearchAPI(searchInput).then(result => {
            output.innerHTML = `<h2>Rate movies you've seen!</h2> ${prepTable(result)}`;
            //Put data to DB... command: handleSearch
            dbWorker.postMessage(constructMSG('handleSearch', {
                result: result,
                searchInput: searchInput
            }));
        }).catch((ajax) => {
            console.log(JSON.stringify(ajax)); //TEST
            output.innerHTML = `<h4>No movies found! Try again!</h4>`;
        });
    }));

};

const refreshRatings = function() { // Refresh all ratings and then get recommendations.
    dbWorker.postMessage(constructMSG('getRatings'));
}

//Set up the Event Listeners
const setListeners = function() {
    document.getElementById('searchButton').addEventListener('click', movieSearch);
    document.getElementById('recommendationsButton').addEventListener('click', setRecommendations);
    enterEqualsClick('searchInput', 'searchButton');
    document.getElementById('refreshRecButton').addEventListener('click', refreshRatings);
};

//Events communication with workers: -------------------------------------------
//Following the protocol set in toolbox.js
/*An msg object that contains:
 -command: The command(s) to be executed. 'command' = function inside worker +
    (if needed) the corresponding reaction to the function's response.
 -payload: The data to be used.
The commands object (commandsObj parameter) contains functions.
 */
//Process message from colaborative filtering worker.
colFilterWorker.onmessage = postWorkerProcess({
    recommend: (data) => { //In case all movies are ready.
        const title = `<h2>Recommendations for you!</h2>`;
        const output = document.getElementById('recommendations');
        output.innerHTML = `${title} ${prepRecTable(data)}`;
    },
    refresh: (nothingFound) => { //When searching for recommendations.
        let title = '';
        const output = document.getElementById('recommendations');
        if (nothingFound) {
            title = `Oh snap! Nothing found!`;
            title = `<h2>${title}</h2`;
            output.innerHTML = title;
        } else {
            title = `Finding some movies for you!`;
            title = `<h2 id="recTitle">${title}</h2>`;
            //Add table.
            output.innerHTML = title +
                `<table class="movieTable">
                    <thead>
                        <tr><th> Title </th><th> Genre </th><th> Remove </th></tr>
                    </thead>
                    <tbody id="recTableBody"></tbody>
                </table>`;
        }
    },
    addMovie: (movie) => {
        console.log(JSON.stringify(movie));
        const output = document.getElementById("recTableBody");
        let newElem = document.createElement('tr');
        newElem.innerHTML = `
        <td>${movie.title}</td>
        <td>${movie.genres}</td>
        <td>${resultOptions(`rem_${movie.movieId}_rec`)}</td>
        `;
        output.appendChild(newElem);
    }
});
//Process message from DB worker.
dbWorker.onmessage = postWorkerProcess({
    recommend: setRecommendations
});
