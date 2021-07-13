const app = require('express')();
const MongoClient = require("mongodb").MongoClient;
const bodyParser = require('body-parser');

const url = "mongodb://mongo/";


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


const genStatusObj = (status, code, message, data) => ({
	status: status || false,
	statusCode: code===0?0:(code||500),
	message: message || 'Unknown Server Error!',
	data: data || null
})



let getData = (db, filter) => new Promise(async resolve => resolve(await db.find(filter).toArray()));
let setData = (db, data) => new Promise(async resolve => resolve(await db.updateOne(
			{"userProfile.netid": data.userProfile.netid}, 
			{$set: data},
			{upsert: true}
		))

);

let delAllData = db => new Promise(async resolve => resolve(await db.drop()));

let DB = (method, params) => new Promise(async (resolve, reject) => {

    let conn = null;
    try {
        conn = await MongoClient.connect(url);
        const db = conn.db("paicoop").collection("data");

        resolve(await method(db, params));
    } catch (err) {
        console.error("错误：" + err.message);
        reject(err);
    } finally {
        if (conn != null) conn.close();
    }
});


let _generateList = FormArr => {
			let o = [];
			FormArr.forEach(user => o.push(...user.meta.applications.map(item => ({
				netid: user.userProfile.netid,
				nickname: user.userPreference.anonymous ? 'Anonymous' : (user.userProfile.nickname || user.userProfile.netid.replace(/\b(\w)(\w*)/g, ($0,$1,$2)=>$1.toUpperCase()+$2.toLowerCase())),
				item: item,
				meta: user.meta
			}))));
			return o;
}



const port = 80;


app.listen(port, () => {
  console.log(`PaiCoop is running at port ${port}`)
});




app.get('/', (req, res) => {
  res.send('Hello PaiCoop!')
})



app.get('/api/getList', async (req, res) => {

	try{
		let arr = await DB(getData);
		let list = _generateList(arr);
		res.send(genStatusObj(true, 0, 'Successful!', list));
	}catch(e){
		res.send(genStatusObj(false, 501, e));
	}
	
})




app.get('/api/getForm', async (req, res) => {
	if(!req.query.hasOwnProperty('netid')){
		return res.send(genStatusObj(false, 502, 'Illegal netid!!'));
	}

	try{
		let arr = await DB(getData, {"userProfile.netid": req.query.netid});
		res.send(genStatusObj(true, 0, 'Successful!', ...arr));
	}catch(e){
		res.send(genStatusObj(false, 501, e));
	}
})



app.post('/api/setForm', async (req, res) => {
	if(!req.body.hasOwnProperty('form')){
		return res.send(genStatusObj(false, 503, 'Illegal form!!'));
	}
	try{
	    req.body.form = JSON.parse(req.body.form);
	}catch(e){
       	    return res.send(genStatusObj(false, 504, 'JSON parse error!'));
	}
	try{
		res.send(genStatusObj(true, 0, 'Successful!', await DB(setData, req.body.form)));
	}catch(e){
		res.send(genStatusObj(false, 501, e));
	}
})



app.get('/api/reset', async (req, res) => {
	try{
		 res.send(genStatusObj(true, 0, 'Successful!', await DB(delAllData)));
	}catch(e){
		res.send(genStatusObj(false, 501, e));
	}
})
