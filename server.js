// express
const express = require('express')
const app = express()
//서버띄우는 코드 여기로 옮기기

// body-parser
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))

// .env (환경변수 관리)
require('dotenv').config();

// mongo db
const MongoClient = require('mongodb').MongoClient
var db // 변수 하나 필요함
MongoClient.connect(
  process.env.DB_URL,
  function (error, client) {
    if (error) return console.log(error)
    //서버띄우는 코드 여기로 옮기기
    db = client.db('todoapp')
    app.listen(process.env.PORT, function () {
      console.log('listening on 8080')
    })
  }
)

// ejs
app.set('view engine', 'ejs')

app.engine('ejs', require('ejs').__express)

// public
app.use('/public', express.static('public'))

//method override (POST 요청으로 PUT 요청 하기 위해서.)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

/////////////////////// Session-based Authentication 으로 회원 인증하기.
///////////////// passport - nodejs에서 회원인증을 쉽게 구현하게 해주는 라이브러리 , passport-local ,  express-session()
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

/////////////////////middleware - 요청과 응답 사이에 뭔가 실행시키는 코드
//////////////// secret : session 만들때 비밀번호 , 아무거나 적어도됨.
app.use(session({secret:'비밀코드' , resave : true, saveUninitialized:false}));
app.use(passport.initialize());
app.use(passport.session());

//////////////////////// multer
let multer = require('multer');
var storage = multer.diskStorage({ // 하드디스크에 저장 , memory storage 에 저장하면 휘발
 
  destination : function(req,file,cb){
   cb(null,'./public/images') //업로드한 이미지를 저장할 경로
 },
 filename: function(req,file,cb){
   cb(null, file.originalname + ' date :' + new Date()) // 저장할때 파일명 설정(기존 오리지널 파일이름으로 저장)
 }

}); 
var upload = multer({storage : storage}); // multer를 변수에 담아서 사용

// ObjectId 함수 쓰기
const {ObjectId} = require('mongodb');
////////////////////////////////////library////////////////////////////////////////////////////////////////



// get요청
app.get('/pet', function (req, res) {
  res.send('펫용품 사시오')
})

app.get('/', (req, res) => {
  db.collection('login').findOne({_id: req.user._id } , function(err,result){
    res.render('index.ejs' , {userName:result});
    
  })
})

app.get('/write', (req, res) => {
  res.render('write.ejs')
})

// POST 요청 처리(글발행)
app.post('/add', function (req, res) {
  db.collection('counter').findOne(
    { name: 'countOfPost' },
    function (error, result) {
      var totalPost = result.totalPost

      db.collection('post').insertOne( /* 현재 로그인한 사람의 _id */
        { _id: totalPost + 1, user_id:req.user._id, writer:req.user.id ,title: req.body.title, date: req.body.date },
        function (error, result) {
          db.collection('counter').updateOne(
            { name: 'countOfPost' },
            { $inc: { totalPost: 1 } },
            function (error, result) {
              if (error) {
                return console.log(error)
              }
              res.send('전송완료')
            }
          )
        }
      )
    }
  )
})

// 데이터바인딩 , db에서 데이터 가져와서 list에 꽂기
app.get('/list', function (req, res) {
  db.collection('post')
    .find()
    .toArray(function (error, result) {
      res.render('list.ejs', { posts: result })
    })
 
})

// Ajax 삭제 요청 서버에서 응답하기 //
app.delete('/delete', (req, res) => {
  console.log(req.body._id) // req.body = {_id=4 , name=4}
  db.collection('post').deleteOne(  // 원래는 _id만 확인하다가, 이제 작성자도 확인.
    /* 순서 : write에서 게시글발행할때 title이랑 date db에 저장 하면서 
    _id , writer 도 같이 저장. _id는 db의 count라는 콜렉션의 totalCount라는 항목을 가져와서 사용하고 , 글이 발행될때마다 +1 한다.
    그러면 list에서 db에 있는 자료를 가져와서 바인딩 하는것.  */
    { _id: parseInt(req.body._id) , user_id:req.user._id},
    function (error, result) {
      console.log(result)
      res.status(200) // 응답코드 200 으로 무조건 요청 성공으로 판별.
    }
  )
  res.send('삭제완료')
})
// url 파라미터로 상세페이지 보여주기
app.get('/detail/:id', function (req, res) {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    function (err, result) {
      res.render('detail.ejs', { data: result })
    }
  )
})

// 글 수정 페이지 edit.ejs
app.get('/edit/:id', (req,res)=>{
  db.collection('post').findOne({_id:parseInt(req.params.id)} , function(err,result){
    res.render('edit.ejs',{post:result})
  })
  
})

/* edit 경로로 put요청 오면 할 일. */
app.put('/edit',(req,res)=>{
  // db데이터 수정해주세요.          
  console.log(req.body.id)                         /* 입력한 제목 */       /* 입력한 날짜 */
db.collection('post').updateOne({_id:parseInt(req.body.id)}, { $set:{title:req.body.title , date:req.body.date}} , function(err,result){
  res.redirect('/list')
})

})

// login 경로로 POST 요청 오면 할잃 (로그인할때)
// 일단 mongodb에서 id데이터 미리 삽입해 놓기.
app.get('/login', function(req,res){
  res.render('login.ejs');
});

/* id , pw 검사할때 쓰는 passport 문법 */
// local 이라는 방식으로 회원 인증
app.post('/login',passport.authenticate('local',{
  failureRedirect: '/fail' /* 로그인 실패하면 이동시킬 경로 */
}),function(req,res){
  // 로그인 성공하면
  res.redirect('/') 
});

// passport
// id , pw 검사하는 코드. (분석보다는 그냥 복붙해서 다른 부분만 수정해서 사용)
passport.use(new LocalStrategy({
  usernameField: 'id', // form 에 입력한 name 속성들 = id, pw
  passwordField: 'pw',
  session: true, // 세션정보 저장 여부. boolean
  passReqToCallback: false, // id,pw 말고 다른 정보도 검증해 보고싶으면 true
}, /* 아래 부분부터 중요! 실제로 id, pw 검증하는 부분 */ 
function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (err, result) {
    /* done() 은 라이브러리 문법. 
    done은 3개의 파라미터(서버에러,성공시사용자DB데이터,{에러메시지 출력})*/
    if (err) return done(err)
    //// 밑에부터 중요함\
    // result에 아무것도 없을때 (DB에 입력한 아이디와 일치하는 자료가 없을때)
    if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
    // DB에 입력한 아이디가 있으면
    if (입력한비번 == result.pw) { // 입력한 비밀번호와 db의 비밀번호가 같으면 
      return done(null, result) // 회원 인증 성공하면 result가 아래 user라는 파라미터로 들어감.
    } else { // 비번이 같지 않으면
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));


// 로그인 성공헸으면 
// session 정보 만들기.

// 로그인 성공시 user의 정보를 serialize 함.
// 회원인증 성공시 위의 result가 user로 들어감.  == result.id 
passport.serializeUser(function(user,done){
  done(null,user.id) //user의 id 데이터를 바탕으로 세션을 만들어서 저장 -> 세션을 쿠키 라는 브라우저의 저장공간으로 보냄
}); // user.id는 아래 deserializeUser의 id 파라미터에 들어감? 같음? 

// 세션 데이터를 가진 사람을 db에서 찾아주세요.
// 즉 로그인 한 유저의 개인정보를 DB에서 찾는 역할.
passport.deserializeUser(function(id,done){
  // db에서 user.id로 user를 찾은 뒤에 user의 정보를 result에 넣음. 
  db.collection('login').findOne({id:id},(err,result)=>{
    done(null,result)
  })
  
});

//id,pw 없을떄 '/fali' 페이지
app.get('/fail',function(req,res){
res.render('fail.ejs')
})


// mypage 라우딩 , 
// mypage로 접속할 때마다 loginOrNot 함수 실행하고 나서 응답.
// 1)요청받음 2)미들웨어(loginOrNOt함수) 싫행 3)응답
app.get('/mypage',loginOrNot, function(req,res){
  console.log(req.user);
  res.render('mypage.ejs',{pageUser:req.user})
})

//미들웨어
function loginOrNot(req,res,next){
  if(req.user){ // req.user는 로그인 후 남는 저장되는 세션으로
     // req.user가 있으면 로그인 되어 있다는 뜻.
    next() // 다음으로 통과.
  } else{
    res.send('로그인 해주셔야 하는디요.')
  }
} /* 여기서 req.user란 로그인 한 유저의 DB상의 정보(ID,PW,이름 등)  - 이걸 사용하려면 deserializeUser
  라는 기능개발이 필요하다. deserializeUser 라는 부분은 고객의 세션아이디를 바탕으로 이 유저의 정보를 DB에서 찾아주세요~ 역할을 하는 함수
  그리고 그 결과를 req.user 부분에 꽂아준다.*/

// 회원가입 만들려면 폼 만들고 폼 전송하면 db에 데이터 저장하는데 암호화 해서 저장. 





/* 쿼리스트링(쿼리파라미터) */
// 서버에서 query string 가져다 쓰기 (검색기능)
/* app.get('/search', function(req,res){ 
  db.collection('post').find({title:req.query.value}).toArray(function(err,result){
    console.log(result);
    res.render('search.ejs',{searchVal:result})
  })
}) */

// binary search - 반씩 잘라가면서 찾아보는것. 
// binary search 적용하려면 미리 숫자순 정렬이 되어있어야 한다.
// mongo db가서 index 만들기 ~~ 
// 위 코드를 index를 사용하는 방법으로 바꾸기

/* app.get('/search', function(req,res){ 
                           // text index 
  db.collection('post').find({$text: {$search:req.query.value}}).toArray(function(err,result){
    console.log(result);
    res.render('search.ejs',{searchVal:result})
  })
}) */

// text index는 띄어쓰기를 기준으로 검색하므로 한국어나 일어, 중국어에는 적합하지 않다.
/* 해결방법
1) text index 쓰지말고 정규식 걸어놓고 검색할 문서 양 제한 두기 (날짜순으로 앞에 1000개 중에서만 찾기) 
  -- new Date()
2) text index 만들 때 다르게 만들기 - 띄어쓰기 단위로 indexing 하지 말고 다르게 해봐라(nGram)(mongo db atals 에서는 못씀.)
3) mongo db atlas 에서 search index 사용하기.
4) search index 만들고 위 코드 맞게 수정.
*/

app.get('/search', function(req,res){ 
var searchConditon = [
  { $search:{
      index:'titleSearch' ,       /* 만든 인덱스명 */
      text:{
        query: req.query.value, /* 실제 검색어(인풋) */
        path: "title"               /* collection 안에 어떤 항목을 검사할것인지  여러개 찾고싶으면['title','date'] */
      }
    }
  }, {$sort:{_id:1}}, /* 정렬 - id기준으로 오름차순 */
    {$limit:10}, /* 결과 제한, 상위 10개만 노출 */
  {$project:{title:1 , date:1 , _id:0}} /* 찾아온 결과 중 원하는 항목만 보여줌. */
];
  

                  /* aggregate안에는 검색 조건이 들어갈 수 있음. aggregate([{},{},{}])*/
db.collection('post').aggregate(searchConditon).toArray(function(err,result){
  console.log(result);
  res.render('search.ejs',{searchVal:result})
    })
  })

app.post('/register',function(req,res){
db.collection('login').insertOne({id:req.body.id , pw:req.body.pw},function(err,result){
  res.redirect('/');
})})



// router 첨부 - router를 다른 파일에 만들어두고 server.js 에 첨부하기
// server.js에 shop.js 라우터 첨부하기
// app.use는 미들웨어 - 요청과 응답 사이에 실행되는 코드 .
/*  '/' 경로로 접속하면  */
app.use('/shop', require('./routes/shop.js'))

app.use('/board/sub' , require('./routes/board.js'))


// 이미지 업로드할 수 있는 /uplaod 라우트하기.(url에 따른 적당한 콘텐츠를 전송해주는것을 라우팅 이라고 함.)
app.get('/upload' , function(req,res){
  res.render('upload.ejs');
})

// 업로드한 이미지 저장하기 (이미지는 db에 저장하지 않고 , 일반 하드에 저장함.)
// 이미지 업로드시 multer를 미들웨어로 동작시키기
                //multer사용할때 .single('데이터를 받아올 input의 이름')  - 파일 하나만 전송
                // 파일 여러개 전송하려면 upload.array('인풋이름',받아올자료 최대갯수,)
app.post('/upload',upload.array('사진',10),(req,res)=>{
  res.send('업로드 완료')
})

//업로드한 이미지 보여주는 페이지.
app.get('/image/:id',function(req,res){
res.sendFile(__dirname /* 현재경로 */ + '/public/images/' + req.params.id)
})



app.get('/chat',loginOrNot,function(req,res){
  db.collection('chatroom').find({member : req.user._id}).toArray().then((result)=>{
    res.render('chat.ejs',{data:result})
  })
})

app.post('/chat',loginOrNot,function(req,res){
                                        //콜백함수 대신 쓰는 .then(콜백함수)
  var 저장할것 = {
    title : req.body.writer,
              // 채팅주인       //채팅건유저(현재 로그인된 유저)
    member : [ObjectId(req.body.userId),req.user._id],
    date : new Date()
  }
  db.collection('chatroom').insertOne(저장할것).then((result)=>{
    /* res.redirect('/chat') */
    res.send('완료')
  })
})

app.post('/message' , loginOrNot,function(req,res){
  
  var 저장할거 = {
    parent: req.body.parent,  /* 채팅방아이디. */
    content: req.body.content,
    userid : req.user._id,
    date: new Date(),
  }

  db.collection('message').insertOne(저장할거).then(()=>{
    console.log('DB저장성공')
    res.send('DB저장성공')
  })
})

//서버에서 유저에게 실시간 정보 보내기.
// 원래 get, post같은 http 요청은 1회 요청하면 1회 응답하고 끝입니다. 
//하지만 1회 응답이 아니라 지속적으로 서버에서 응답을 하고싶은 경우가 있습니다.
//근데 응답.send() 이러면 1회 응답하고 끝이기 때문에 
//1. Header 라는 정보의 connection 항목을 keep-alive로 설정해주고 
//2. 응답.write('안녕하세요') 이렇게 보내면 계속 유저에게 지속적으로 응답이 가능합니다.
//그럼 이제 실시간으로 유저에게 계속 정보전달이 가능합니다. 


app.get('/message/:id', loginOrNot, function(req,res){
  res.writeHead(200,{
    "Connection" : "keep-alive",
    "Content-Type" : "text/event-stream",
    "Cache-Control":"no-cache",
  });                           // 요청할때 url뒤에 누른 채팅방 id 넣어서 같이보내면
                                // url 파라미터로 받아서 여기서 가져다 씀.
                                // 그러면 채팅방 누르면 그 채팅방의 게시물(채팅)을 보낼수 잇음
  db.collection('message').find({parent : req.params.id}).toArray().then((result)=>{
    res.write('event: test\n');
                  //서버에서 실시간 전송시 문자자료만 전송가능
                  // 문자 자료형으로 변환하기 -> object,array에 따옴표 치면 JSON
    res.write('data:' + JSON.stringify(result) +'\n\n');
  })
 
});