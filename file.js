/**
 * Created by points on 18/5/2.
 */
var express = require('express');
var router = express.Router();
var Setting = require('../utils/config');
var mongoose = require('mongoose');

var baidubce = require('bce-sdk-js')
var fs = require('fs');
var request = require('request');
var async = require("async");

var index = 0;
const config = {
        endpoint: 'http://bj.bcebos.com',         //传入Bucket所在区域域名
        credentials: {
          ak: 'fd1a99ecacc646378349c9bf18ca63cf',
          sk: '704ec5d754d1433ca6317ec09e263cd4'
        }
};
const bucket = 'autorepaier';
var arrLoadFiledItems = [];
router.get('/asyncBaePics',function (req,res,next) {
    var client =  new baidubce.BosClient(config)
    getBaePicUrls(client,bucket,{maxKeys:1000});
});

function getBaePicUrls(client,bucket,listOptions){
    client.listObjects(bucket,listOptions)
        .then(function (response) {
            console.log('response.body'+JSON.stringify(response.body));
            var contents = response.body.contents;
            for (var i = 0, l = contents.length; i < l; i++) {
                var _index = index+i;
                console.log(_index+' '+JSON.stringify(contents[i]));
            }
            index+=contents.length;
            startReDownlodaTask(contents)
            if(response.body.isTruncated){
                getBaePicUrls(client,bucket,{marker:response.body.nextMarker})
            }
        })
        .catch(function (statusCode,error) {
            // 查询失败
        });
}

function  startReDownlodaTask(arr) {
    arrLoadFiledItems = new  Array();
    async.mapSeries(arr,function(item, callback){
        var url = 'http://autorepaier.bj.bcebos.com/'+item.key;
        var objName = item.key;
        var basePath = './file/pic';
        if(url.indexOf(".png") != -1){
            download(url,basePath, objName,item,function () {
                callback(null,item);
            });
        }
    },function (e,v) {
        if(arrLoadFiledItems.length >0){
            console.log('下载失败:'+arrLoadFiledItems.length);
            var _arrRelaod = new Array();
            for(var i=0;i<arrLoadFiledItems.length;i++){
                _arrRelaod.push(arrLoadFiledItems[i]);
            }
            startReDownlodaTask(_arrRelaod);
        }
    });
}

function download(uri, dir,filename,item,callback){
      var dest = dir + "/" + filename;
    request({uri: uri, encoding: 'binary'}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            fs.writeFile(dest, body, 'binary', function (err) {
                if (err) {
                    arrLoadFiledItems.push(item);
                    console.log('fs.writeFile1 failed'+err+uri);
                }else {
                    console.log('fs.writeFile1  ok'+err+uri);
                }
                callback(null);
            });
        }else {
            callback(null);
            arrLoadFiledItems.push(item);
            console.error('fs.writeFile2'+error+uri);
        }
    });
};

module.exports = router;

