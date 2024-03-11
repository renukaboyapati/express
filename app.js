const express = require("express");
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 3000;
const apiKey = 'sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912';
const apiBaseUrl = 'https://api.fillout.com';

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

const fetch = require("node-fetch");

app.post("/:formId/filteredResponses", (request, response) => {

    // console.log(request.body)

    let limit = request.query.limit || 1;

    const requestJSON = JSON.parse(JSON.stringify(request.body));

    //formId that we have received as part of URL
    let formId = request.params.formId;
    let fillOutResponse;
    let filteredResponse;
    fetch(apiBaseUrl + '/v1/api/forms/' + formId + '/submissions', {
        headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        }
    }).then(checkAndHandleErrors)
        .then((res) => res.json())
        .then(function (data) {
            fillOutResponse = data;
            const submissionObjects = JSON.parse(JSON.stringify(data));

            var responses = submissionObjects.responses;
            var count = 0;
            var myMap = new Map();
            Object.entries(responses).forEach(entry => {
                const [key, value] = entry;
                const objValue = JSON.parse(JSON.stringify(value));
                //console.log(key);
                //console.log(JSON.parse(JSON.stringify(objValue.questions)));
                const questionArray = JSON.parse(JSON.stringify(objValue.questions));
                var questionList = [];
                var isExistsArray = [];
                Object.entries(requestJSON).forEach(entry => {
                    const [key, value] = entry;
                    const reqValue = JSON.parse(JSON.stringify(value));
                    const resultObject = findObjectByRequestQuestionObject(questionArray, reqValue);
                    if (resultObject !== null && resultObject !== undefined) {
                        questionList.push(resultObject);
                        isExistsArray.push(true);
                    } else {
                        isExistsArray.push(false);
                    }
                })
                if (!isExistsArray.includes(false)) {
                    myMap.set(count, questionList);
                    isExists = false;
                }
                 ++count;
            });

            // Check if all keys and values in the request JSON match the submissions JSON object
            response.send(mapToJSON(submissionObjects, myMap, limit));
        }).catch(function (err) {
            // handle the error here
        });
});

const findObjectByRequestQuestionObject = (questionArray, reqValue) => {
    let foundObject;
    Object.entries(questionArray).forEach(entry => {
        const [key, value] = entry;
        const quesValue = JSON.parse(JSON.stringify(value));
        if (reqValue.condition == 'equals') {
            if (quesValue.id === reqValue.id && quesValue.value === reqValue.value) {
                foundObject = quesValue;
            }
        } else if (reqValue.condition == 'does_not_equal') {
            if (quesValue.id === reqValue.id && quesValue.value !== reqValue.value) {
                foundObject = quesValue;
            }
        } else if (reqValue.condition == 'greater_than') {
            if (quesValue.id === reqValue.id && (typeof reqValue.value === 'number' || isDateYYYYMMDD(reqValue.value))) {
                if (quesValue.value > reqValue.value) {
                    foundObject = quesValue;
                }
            } else {
                isExists = false;
            }
        } else if (reqValue.condition == 'less_than') {
            if (quesValue.id === reqValue.id && (typeof reqValue.value === 'number' || isDateYYYYMMDD(reqValue.value))) {
                if (quesValue.value < reqValue.value) {
                    foundObject = quesValue;
                }
            } else {
                isExists = false;
            }
        }
    })
    return foundObject;
};

function checkAndHandleErrors(response) {
    if (!response.ok) {
        throw new Error("Request failed with" + response.statusText);
    }
    return response;
}

function isDateYYYYMMDD(value) {
    // Regular expression for yyyy-mm-dd format
    const yyyyMMDDRegex = /^\d{4}-\d{2}-\d{2}$/;
    return yyyyMMDDRegex.test(value);
}

function mapToJSON(submissionObjects, map, limit) {

   /* map.forEach((value, key) => {
        submissionObjects.responses[key].questions = value;
    });*/

    for (let i = submissionObjects.responses.length - 1; i >= 0; i--) {
        if (!map.has(i)) {
            submissionObjects.responses.splice(i, 1);
        }
    }
    submissionObjects.totalResponses = map.size;
    if (map.size % limit == 0) {
        submissionObjects.pageCount = map.size / limit;
    } else {
        submissionObjects.pageCount = Math.floor(map.size / limit) + 1;
    }
    return submissionObjects;
}
