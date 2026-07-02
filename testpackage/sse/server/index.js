import express from 'express'
import path from "path";

const app = express()
app.use('/public',express.static(path.join(path.resolve(),'testpackage','sse' ,'client')))
app.get('/debug', (req,res)=>{
    res.send('debug')
})
app.get('/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');

    const text = 'hello world';
    for (let index = 0; index < text.length; index++) {
        res.write(`data: ${text[index]}\n\n`);
    }
    res.write(`data: done\n\n`);
    res.write(`data: finished\n\n`);

    res.end();


})
app.listen(2222)
