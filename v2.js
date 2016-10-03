var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var hbs = require('hbs');
var HttpProxyAgent = require('http-proxy-agent');
var url = require('url');
var bodyparser = require('body-parser');
var MongoCrud = require('mongo-crud-layer');
var mongocrud = new MongoCrud('mongodb://localhost:27017/airsense');


var high = 0;
var low = 30;
var attention = 0;
var wdata, family_data;

//sql connection
var mysql = require('mysql');
var db = mysql.createPool({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'airsense'
});
var crud = require('mysql-crud');
var user_crud = crud(db,'users');
var alerts_crud = crud(db,'alerts');
var isfetch = 0;

//views handler
app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
	extended:true
}));

//routing
app.use(express.static(__dirname))
app.get('/', function(req, res) {

	var getFam = function(fn){
		user_crud.load({}, function(err,res){
			if(err){		
				console.log('error :'+err);
			} else {
				return fn && fn(null,res);
			}			
		})
	}

	// getFam(function(err,data){
		// family_data = data;
		isfetch = 1;
		res.render('index',{
			temperature:wdata.list[0].main.temp,
			humid:wdata.list[0].main.humidity,
			weather:wdata.list[0].weather[0].main,
			weather_desc:wdata.list[0].weather[0].description,
		});
	// })
});

app.get('/family', function(req, res){
	var datas;
	user_crud.load({}, function(err,vals){
		if(err){		
			console.log('error :'+err);
		}
		if(req.query.status){
			var msg = req.query.msg;
			res.render('family',{data:vals, status:1, msg:msg});
		}
		res.render('family',{data:vals});
	},{
		'offset':10
	})
	// console.log(req.query);
})

app.post('/addfamily', function(req,res){
	var name = req.body.name;
	var dob = req.body.dob.split('-');
	var newDate = dob[0]+'.'+dob[1]+'.'+dob[2];
	dob = new Date(newDate).getTime()/1000;
	user_crud.create({'name':name, 'dob':dob},function(err, vals){
		if(err){
			console.log('error :'+err);
		} else {
			res.redirect('family?status=1&msg=User added');
		}
	})
})

app.get('/deletefamily/:id', function(req,res){
	var id=req.params.id;
	user_crud.destroy({'id':id}, function(err,vals){
		if(err){
			console.log('error :'+err);
		} else {
			res.redirect('/family?status=1&msg=User deleted');
		}		
	})
})

app.get('/lasttemp', function(req,res){
	mongocrud.readAll( 'airsensedb', function(err,doc){
		if(!err){
			res.send(JSON.stringify(doc[doc.length-1]));
			// console.log(doc);
		} else {
			res.send(err)
		}
	})
})

var SerialPort = require("serialport").SerialPort;
var serialport = new SerialPort("/dev/ttyACM0",{
	baudrate:9600,
	dataBits:8,
	parity: 'none',
	stopBits: 1,
	flowControl: false
});
var cl;
var flagclient = 0;

var counter = 0;
var read = "";
var measure = Array();
serialport.on('open', function(){
	serialport.on('data', function(data){
		read += data.toString();
		if(read.indexOf("S") >= 0 && read.indexOf("E") >= 0){
			read = read.substr(1,read.length-2);
			var measure = read.split(";");
			var date = (new Date()).getTime();
			if(flagclient == 1){
				cl.emit('data',{x:date, y:measure[2], humid:measure[1], bad:0});				
			}
			console.log(measure);
			read = ""
		}
	});
});

//realtime data
var counter = 0;
var age = Array();
io.on('connection', function(client) {  
	console.log('Client connected...');
	var temp = Math.random()*50;
	var humid = Math.random()*100;
	var dust = 0;
	cl = client;
	flagclient = 1;
});



//weather data
var proxy = process.env.http_proxy || 'http://proxy2.eepis-its.edu:443';
dest = "http://api.openweathermap.org/data/2.5/find?q=Surabaya&units=metric";
var opts = url.parse(dest);
var agent = new HttpProxyAgent(proxy);
opts.agent = agent;
var request = http.get(opts, function (response) {
	var buffer = ""; 
	response.on("data", function (chunk) {
		buffer += chunk;
	}); 
	response.on("end", function (err) {
		wdata = JSON.parse(buffer);
	}); 
}); 

var datecur = 0;
function filterCondition(date, temp, humid, dust){
	var getFam = function(fn){
		user_crud.load({}, function(err,res){
			if(err){		
				console.log('error :'+err);
			} else {
				return fn && fn(null,res);
			}			
		})
	}

	
	if((date-datecur)>60*5){
		//humid 
		if(humid<50){
			datecur = date;
			if(humid>35){
				saveMsg('Your room temperature is slightly below 50%.');
			} else {
				saveMsg('Your room temperature is extremely below 50%.');
			}
		} else if(humid>70){
			datecur = date;
			if(humid<80){
				saveMsg('Your room temperature is slightly more than 70%.')
			} else {
				saveMsg('Your room temperature is extremely more than 70%.')
			}
		}

		//temp
		// if(temp){

		// } else if(){

		// }

		// //dust for air quality
		// if(){

		// } else if(){
			
		// }
	}
}

function saveMsg(msg){
	alerts_crud.create({
		'messages': msg,
		'isread' : 0,
		'ntype' : 5
	}, function(err,id){
		if(err){
			console.log(err);
		}
	});	
}

server.listen(3000);
console.log('listen to 3000');
