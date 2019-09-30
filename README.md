# Progressive Movie Recommender with Collaborative Filtering.
A movie recommendations progressive web application. Built just with JavaScript (ES6).
Recommendations are made with collaborative filtering within the web app.

## Overview.
### Backend
Serves the web app and exposes a REST API for the central Database.
* Search for a movie based on title.
* Ratings for a list of movies.
* All ratings for a user id.
* Properties for a movie, by its id.

### WebApp
A single page application
* User searches for a movie and adds ratings to it.
* They can also remove movies they don't want to appear.
* The ratings are saved in IndexedDB instance.
* They can then ask for recommendations, which appear at the lower section.
* Database handling and collaborative filtering are done in separate workers.
* Collaborative filtering is done on a worker, and is based on the Pearson Correlation Coefficient between the local user and others.
* The movies with the higher ratings from these users are presented as recommendations.
* All the data used is saved and updated locally, so the user can use the application offline and as a speed improvement.

### mySQL_script and staticFiles
A script that loads the user ratings data, the csv files in staticFiles directory, to the MySQL DB.
