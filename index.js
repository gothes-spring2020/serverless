const aws = require("aws-sdk");
var ddb = new aws.DynamoDB({ apiVersion: "2012-08-10" });
var ses = new aws.SES();
aws.config.update({ 
region: "us-east-1" });
var docClient = new aws.DynamoDB.DocumentClient();
exports.emailService = function(event, context, callback) {
  let message = event.Records[0].Sns.Message;
  let messageJson = JSON.parse(message);
  let messageDataJson = JSON.parse(messageJson.data);
  console.log("Test Message: " + messageJson.data);
  console.log("Test Link: " + messageDataJson.link);
  console.log("Test Id: " + messageDataJson.Email);
  console.log("Source"+ messageDataJson.sourceE);
  let Link = JSON.stringify(messageDataJson.link);
  let currentTime = new Date().getTime();
  let ttl = 1*600*6000;
  
  let expirationTime = (currentTime + ttl).toString();
  var emailParams = {
    Destination: {
      /* required */
      ToAddresses: [
        messageDataJson.Email
        
      ]
    },
    Message: {
      /* required */
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: Link
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "User Bill Link"
      }
    },
    Source: messageDataJson.sourceE
      };
      
  let putParams = {
    TableName: "csye6225",
    Item: {
      id: { S: messageDataJson.Email },
      link: {S: Link},
      ttl: { N: expirationTime }
    }
  };
  let queryParams = {
    TableName: 'csye6225',
  Key: {
    'id': {S: messageDataJson.Email}
  },
  };
  // first get item and check if email exists
  //if does not exist put item and send email,
  //if exists check if ttl > currentTime,
  // if ttl is greater than current time do nothing,
  // else send email
  ddb.getItem(queryParams, (err, data) => {
    if(err) console.log(err)
    else{
    // console.log('getItemttl: '+JSON.stringify(data, null, 2));
    console.log(data.Item)
    let jsonData = JSON.stringify(data)
    console.log(jsonData)
    let parsedJson = JSON.parse(jsonData);
    console.log(parsedJson)
    if (data.Item == null) {
      ddb.putItem(putParams, (err, data) => {
        if (err) console.log(err);
        else {
          console.log(data);
          console.log('sent from 1st function')
          var sendPromise = ses.sendEmail(emailParams).promise();
          sendPromise
            .then(function(data) {
              console.log(data.MessageId);
            })
            .catch(function(err) {
              console.error(err, err.stack);
            });
        }
      });
    } else {
      let curr = new Date().getTime();
      let ttl = Number(parsedJson.Item.ttl.N);
      console.log(typeof curr + ' '+ curr);
      console.log(typeof ttl+  ' '+ ttl);
      if (curr > ttl) {
        
        ddb.putItem(putParams, (err, data) => {
        if (err) console.log(err);
        else {
          console.log(data);
          console.log('sent from 1st function')
          var sendPromise = ses.sendEmail(emailParams).promise();
          sendPromise
            .then(function(data) {
              console.log(data.MessageId);
            })
            .catch(function(err) {
              console.error(err, err.stack);
            });
        }
      });
      }
    }}
  });
};