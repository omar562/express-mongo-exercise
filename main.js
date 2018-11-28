// use express in main.js
const express = require('express');
const bodyParser = require('body-parser')
const app = express();

// set the templating engine to embeded javascript
app.set('view engine', 'ejs')

/**
 * Enables the express router to use
 * POST requests
 * Each of these functions parses the body
 * (either when sent as json or as an URL-encoded string)
 * and sets the results on the `body` property of the
 * `request` object
 */
app.use(bodyParser.urlencoded({
    extended: true
}))

//variable to allow us to use the database when we handle requests from the browser
var db

//connecting to mongodb
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId

// connect function takes the link of our database
// user1 user1 are the username and password to my database user
MongoClient.connect('mongodb://user1:user1@ds151544.mlab.com:51544/mydatabase', (err, database) => {
    //handling errors such that the next page displays the error
    if (err) {
        return next(err)
    }
    db = database
    // we should only listen to requests when the database is connected
    app.listen(3000, () => {
        console.log('listening on 3000')
    })
})

// adding a post to database
app.post('/add', (req, res) => {

    //checking if title and text received are not empty
    if (req.body.title.length != 0 && req.body.text.length != 0) {
        //saving the body in database
        //a collenction is a named location to store stuff
        //here i named my collection quotes
        //save method allows us to enter data to database
        //here req.body is the data we want to add to the quotes collection
        db.collection('quotes').save({
            title: req.body.title,
            date: req.body.date,
            text: req.body.text,
            comment: [{
                date: req.body.date,
                commenttext: req.body.comment
            }]
        }, (err, result) => {
            if (err) {
                return next(err)
            }

            console.log('saved to database')
            //redirecting the user to root to avoid infinite loading
            res.redirect('/')
        })
    } else {
        //if title or text are empty, nothing happens
        res.redirect('/')
    }
})

/**
 * Another way to differenciate between POST
 * and GET; instead of using `app.get` and `app.post`,
 * I use `app.all` and differenciate within the same
 * request handler using `request.method`
 */
// reading post
app.all('/read/:id', (req, res, next) => {
    // getting the id of the post chosen
    const {
        id
    } = req.params

    //ObjectID takes an id and returns it's instance
    const _id = ObjectId(decodeURI(id))

    // removing the element that has this id from database
    db.collection('quotes')
        .findOne({
            _id
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            // redirecting the user to main page
            res.render('read.ejs', {
                quotes: result
            })
        })
})

//commenting on post
app.all('/comment/:id', (req, res, next) => {
    // getting the id and returns it's instance
    const {
        id
    } = req.params
    //checking if input field is not empty
    if (req.body.commenttext.length != 0) {
        //ObjectID takes an id and returns it's instance
        const _id = ObjectId(decodeURI(id))

        //finding the id of the post I'm adding a comment to
        db.collection('quotes').findOneAndUpdate({
            _id
        }, 
            //push method adds to the values entered to the values that are already in the database
            // here we add a new comment to the array of comments in the database and set it's date and text
            {
            $push: {
                comment: {
                    date: req.body.date,
                    commenttext: req.body.commenttext
                }
            }
        }, (err, result) => {
            if (err) {
                return next(err)
            }
            console.log('saved to database')
            //redirecting the user to read to avoid infinite loading
            res.redirect('/read/' + id)
        })
    } else {
        res.redirect('/read/' + id)
    }
})

// deleting posts
app.all('/delete/:id', (req, res, next) => {
    // getting the id of the post chosen
    const {
        id
    } = req.params

    //ObjectID takes an id and returns it's instance
    const _id = ObjectId(decodeURI(id))

    // removing the element that has this id from database
    db.collection('quotes')
        .remove({
            _id
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            // redirecting the user to main page
            res.redirect('/')
        })
})


//editing post
app.all('/edit/:id', (req, res, next) => {
    // getting the id of the post chosen
    const {
        id
    } = req.params

    // decoding the id
    const _id = ObjectId(decodeURI(id))

    // finding the post that has this id
    db.collection('quotes')
        .findOne({
            _id
        }, function (err, result) {
            if (err) {
                return next(err);
            }
            // displaying a page where update is made
            // this page contains 2 inputs fields (one for title, one for text) 
            res.render('update.ejs', {
                quotes: result
            })
        })
})

//the action of the form used in `update`.ejs is here
app.post('/update/:id', (req, res, next) => {
    //check if the input fields are not empty
    if (req.body.title.length != 0 && req.body.text.length != 0) {
        const {
            id
        } = req.params
        const _id = ObjectId(decodeURI(id))
        db.collection('quotes')
            //findOneAndUpdate function allows us to select which element we want to update (here I used the id to select it)
            // and then set which values we want to update in that element 
            .findOneAndUpdate({
                    _id: _id
                }, 
                //set method replaces the values that are there by the values entered
                // the first line here replaces the value of title by req.body.title in the database
                    {
                    $set: {
                        title: req.body.title,
                        text: req.body.text,
                        date: req.body.date
                    }
                },
                function (err, result) {
                    if (err) {
                        return next(err)
                    }
                    res.redirect('/')
                })
    }
    //if inputs are empty nothing happens
    else {
        res.redirect('/')
    }
})

// we are giving the user the option to sort the elements based on date title or id(default) 
function getSortingFromString(str) {
    if (str == 'title') {
        return {
            title: 1
        }
    } else if (str == 'date') {
        return {
            date: 1
        }
    }
    return {
        _id: 1
    }
}

/**
 * Handles the main page
 * with optional parameter
 */
// we divided the pages such that each page contains 3 posts
app.get('/:sorting?/:page?', (req, res) => {
    //creating an integer that will store the number of the page we are in
    let page = parseInt(req.params.page) || 0
    if (isNaN(page)) {
        page = 0
    }
    // this constant gets the sorting method chosen by the user (if any)
    const sorting = req.params.sorting || 'default'

    //specifying the max number of results
    const limit = 3
    //skipping the posts that were already displayed in previous pages
    // for example in the second page i want to skip the posts displayed in the first one
    const skip = limit * page

    // getting the next and previous pages based on the page we are in now
    // notice that we dont need a previous button in the first page neither a next button in the last one
    const next = `/${sorting}/${page + 1}`
    const previous = page > 0 ? `/${sorting}/${page - 1}` : null

    // storing the sorting method in mysort
    var mysort = getSortingFromString(sorting)

    db.collection('quotes')
        // finding all the elements in quotes collection
        .find()
        // sorting them based on the sorting method selected
        .sort(mysort)
        // skipping the elements already displayed
        .skip(skip)
        // the +1 here is used to get 4 elements from the database, 1 of them will be hidden.
        // the reason behind this is that if we have 3 elements on the last page the next button will still be displayed
        .limit(limit + 1)
        //getting the result as an array
        .toArray((err, result) => {
            if (err) {
                return next(err)
            }
            //getting the length of the array returned
            const {
                length
            } = result
            // as long as the page is not the last I need a next button which increments the value of page
            const next = length >= limit + 1 ? `/${sorting}/${page + 1}` : null
            // as long as the page is not the first I need a previous button which decrements the value of page
            const previous = page > 0 ? `/${sorting}/${page - 1}` : null
            // rendering the ejs page where the content is displayed and sending it my results 
            res.render('index.ejs', {
                quotes: result.slice(0, limit),
                page,
                next,
                previous
            })
        })
})
