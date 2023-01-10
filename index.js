var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var MongoClient = require('mongodb').MongoClient;
var _ = require('underscore');
var request = require('request');

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body);
    } else{
    	console.log(error);
    }
}

var sendEmail = function(subject, text){

	return ;

	request.post({
		url: 'https://api.mailgun.net/v3/sandboxbcddf96a774b4c248c653ff20c13b79c.mailgun.org/messages' ,
		headers: {               
		    'Authorization': 'Basic ' + new Buffer("api:key-904471946a1079fc2b7d01177ad8225d").toString('base64'),
		    'Content-Type' : 'multipart/form-data'
		},
		form: {
			'from' : 'Mailgun <mailgun@sandboxbcddf96a774b4c248c653ff20c13b79c.mailgun.org>',
			'to' : 'caiohcoutinho@gmail.com',
			'subject' : subject,
			'text' : text
		}
	}, callback);

}

var url = "mongodb+srv://challengecalculator:Kq9vMqC3BbwKCvJB@challengecalculator.d0chh2x.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(url);
let db = client.db("challengecalculator");

_.mixin({
	isBlank: function(str){
	  	return !!(str||'').match(/^\s*$/);
	},
	isNullOrUndefined: function(obj){
		return _.isNull(obj) || _.isUndefined(obj);
	}
})

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser());

var urlencodedParser = bodyParser.urlencoded({ extended: false });

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.post('/signup', urlencodedParser, function(request, response) {
  	var body = request.body;
  	var username = body.username;
  	var password = body.password;
	if(_(username).isBlank() || _(password).isBlank()){
		res.status(500).send({ error: 'username and password cannot be blank!' });
	} else{
		var usersCollection = db.collection('users');
		usersCollection.find({username: username}).toArray(function(err, list){
			if(_.isEmpty(list)){
				usersCollection.insertOne({
					username: username,
					password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
				}, function(err, res){
					response.send("ok");
					//db.close();
				});
			} else{
				response.status(500).send({ error: 'username already used' });
			}
			//db.close();
			if(username != 'caio'){
				try{
					var now = new Date();
					var hora = now.getHours()+":"+now.getMinutes()+" do dia "+now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear();
					sendEmail("Novo usuário em challengecalculator: "+username, username+" se cadastrou no challengecalculator as "+hora+".");
				} catch(error){
					console.log(error);
				}
			}
		});
	}
});

app.post('/login', urlencodedParser, function(request, response) {
  	var body = request.body;
  	var username = body.username;
  	var password = body.password;
	if(_(username).isBlank() || _(password).isBlank()){
		response.status(500).send({ error: 'Usuário e senha são obrigatórios.' });
	} else{
		var usersCollection = db.collection('users');
		usersCollection.find({username: username}).toArray(function(err, list){
			if(_.isEmpty(list) || !bcrypt.compareSync(password, list[0].password)){
				response.status(500).send({ error: "O usuário e a senha não correspondem." });
			} else{
				response.send("ok");
			}
			//db.close();
			if(username != 'caio'){
				try{
					var now = new Date();
					var hora = now.getHours()+":"+now.getMinutes()+" do dia "+now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear();
					sendEmail("Novo acesso em challengecalculator: "+username, username+" acessou o challengecalculator as "+hora+".");
				} catch(error){
					console.log(error);
				}
			}
		});
	}
});

app.get('/characters', urlencodedParser, function(request, response) {
  	var body = request.query;
  	var username = body.username;
	if(_.isUndefined(username) || _(username).isBlank()){
		response.status(500).send({ error: 'username cannot be blank!' });
	} else{
		var charactersCollection = db.collection('characters');
		charactersCollection.find({username: username}).toArray(function(err, list){
			var result = list[0];
			response.send(result.body);
			//db.close();
		});
	}
});

let characterPostHandler = async function(request, response) {
  	var body = request.body;
  	var username = body.username;
	var usersCollection = db.collection('characters');
	    
  const filter = { username: username };
  
  const options = { upsert: true };
  
  const updateDoc = { $set: { body: body } };

	var writeResult = await usersCollection.updateOne(filter, updateDoc, options);
	
	response.send(writeResult);
	if(username != 'caio'){
		try{
			var now = new Date();
			var hora = now.getHours()+":"+now.getMinutes()+" do dia "+now.getDate()+"/"+(now.getMonth()+1)+"/"+now.getFullYear();
			sendEmail("Persistência de coleção de personagens em challengecalculator: "+username, username+" salvou sua coleção em challengecalculator as "+hora+".");
		} catch(error){
			console.log(error);
		}
	}
};

app.post('/characters', urlencodedParser, characterPostHandler);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
		await client.close();
    if (options.cleanup){
			console.log('clean');
    } 
    if (exitCode || exitCode === 0){
			console.log(exitCode);
    } 
    if (options.exit) {
    	process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup:true}));

process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));