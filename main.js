var express = require('express');
var cookieParser = require('cookie-parser');
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
var login_crud = crud(db,'users');
var messeges_crud = crud(db,'messeges');
var recommendations_crud = crud(db,'recommendations');
var alerts_crud = crud(db,'alerts');
var isfetch = 0;

var curtemp, curhumid, curdust;

//views handler
app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
	extended:true
}));
app.use(cookieParser());

//routing
app.use(express.static(__dirname))
app.get('/', function(req,res){
	res.render('index');
})
app.get('/dashboard', function(req, res) {

	var countCurrent = function(fn){
		alerts_crud.load({'isread':0}, function(err,res){
			if(err){
				console.log('error :'+err);
			} else {
				return fn && fn(null,res);
			}
		})
	}

	countCurrent(function(err,data){
		var itung = data.length;
		isfetch = 1;
		res.render('dashboard',{
			temperature:wdata.list[0].main.temp,
			humid:wdata.list[0].main.humidity,
			weather:wdata.list[0].weather[0].main,
			weather_desc:wdata.list[0].weather[0].description,
			notif_count:itung
		});
	})
});

app.post('/login', function(req,res){
	login_crud.load({'username' : req.body.user, 'password':req.body.pass}, function(err, data){
		// console.log(data.length);
		if(data.length == 1){
			res.cookie('user', req.body.user);
			res.redirect('/dashboard');
		} else {
			res.redirect('/');
		}
	})
})

app.get('/messege', function(req, res){

	var getmessege = function(fn){
		messeges_crud.load({}, function(err, data){
			if(err){
				console.log(err);
			} else {
				return fn && fn(null,data);
			}
		}, {'order':'DESC'})
	};

	getmessege(function(err,data){
		res.render('messeges',{data:data, humid : curhumid, dust: curdust, temp: curtemp})
	})
})

app.get('/family', function(req, res){
	var datas;
	user_crud.load({}, function(err,vals){
		vals.splice(0,1);
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
})

app.post('/addfamily', function(req,res){
	var name = req.body.name;
	var username = req.body.username;
	var password = req.body.password;
	var dob = req.body.dob.split('-');
	var newDate = dob[0]+'.'+dob[1]+'.'+dob[2];
	dob = new Date(newDate).getTime()/1000;
	user_crud.create({'name':name, 'username':username, 'password':password, 'dob':dob},function(err, vals){
		if(err){
			console.log('error :'+err);
		} else {
			res.redirect('family?status=1&msg=User added');
		}
	})
})

app.post('/savemessege', function(req, res){
	var temp = req.body.temp;
	var dust = req.body.dust;
	var humid = req.body.humid;
	var messege = req.body.messeges;
	var date = (new Date()).getDate()+'-'+((new Date()).getMonth()+1)+'-'+(new Date()).getFullYear()+' '+(new Date()).getHours()+':'+(new Date()).getMinutes()+':'+(new Date()).getSeconds()
	var user = req.cookies.user;
	if(user === 'dad'){
		messege = messege+'<br><br><div class="facts"><p>Current temperature : '+temp+'</p><p>Current humidity : '+humid+'</p></div>';
	}
	messeges_crud.create({'messeges': messege, 'sender': user, 'date':date}, function(err, data){
		if(!err){
			res.redirect('messege');
		} else {
			console.log(err)
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

app.get('/rest/:table', function(req, res){
	var table = req.params.table;
	var data = crud(db,table);
	var add;
	if(table == "alerts"){
		data.load({"isread" : "0"}, function(err,data){
			if(err){
				console.log(err);
			} else {
				res.send({"number" : data.length.toString()});
			}
		})
	} else {
		data.load({}, function(err,data){
			if(err){
				console.log(err);
			} else {
				res.send(data);
			}
		})
	}
})

app.get('/getrecom/:id', function(req, res){
	var id = req.params.id;
	var out = "<ul>";
	recommendations_crud.load({type : id}, function(err, data){
		data.forEach(function(each){
			out += "<li>"+each.recom+"</li>";
		});
		out += "</ul>";
		res.send(out);
	})
})

app.get('/help', function(req, res){
	res.render('help');
})

app.get('/getnotif', function(req, res){
	alerts_crud.load({}, function(err, data){
		res.send(data);
	})
})

app.get('/markall', function(req, res){
	alerts_crud.update({'isread':0},{'isread':1}, function(err,data){
		if(err){
			console.log(err);
		} else {
			res.send('success')
		}
	})
})

app.get('/notifications', function(req,res){

	var getNotif = function(fn){
		alerts_crud.load({'isread':0}, function(err,data){
			if(!err){
				return fn && fn(null,data)
			} else {
				console.log(err)
			}
		})
	}

	getNotif(function(err,data){
		console.log(data);
		res.render('notifications',{array:data});
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
		// console.log(read);
		if(read.indexOf("S") >= 0 && read.indexOf("E") >= 0){
			read = read.substr(1,read.length-2);
			var measure = read.split(";");
			var date = (new Date()).getTime();
			curtemp = measure[2];
			curhumid = measure[1];
			curdust = measure[0];
			if(flagclient == 1){
				cl.emit('data',{x:date, y:measure[2], humid:measure[1], dust:measure[0]});
				//save to db
				mongocrud.create({_date: date, _temp : measure[2], _humid:measure[1], _dust:Math.abs(measure[0])}, 'airsensedb', function(err,id){
					if(!err){
						// console.log("date "+date);
						filterCondition(date, measure[2], measure[1], measure[0]);
						// console.log(id)
					} else {
						console.log(err)
					}
				})

			}
			// console.log(measure);
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
// opts.agent = agent;
var request = http.get(opts, function (response) {
	var buffer = "";
	response.on("data", function (chunk) {
		buffer += chunk;
	});
	response.on("end", function (err) {
		wdata = JSON.parse(buffer);

	});
});

function notifyall(msg){
	var proxy = process.env.http_proxy || 'http://proxy2.eepis-its.edu:443';
	dest = "http://famasya.com/push/push.php?msg="+msg;
	var opts = url.parse(dest);
	var agent = new HttpProxyAgent(proxy);
	// opts.agent = agent;
	var request = http.get(opts, function (response) {
		var buffer = "";
		response.on("data", function (chunk) {
			buffer += chunk;
		});
		response.on("end", function (err) {
			console.log(buffer);
		});
	});
}

var datehumidcur = 0;
var datetempcur = 0;
var datedustcur = 0;
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

	var infant = 0;
	getFam(function(err, res){
		res.forEach(function(id){
			var age = Math.floor(((new Date()).getTime() - id['dob']*1000) / (1000*60 * 60 * 24 * 365))
			if(age<5){
				infant++;
			}
		})
		date = Math.round(date/1000)+7*3600
		if((date-datehumidcur)>60*60){
			if(humid<50){
				datehumidcur = date;
				if(humid<35){
					if(infant > 0){
						saveMsg('Your humidity is slightly below 50%.','This condition is not suitable for your kid. An infant under 5 years old is not sensitive due to temperature changes. Decrease the humidity',5);
						notifyall('Your humidity is slightly below 50%.');
						cl.emit('notif',{counter:1});
					}
				}
				//  else {
				// 	saveMsg('Your humidity is extremely below 50%.','This condition will lead to dry of skin, etc...',6);
				// 	notifyall('Your humidity is extremely below 50%.');
				// }
				cl.emit('notif',{counter:1});
			} else if(humid>60){
				datehumidcur = date;
				if(humid<80){
					saveMsg('Your humidity is slightly more than 60%.','This condition will grow molds, etc...',7)
					notifyall('Your humidity is slightly more than 60%.');
				} else {
					saveMsg('Your humidity is extremely more than 70%.','This condition will grow molds, etc...',8)
					notifyall('Your humidity is extremely more than 70%.');
				}
				cl.emit('notif',{counter:1});
			}
		}
		if((date-datetempcur)>60*60){
			console.log(curtemp);
			if(temp>35){
				datetempcur = date;
				if(temp<30){
					saveMsg('Your room temperature is high','Lower your temperature or this will lead dehidration',1);
					notifyall('Your room temperature is high');
					cl.emit('notif',{counter:1});
				} else {
					saveMsg('Your room temperature is high','You will be dehidrated soon.',2);
					notifyall('Your room temperature is high');
					cl.emit('notif',{counter:1});
				}
			} else if(temp<24){
				datetempcur = date;
				if(infant>0){
					saveMsg('Your room temperature relatively low for a baby','You have a baby. Make him warm',3);
					notifyall('Your room temperature relatively low for a baby');
					cl.emit('notif',{counter:1});
				}
				if(temp>17 && infant > 0){
					saveMsg('Your room temperature relatively low for a baby','Be aware of flu, cough, etc.',3);
					notifyall('Your room temperature is high');
					cl.emit('notif',{counter:1});
				} else {
					saveMsg('Your room temperature is low','Warm up your room or you will get hypotemia.',4);
					notifyall('Your room temperature is low');
					cl.emit('notif',{counter:1});
				}
			}
		}
		if((date-datedustcur)>60*60){
			console.log(dust);
			if(dust>0.3){
				datedustcur = date;
				saveMsg('Your room is dirty','Be aware of ISPA.',9);
				notifyall('Your room is dirty');
				cl.emit('notif',{counter:1});
			}
		}
	})

}

function saveMsg(title, msg, ntype){
	mongocrud.readAll('airsensedb', function(err,doc){
		if(!err){
			alerts_crud.create({
				'title': title,
				'messages': msg,
				'isread' : 0,
				'actual_data': JSON.stringify(doc[doc.length-1]),
				'ntype' : ntype
			}, function(err,id){
				if(err){
					console.log(err);
				}
			});
		} else {
			console.log(err);
		}
	})
}

server.listen(3000);
console.log('listen to 3000');
