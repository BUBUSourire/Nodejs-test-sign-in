var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url
  var queryString = ''
  if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  console.log('方方说：含查询字符串的路径\n' + pathWithQuery)

  if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'GET') {
    let string = fs.readFileSync('./sign_up.html', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&') //[email=1,password=2,password_confirm=3]
      let hash = {}
      strings.forEach((string) => {
        //string == 'email=1'
        let parts = string.split('=')//['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = value //hash['name']='1'
      })
      // let email = hash['email']
      // let password = hash['password']
      // let password_confirm = hash['password_confirm']
      let{email,password,password_confirm} = hash //ES6写法
      if(email.indexOf(encodeURIComponent('@')) === -1){
        response.statusCode = 400
        // response.write('email is error')
        //JSON 前后端交互协议，后端SON格式表达提示 
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "error":{
            "email":"invalid"
          }
        }`)

      }else if(password !== password_confirm){
        response.statusCode = 400
        response.write('password not match')
      }else{
        response.statusCode = 200
      }
      console.log(hash)
      response.statusCode = 200
      response.end()
    })
  } else if (path === '/main.js') {
    let string = fs.readFileSync('./main.js', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/xxx') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/json;charset=utf-8')
    response.setHeader('Access-Control-Allow-Origin', 'http://tom.com:8001')
    response.write(`
    {
      "note":{
        "to":"tom",
        "from":"jerry",
        "heading":"say",
        "content":"hi"
      }
    }
    `)
    response.end()
  }


  /******** 代码结束，下面不要看 ************/
})

//获取用户传入的第四部分
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)
