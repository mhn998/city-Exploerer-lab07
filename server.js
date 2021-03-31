'use strict';
// Load Environment Variables from the .env file
require('dotenv').config();

// Load the express modules into our script
const express = require('express');
const pg = require('pg');
const superagent = require('superagent')
const cors = require('cors');

// App Setup:
const app = express(); //creating the server application
const PORT = process.env.PORT || 3000; // creating port
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV;

// Setup our connection options based on environment
const options = NODE_ENV === 'production' ? { connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } } : { connectionString: DATABASE_URL };

const client = new pg.Client(options); // initiate pg DATABASE with specified url;


app.use(cors()); //will respond to any request and allow access to our api from another domain

/*
 req=> All information about the request the server received
 res=> methods which can be called to create and send a response to the client
 */

// API Routes:

// Main route
app.get('/', (req, res) => {
    res.status(200).send('<h1 style="color:green; font-size:20px">HOME PAGE');
    console.log(req.query);
});

//Location route:
app.get('/location', handleLocation);

//Weather route:
app.get('/weather', handleWeather);

//park route
app.get('/parks', handleParks);

// Error 
app.use('*', notFoundHandler);





// Location callback
const locations = {};

function handleLocation(req, res) {
    //select data from DB (if existed)
    let city = req.query.city;
    const SQL = 'SELECT * FROM location WHERE search_query = $1';
    const values = [city];
    const key = process.env.GEOCODE_API_KEY;
    const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;

    client.query(SQL, values).then((results) => {
            if (results.rows.length > 0) {
                console.log(results.rows)
                res.status(200).json(results.rows[0]);
            } else {
                superagent.get(url)
                    .then(data => {
                        // console.log(data);
                        const geoData = data.body[0];
                        const locationInfo = new Location(city, geoData);
                        const SQL = 'INSERT INTO location(search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *';
                        // locations[url] = locationInfo;
                        // console.log(locations[url]);
                        const savedValues = [locationInfo.search_query, locationInfo.formatted_query, locationInfo.latitude, locationInfo.longitude];
                        client.query(SQL, savedValues).then((results) => {
                            console.log(results);
                            res.status(200).json(results.rows[0]);
                        });
                    })

            }
        })
        .catch((err) => errorHandler(err, req, res));
}



//location constructor:
function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData.display_name;
    this.latitude = geoData.lat;
    this.longitude = geoData.lon;
}


// weather calllback
function handleWeather(req, res) {
    let city = req.query.search_query
    const key = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${key}`


    superagent.get(url)
        .then(weatherData => {
            // console.log(weatherData);
            const EachDayArr = weatherData.body.data.map(day => {
                return new Weather(day);
            });
            res.status(200).json(EachDayArr);
        })
        .catch((err) => errorHandler(err, req, res));

}


function handleParks(req, res) {
    let city = req.query.search_query;
    const key = process.env.PARKS_API_KEY;
    const url = `https://developer.nps.gov/api/v1/parks?q=${city}&api_key=${key}`;

    superagent.get(url)
        .then(allParks => {
            const aboutPark = allParks.body.data.map(littleAboutPark => {
                // console.log(littleAboutPark.description)
                return new Park(littleAboutPark.fullName, littleAboutPark.addresses[0].line1 + littleAboutPark.addresses[0].city, littleAboutPark.entranceFees[0].cost, littleAboutPark.description, littleAboutPark.url);
            })
            res.status(200).send(aboutPark)
        })
        .catch(err => errorHandler(err, req, res))


}

//weather constructor:
function Weather(weather) {
    this.forecast = weather.weather.description;
    this.time = new Date(weather.valid_date).toDateString();
}


function Park(name, address, fee, description, url) {
    this.name = name;
    this.address = address;
    this.fee = fee;
    this.description = description;
    this.url = url;
}


function errorHandler(error, req, res) {
    res.status(500).send(error);
}

function notFoundHandler(req, res) {
    res.status(404).send('HUH ?NOT FOUND!');
}

client.connect().then(() => {
    console.log(" postgress DB connected & is ready to serve you");
    app.listen(PORT, () => console.log(`App is running on ${PORT}`));
});