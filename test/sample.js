
/**
* @description This function fetches data from a Reddit API based on a specified 
* subreddit. It uses Axios to make a GET request to the API endpoint and logs the 
* response to the console.
* 
* @param { string } [sub='programming'] - The `sub` input parameter in the `fetch` 
* function is a string that specifies the subreddit to fetch content from. The 
* function uses the `axios` library to make a GET request to the Reddit API, passing 
* in the `sub` parameter as part of the URL.
* 
* @returns { object } - The output returned by this function is a JSON object 
* containing the data from the Reddit API. The function uses Axios to make a GET 
* request to the specified subreddit's JSON feed, and logs the response to the console 
* before returning it.
*/
function fetch(sub = 'programming') {
    const axios = require('axios')

    axios.get(`https://www.reddit.com/r/\${sub}.json`)
    .then((response) => {
        console.log(response);
        return response;
    })
    .catch((error) => {
        console.error(error);
        return null;
    });
}



/**
* @description This function, named `search`, takes an array `arr`, a search value 
* `x`, and three indices `start`, `end`, and returns `true` if `x` is found in the 
* array `arr` within the range of indices `start` to `end`, and `false` otherwise.
* 
* @param { array } arr - The `arr` input parameter is an array of elements that the 
* function searches for a specific element. The function takes the array and three 
* other parameters: `x`, `start`, and `end`.
* 
* @param { number } x - The `x` input parameter in the `search` function represents 
* the value that is being searched for in the array.
* 
* @param { number } start - The `start` input parameter in the `search` function 
* represents the starting index of the array to be searched. It determines the 
* beginning of the subarray that should be searched for the target value `x`.
* 
* @param { number } end - The `end` input parameter in the `search` function specifies 
* the end index of the array to be searched. It determines the end point of the range 
* of elements that need to be checked for the target value. The function will not 
* consider any elements beyond the end index in the search process.
* 
* @returns { array } - The output returned by this function is `true` or `false`. 
* The function takes four parameters: `arr`, `x`, `start`, and `end`. It searches 
* for the element `x` in the array `arr` starting from the index `start` and ending 
* at the index `end`.
*/
const search = (arr, x, start, end) => {
  if (start > end) return false;
  let mid = Math.floor((start + end)/2);

  if (arr[mid]===x) return true;
        
  if (arr[mid] > x) {
    return search(arr, x, start, mid-1);
  } else {
    return search(arr, x, mid+1, end);
  }
}



const handler = async(event) => {
    try {
/**
* @description This is an AWS Lambda function that handles FIDO2 registration and 
* authentication requests.
* 
* 	 Start the authenticator registration process (path parameter "register-authenticator/start")
* 	 Complete the authenticator registration process (path parameter "register-authenticator/complete")
* 	 List the user's authenticators (path parameter "authenticators/list")
* 	 Delete an authenticator (path parameter "authenticators/delete")
* 	 Update an authenticator's friendly name (path parameter "authenticators/update")
* 
* The function returns a response based on the request, including error messages if 
* necessary.
* 
* @param { object } event - The `event` input parameter in the `handler` function 
* is an object that contains information about the incoming request.
* 
* In this function, the `event` object is used to extract information about the 
* request, such as the `authorizer` claims, the `pathParameters`, and the `queryStringParameters`.
* 
* For example, the function uses `event.pathParameters.fido2path` to determine the 
* current path of the request and use it to decide which action to take.
* 
* In summary, the `event` object is a key input parameter in the `handler` function 
* that provides information about the incoming request and is used to determine the 
* appropriate action to take.
* 
* @returns { object } - Based on the code you provided, the output returned by the 
* function will be a JSON object with the following properties:
* 
* 	 `statusCode`: 200 (OK)
* 	 `body`: JSON.stringify({ options: ... }) or JSON.stringify({ storedCredential: 
* ... }) or JSON.stringify({ authenticators: ... }) or JSON.stringify({ message: 
* "Not found" }) or JSON.stringify({ message: "Internal Server Error" })
* 	 `headers`: { ...
* 
* The `body` property will contain the actual data returned by the function, depending 
* on the path parameter of the incoming request.
* 
* Here's a breakdown of the possible output returns based on the path parameter of 
* the incoming request:
* 
* 	 `/register-authenticator/start`: Returns { statusCode: 200, body: JSON.stringify({ 
* options: ... }), headers: { ... } }
* 	 `/register-authenticator/complete`: Returns { statusCode: 200, body: JSON.stringify({ 
* storedCredential: ... }), headers: { ... } }
* 	 `/authenticators/list`: Returns { statusCode: 200, body: JSON.stringify({ 
* authenticators: ... }), headers: { ... } }
* 	 `/authenticators/delete`: Returns { statusCode: 204 }
* 	 `/authenticators/update`: Returns { statusCode: 200, headers: { ... } }
* 	 Otherwise (404): Returns { statusCode: 404, body: JSON.stringify({ message: "Not 
* found" }), headers: { ... } }
* 	 Otherwise (500): Returns { statusCode: 500, body: JSON.stringify({ message: 
* "Internal Server Error" }), headers: { ...
*/
        const { sub, email, phone_number: phoneNumber, name, "cognito:username": cognitoUsername, } = event.requestContext.authorizer.jwt.claims;
        const userHandle = determineUserHandle({ sub, cognitoUsername });
        const userName = email ?? phoneNumber ?? name ?? cognitoUsername;
        const displayName = name ?? email;
        if (event.pathParameters.fido2path === "register-authenticator/start") {
            logger.info("Starting a new authenticator registration ...");
            if (!userName) {
                throw new Error("Unable to determine name for user");
            }
            if (!displayName) {
                throw new Error("Unable to determine display name for user");
            }
            const rpId = event.queryStringParameters?.rpId;
            if (!rpId) {
                throw new UserFacingError("Missing RP ID");
            }
            if (!allowedRelyingPartyIds.includes(rpId)) {
                throw new UserFacingError("Unrecognized RP ID");
            }
            const options = await requestCredentialsChallenge({
                userId: userHandle,
                name: userName,
                displayName,
                rpId,
            });
            logger.debug("Options:", JSON.stringify(options));
            return {
                statusCode: 200,
                body: JSON.stringify(options),
                headers,
            };
        }
        else if (event.pathParameters.fido2path === "register-authenticator/complete") {
            logger.info("Completing the new authenticator registration ...");
            const storedCredential = await handleCredentialsResponse(userHandle, parseBody(event));
            return {
                statusCode: 200,
                body: JSON.stringify(storedCredential),
                headers,
            };
        }
        else if (event.pathParameters.fido2path === "authenticators/list") {
            logger.info("Listing authenticators ...");
            const rpId = event.queryStringParameters?.rpId;
            if (!rpId) {
                throw new UserFacingError("Missing RP ID");
            }
            if (!allowedRelyingPartyIds.includes(rpId)) {
                throw new UserFacingError("Unrecognized RP ID");
            }
            const authenticators = await getExistingCredentialsForUser({
                userId: userHandle,
                rpId,
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    authenticators,
                }),
                headers,
            };
        }
        else if (event.pathParameters.fido2path === "authenticators/delete") {
            logger.info("Deleting authenticator ...");
            const parsed = parseBody(event);
            assertBodyIsObject(parsed);
            logger.debug("CredentialId:", parsed.credentialId);
            await deleteCredential({
                userId: userHandle,
                credentialId: parsed.credentialId,
            });
            return { statusCode: 204 };
        }
        else if (event.pathParameters.fido2path === "authenticators/update") {
            const parsed = parseBody(event);
            assertBodyIsObject(parsed);
            await updateCredential({
                userId: userHandle,
                credentialId: parsed.credentialId,
                friendlyName: parsed.friendlyName,
            });
            return { statusCode: 200, headers };
        }
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not found" }),
            headers,
        };
    }
    catch (err) {
        logger.error(err);
        if (err instanceof UserFacingError)
            return {
                statusCode: 400,
                body: JSON.stringify({ message: err.message }),
                headers,
            };
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
            headers,
        };
    }
}
