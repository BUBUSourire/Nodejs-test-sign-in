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

        //读取用户信息
        let cookies = ''
        if (request.headers.cookie) {
            cookies = request.headers.cookie.split('; ') // 以; 为分割依据，将用户信息组成数组：[]
        }
        let hash = {}
        for (let i = 0; i < cookies.length; i++) {
            let parts = cookies[i].split('=')
            let key = parts[0]
            let value = parts[1]
            hash[key] = value  // hash { sign_in_email: '33@33', sessionId: '93749.62641918282' }
        }

        //  通过用户cookie的sessionId，找到对应的sign_in_email，从而获取用户当前的email，用户只能看到sessionId，而不能直接看到email

        let mySession = sessions[hash.sessionId] //mySession { sign_in_email: '33@33' }
        let email
        if (mySession) { //此处判断是因为一旦页面刷新，内存就会被释放
            email = mySession.sign_in_email
        }
        // console.log(session) //session { '2972.954371701109': { sign_in_email: '11@11.com' } }

        //读取数据库
        let users = fs.readFileSync('./db/users', 'utf-8')
        users = JSON.parse(users)
        let foundUsers
        for (let i = 0; i < users.length; i++) {
            if (users[i].email === email) { //如果cookie带的email与数据库中某email像同
                foundUsers = users[i] //{ email: '11@11.com', password: '1' }
                break
            }
        }
        if (foundUsers) {
            string = string.replace('__password__', foundUsers.password)
        } else {
            string = string.replace('__password__', '密码未知')
        }
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
        //拿到用户上传的第四部分body
        readBody(request).then((body) => { //获取成功则对body进行进一步处理  body:'email=1&password=1&password_confirm=1'

            //将body存入hash，以便获取name和对应的用户输入的值
            let hash = {}
            let strings = body.split('&') //将body分割成字符串数组 ['email=1','password=1','password_confirm=1']
            strings.forEach((string) => {//此处string为 'email=1'或'password=1'...
                let parts = string.split('=') //继续分割 ['email','1']成两部分
                let key = parts[0]
                let value = parts[1]
                hash[key] = decodeURIComponent(value)  //hash['email'] = '1'....
            })

            // let email = hash['email']
            // let password = hash['password']
            // let password_confirm = hash['password_confirm'] 可简写成如下
            let { email, password, password_confirm } = hash

            //判断邮箱格式
            if (email.indexOf('@') === -1) { //如果邮箱中没有@
                response.statusCode = 400
                //后端给前端一个JSON语法的字符串提示，前端转化成对象并给用户提示
                response.setHeader('Content-Type', 'application/json;charset=utf-8') //告知是一个JSON格式提示
                response.write(`{
                "errors": {
                    "email": "invalid"
                }
            } `)//JSON格式字符串
            } else if (password !== password_confirm) {
                response.statusCode = 400
                response.write('password not match')
            } else {

                //如果邮箱和密码均填写成功，则将数据村入数据库

                //读数据库
                var users = fs.readFileSync('./db/users', 'utf-8')
                try {
                    users = JSON.parse(users)
                } catch (exception) {
                    users = []
                }

                //判断邮箱是否已被注册（数据库中是否已存在客户输入的该邮箱）
                let inUse = false
                for (let i = 0; i < users.length; i++) {
                    let user = users[i]
                    if (user.email === email) {
                        inUse = true
                        break
                    }
                }
                if (inUse) {
                    response.statusCode = 400
                    // response.write('email in use')
                    //JSON 前后端交互协议，后端SON格式表达提示 
                    response.setHeader('Content-Type', 'application/json;charset=utf-8')
                    response.write(`{
                        "errors":{
                            "email":"inUse"
                        }
                    }`)
                } else {
                    users.push({ email: email, password: password })
                    var usersString = JSON.stringify(users)
                    fs.writeFileSync('./db/users', usersString)
                    response.statusCode = 200
                }
            }
            response.end()
        })
    } else if (path === '/sign_in' && method === 'GET') {
        let string = fs.readFileSync('./sign_in.html', 'utf-8')
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_in' && method === 'POST') {
        //拿到用户上传的第四部分body
        readBody(request).then((body) => {
            //将body存入hash，以便获取name和对应的用户输入的值
            let hash = {}
            let strings = body.split('&')
            strings.forEach((string) => {
                let parts = string.split('=')
                let key = parts[0]
                let value = parts[1]
                hash[key] = decodeURIComponent(value)  //hash['email'] = '1'....
            })

            // let email = hash['email']
            // let password = hash['password']
            // let password_confirm = hash['password_confirm'] 可简写成如下
            let { email, password, password_confirm } = hash

            //判断邮箱格式
            if (email.indexOf('@') === -1) { //如果邮箱中没有@
                response.statusCode = 400
                //后端给前端一个JSON语法的字符串提示，前端转化成对象并给用户提示
                response.setHeader('Content-Type', 'application/json;charset=utf-8') //告知是一个JSON格式提示
                response.write(`{
                    "errors": {
                        "email": "invalid"
                    }
                } `)//JSON格式字符串
            } else {

                //如果邮箱和密码均填写成功，则将数据存入数据库

                //读数据库
                var users = fs.readFileSync('./db/users', 'utf-8')
                try {
                    users = JSON.parse(users)
                } catch (exception) {
                    users = []
                }

                //遍历，判断用户输入的邮箱密码与数据库中的是否相同
                let found
                for (let i = 0; i < users.length; i++) {
                    if (users[i].email === email && users[i].password === password) {
                        found = true
                        break
                    }
                }
                if (found) {
                    if (found) {
                        //给用户cookie一个随机sessionId
                        let sessionId = Math.random() * 100000
                        sessions[sessionId] = { sign_in_email: email } //将cookie记录到sessionId中，防止用户直接读取cookie内容
                        // Set-Cookie: <cookie-name>=<cookie-value>  记录是哪个用户=============cookie
                        response.setHeader(
                            'Set-Cookie', `sessionId=${sessionId}`)
                        response.statusCode = 200
                    } else {
                        response.statusCode = 401
                    }
                }
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

//拿到用户上传的第四部分 ==nodejs get post data==
function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = []//请求体
        request.on('data', (chunk) => {//监听data事件，获取数据块
            body.push(chunk);
        }).on('end', () => {//end 数据全部上传完
            body = Buffer.concat(body).toString();//body获取到了全部数据
            resolve(body)
        })
    })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)
