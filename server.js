'use strict';
// Load Environment Variables from the .env file
require('dotenv').config();

// Load the express module into our script
const express = require('express');
const superagent = require('superagent')
const cors = require('cors');
const locations = {};


// App Setup:
const app = express(); //creating the server application
const PORT = process.env.PORT || 3000;
app.use(cors()); //will respond to any request and allow access to our api from another domain

/*
 req=> All information about the request the server received
 res=> methods which can be called to create and send a response to the client
 */
 
// API Routes:
app.get('/', (req, res) => {
    res.status(200).send('<h1 style="color:green; font-size:20px">HOME PAGE');
    console.log(req.query);
});




//Location route:
app.get('/location', handleLocation);

//Weather route:
app.get('/weather', handleWeather);

//park
app.get('/parks', handleParks);

// Error
app.use('*', notFoundHandler);





// Location callback
function handleLocation(req, res) {

    let city = req.query.city;
    const key = process.env.GEOCODE_API_KEY;
    const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;

    if (locations[url]) {
        // send the data we currently have
        res.send(locations[url]);
    } else {
        superagent.get(url)
            .then(data => {
                // console.log(data);
                const geoData = data.body[0];
                const locationInfo = new Location(city, geoData);
                locations[url] = locationInfo;
                console.log(locations[url]);
                res.send(locationInfo);
            })
            .catch((err) => errorHandler(err, req, res));
    }
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
        const aboutPark =allParks.body.data.map(littleAboutPark => {
            // console.log(littleAboutPark.description)
            return new Park (littleAboutPark.fullName, littleAboutPark.addresses[0].line1 + littleAboutPark.addresses[0].city,littleAboutPark.entranceFees[0].cost,littleAboutPark.description, littleAboutPark.url);
        })
        res.status(200).send(aboutPark)
    })
    .catch(err => errorHandler(err,req,res))


}

//weather constructor:
function Weather(weather) {
    this.forecast = weather.weather.description;
    this.time = new Date(weather.valid_date).toDateString();
}


function Park(name,address,fee,description,url) {
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

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});