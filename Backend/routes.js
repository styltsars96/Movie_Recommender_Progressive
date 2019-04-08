const movie_ratings = require('./movie_ratings');

module.exports = {
    configure: function(app) {
        // For Front End WebApp ------------------------------------------------
        app.get('/', function(req, res) {
            res.redirect('/app.html');
        });

        // For REST API Backend ------------------------------------------------
        app.post('/movie', async function(req, res) {
            try {
                const result = await movie_ratings.movieSearch(req.body);
                res.json(result);
            } catch (err) {
                console.log("Input: " + JSON.stringify(req.body));
                console.trace(err);
                res.json({
                    error: err
                });
            }
        });

        app.post('/ratings/', async function(req, res) {
            try {
                const result = await movie_ratings.movieRatings(req.body);
                res.json(result);
            } catch (err) {
                console.log("Input: " + JSON.stringify(req.body));
                console.trace(err);
                res.json({
                    error: err
                });
            }
        });

        app.get('/ratings/:id', async function(req, res) {
            let id = req.params.id;
            try {
                const result = await movie_ratings.userRatings(parseInt(id, 10));
                res.json(result);
            } catch (err) {
                console.trace(err);
                res.json({
                    error: err
                });
            }
        });

        app.get('/movie/:id', async function(req, res) {
            let id = req.params.id;
            try {
                const result = await movie_ratings.movieProperties(parseInt(id, 10));
                res.json(result);
            } catch (err) {
                console.trace(err);
                res.json({
                    error: err
                });
            }
        });
    }
};
