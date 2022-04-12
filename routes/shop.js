var router = require('express').Router();


//미들웨어
function loginOrNot(req,res,next){
    if(req.user){ // req.user는 로그인 후 남는 저장되는 세션으로
       // req.user가 있으면 로그인 되어 있다는 뜻.
      next() // 다음으로 통과.
    } else{
      res.send('로그인 해주셔야 하는디요.')
    }
  }

  
// 미들웨어 적용하려면  url 과 펑션 중간에 넣어주면 됨.
//라우터에 미들웨어 적용
// shop/shirts 접속할때마다 loginOrNot함수 실행
/* router.get('/shirts',loginOrNot , function(req,res){
    res.send('셔츠 파는 페이지 입니다.') - /
}); */

// 여기있는 모든 라우터에 미들웨어 적용하고 싶으면 
/* router.use(loginOrNot);    */    

// 특정 url에만 적용하고 싶으면 -- /shop/shorts로 접속했을때 미들웨어 적용
router.use('/shirts' , loginOrNot)

router.get('/shirts', function(req,res){
    res.send('셔츠 파는 페이지 입니다.')
});

router.get('/pants', function(req,res){
    res.send('바지 파는 페이지 입니다.')
});




// 내보낼때 쓰는 문법.
module.exports = router;
