var express = require('express');
var app = express();
var http = require('http').Server(app)

const dotenv = require('dotenv');
dotenv.config();

var port = process.env.PORT || 8080;

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded())

app.use(bodyParser.json())

app.use('/public', express.static(__dirname + '/public'));

app.all('/*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Accept");

	next();
});

const multer = require('multer');

const storage = multer.diskStorage(
	{
		destination: './sound_files/',
		filename: function (req, file, cb) {
			cb(null, file.originalname);
		}
	}
);

const upload = multer({ storage: storage });
app.use(express.static('./'));

//
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
	organization: process.env.CHATGPTORGANIZATIONID,
	apiKey: process.env.CHATGPTAPIKEY
});
const openai = new OpenAIApi(configuration);
const axios = require('axios');

const fs = require('fs')

app.post("/notes", upload.single("audio_data"), function (req, res) {
	const FormData = require('form-data');
	const form = new FormData();
	form.append('file', fs.readFileSync(req.file.destination + req.file.filename), req.file.destination + req.file.filename);
	form.append('model', 'whisper-1');
	axios.post(
		'https://api.openai.com/v1/audio/transcriptions',
		form,
		{
			headers: {
				...form.getHeaders(),
				'Authorization': 'Bearer ' + configuration.apiKey,
				'Content-Type': 'multipart/form-data'
			}
		}
	).then(function ({ data }) {
		console.log("Transcription----->", data["text"])
		let transcriptedtextforchat = data["text"];
		axios.post(
			'https://api.openai.com/v1/chat/completions',
			{
				"model": "gpt-3.5-turbo",
				"messages": [{ "role": "user", "content": transcriptedtextforchat }]
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + configuration.apiKey,
				}
			},
		).then(function ({ data }) {
			res.send({ "text": data, "transcript": transcriptedtextforchat })
		}).catch(function (error) {
			console.log('Error ' + error)
		});
	})
		.catch(function (error) {
			console.log('Error ' + error)
		});
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

http.listen(port, function () {

	console.log('listening on *:' + port);
});
