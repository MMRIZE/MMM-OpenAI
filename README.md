# MMM-OpenAI
MagicMirror module for requesting OpenAI's API

> DISCLAIMERS : 
>  1. <strike>This is not a `ChatGPT` module; (OpenAI has not released ChatGPT API yet.). This module uses OpenAI's API for text completion and image generation.</strike> Chat API is released on 2023. March 1st.
> 2. I will not implement any `voice-related` features into this module directly, but if you want, you can relay those kinds of modules for your own purpose. (This module has much preparation to cooperate with other modules.)

## Screenshot
![Text Completion](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-OpenAI/openai_scr_txtai.png)

![Image generation](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-OpenAI/openai_scr_imgai.png)

![Chat](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-OpenAI/openai_chat_marv.png)



## Features
- Request text completions or image generation from OpenAI with detailed options
- Activation through TelegramBot (defult behaviour)
- Activation with notification (customizable - For developing a new module or For using the current module without modification, either possible.)
- Customizable post-process (You might not need to build an external module to handle the response for your own purpose)
- Chatting implemented.

## Installation

```sh
cd ~/MagicMirror/modules # Goto MagicMirror/modules directory
git clone https://github.com/MMRIZE/MMM-OpenAI
cd MMM-OpenAI
npm install
```

## To get the API key and setup in your mirror
### API Keys
1. Go to `openai.com` and then sign-up/sign-in. (It's better to read the Pricing page first.)
2. You can acquire API Key in your account menu > User section. (https://platform.openai.com/account/api-keys)
3. Click `+ Create new secret key` and copy the key created to somewhere **IMPORTANT** *Once the key is created, you cannot see the key again, So you must copy the key when it is created.*
4. You can also get an `Organization ID` from the `ORGANIZATION` section.

### Env setting
1. Go to the root directory of MagicMirror (Usually `~/MagicMirror`)
2. Open `.env` with your favourite editor. (If there is not, create one by yourself.)
```sh
cd ~/MagicMirror
ls .env
vi .env    # Or whatever text editor you like (open existing .env file or create a new one)
```

Add these lines and save the `.env` file;
```sh
OPENAI_API_KEY="... Your OpenAI API Key here ..."
OPENAI_ORGANIZATION="... Your organization ID here ..."  # When you need.
```
Done.


## Configuration
### For default configuration
If you are not a developer, this would be enough for you. Trust me. 
```js
{
	module: "MMM-OpenAI",
	position: 'top_right',
},
```
### More detailed configuration
```js
{
	module: "MMM-OpenAI",
	position: 'top_right',
	config: {
	  stealth: false,
      imageAreaHeight: '400px',
      resultLife: 10 * 60 * 1000,
      defaultRequest: {
        text: {
          model: 'text-davinci-003',
          ...
        },
        image: {
          size: '512x512', // '256x256', '512x512'
          response_format:'url', // 'b64_json'
          ...
        },
        chat: {
          model: 'gpt-3.5-turbo',
          messages: [],
          max_tokens: 4000,
          ...
        }
      },

      notificationHook: {
        'AI_EXAMPLE': {
          method: 'TEXT',
          request: {
            prompt: 'Hello, there. Introduce yourself',
          }
        }
      },

      postProcessing: (processor, payload) => {
        console.log('[OPENAI] Nothing on postprocessing. (default)')
      },

      telegramCommandText: 'txtai',
      telegramCommandImage: 'imgai',
      telegramCommandChat: 'chatai',
      telegramChatReset: 'reset',
      defaultChatInstruction: "Your name is Marvin and you are a paranoid android that reluctantly answers questions with sarcastic responses.",
	}
},
```
I can bet most of you guys don't need this kind of detailed configuration if you are not an expert.

### Config details
All the properties are omittable, and if omitted, a default value will be applied.

|**property**|**default**|**description**|
|---|---|---|
|`stealth`| false | Deciding whether to display the response from OpenAI.|
|`imageAreaHeight`| '400px' | Of course you can ignore this value by custom.css overriding. (Width of a module would be determined by it's position usually.) |
|`resultLife` | 600000 (ms) | After this time, the response will be faded out. (when you set the `stealth` property to `false`). If you set this value to 0, the displayed response are not faded until getting new response. |
|`defaultRequest` | { text, image } | See the `Request Format` section. |
|`notificationHook` | [ Array of notificaiton definition (`Object` or `Function`) ] | See the `Notification Hooking` section. |
|`postProcessing` | callback function | See the `PostProcessing` section. |
|`telegramCommandText` | 'txtai' | telegramBot command for text compliment request |
|`telegramCommandImage` | 'imgai' | telegramBot command for image generation request |
|`telegramCommandChat` | 'chatai' | telegramBot command for chatting (ChatCPT) |
|`telegramChatReset` | 'reset' | a keyword for reset current chat session and give a new initial instruction |
|`defaultChatInstruction`| text | Initial instruction of chatting session. You can give a character to AI |
## How to use
### 1. Using TelegramBot
If you are using `MMM-TelegramBot`, the commands would be added.

- `/txtai YOUR_PROMPT` : To get text compliments from your prompt
```
/txtai recommend me 5 famous Korean food
```

- `/imgai YOUR_PROMPT` : to get an image generated from your prompt
```
/imgai Santa Claus in a blue coat
```
- `/chatai`
  - `/chatai` or `/chatai reset`: Reset and start new dialog session with default instruction
  - `/chatai reset INSTRUCTION` : Reset and start new dialog session with custom instruction
  ```
  /chatai reset You are my smart and nice assistant and your name is Suji and we will say Korean from now on.
  ```
  - `/chatai YOUR_PROMPT` : Your conversation to the AI
  ```
  /chatai Summarize me "Star Wars Episode IV"
  ```
  > By default, until new dialog session, AI will remember the conversation with you, but the previous dialog will consume your tokens also on each time and too long conversation session without `reset` may cause error. (Max token 4096)

> You can adjust the configuration to change the command `txtai`, `chatai` and `imgai` to whatever commands you like.




### 2. Using Built-in Notification
> **From here, you should be a module developer or at least know what you are doing.**

`OPENAI_REQUEST` is pre-defined default incoming notification to request a response from OpenAI with your prompt in an external module. If you are a module developer and when you want to use OpenAI in your module also, this feature would be help.
- Text Only (the simplest)
```js
// In some module;
this.sendNotification('OPENAI_REQUEST', 'Why did the chicken cross the road?')
```
- Detailed Request Object. (See the `Request Format`.)
```js
// In some module;
this.sendNotification('OPENAI_REQUEST', {
  method: 'IMAGE',
  request: {
    prompt: 'A photo of a bear enjoying honey.',
    response_format: 'url'
  },
  stealth: true,
  callback: (response) => {
    if (response) this.doSomething(response)
  }
})
```
Attributes omitted would be fulfilled with default configuration values.


### 3. Notification Hooking
You can add custom notification also. Especially when you want to use existing modules and their notification without editing module itself, this feature might be useful.

```js
notificationHook: {
  "NOTIFICATION_NAME" : DEFINITION, // It could be a request object(static) or function which would return a request object(dynamic)
  "SOME_NOTIFICATION" : { // static/fixed request
    method: 'TEXT',
    prompt: 'Tell me something fun'
  },
  "ANOTHER_NOTIFICATION" : (payload, sender) => { // dynamic request by payload or sender
    return {
      method: 'TEXT',
      prompt: 'How do you think about ' + payload.content 
    }
  },
  "SHOW_ALERT" : (payload, sender) => { // Example : When the `SHOW_ALERT` notification is broadcasted, this module will hook that notification then try to translate the alert message to Korean then display it in this module.
    return {
      stealth: false,
      prompt: "Translate to Korean - " + payload.message 
    }
  }
}
```

### 4. Request Format
The request object has this structure; (Every attribute can be omitted and then it will be replaced/fulfilled with default configuration values.)
```js
{
  method: 'TEXT', // OR 'IMAGE' -- If omitted, assumed as 'TEXT'
  stealth: true, // OR false -- Default value would be the same with your default configuration value.
  callback: (response) => {
    // Doing something in your module with the response when the response arrives from OpenAI.
  },
  request: {
    prompt: "your prompt here also...", // You can describe your prompt here also. ()
    ... // other options for OpenAI API request.
  }
}
```

#### detailed options for text compliments
```js
request: {
  prompt: '',
  model: 'text-davinci-003',
  n: 1, // Warning; consumeing tokens
  max_tokens: 512, // Warning; consuming tokens
  
  /* // You should know what you are doing to use below options.
  temperature: 1, // 0~2
  top_p: 0,
  suffix: null,
  logprobs: null,
  echo: false,
  stop: "\n",
  presence_penalty: 0,
  best_of: 1, //Warning; consuming tokens
  //stream: false, // Not prepared for this result, RESERVED. (Don't use it)
  */
},
```
https://platform.openai.com/docs/api-reference/completions/create

#### detailed options for image generation
```js
request: {
  prompt: '',
  n: 1, // Warning: consuming tokens
  size: '512x512', // '256x256', '512x512', '1024x1024' available
  response_format:'url', // 'b64_json', 'url' available
}
```
https://platform.openai.com/docs/api-reference/images/create

#### detailed options for Chatting
```js
request: {
  model: 'gpt-3.5-turbo',
  messages: [],
  max_tokens: 4000,
  /* // You should know what you are doing.
  temperature: 1, // 0~2
  top_p: 0,
  suffix: null,
  stream: false, // Not prepared for this result, RESERVED. (Don't use it)
  logprobs: null,
  echo: false,
  stop: "\n",
  presence_penalty: 0,
  best_of: 1, //Warning; consuming tokens,
  frequency_penalty: 0,
  //stream: false, // Not prepared for this result, RESERVED. (Don't use it)
  */
}
```
https://platform.openai.com/docs/api-reference/chat/create

*If therre is mistypo or invalid attribute/value, the request would be failed and will response error.*

### 5. Response Format
As a reply from OpenAI, the response object would have this structure; This object would be transfered as a response payload in your callback or postProcessing. 
#### common 
```js
{
  error, // if there was an error, this attribute would have an error object.
  request, // your request object for this response
  options, // some additional options for this request/response
  responseTimestamp, 
  stealth,
  response, // when querying request is success, the response object would be carried.
}
```
The attribute `response` might have a different object by `Text Completion` or `Image Generation`.
#### text completion response
```js
{
  ... // other common attributes;
  response: {
    choices: [
      {
        text: '... A completion from OpenAI ...',
        finish_reason: "stop",
        index: 0,
        logprobs: null, 
      },
      { // When you request with `n:` options, the multiple answers will be responsed.
        text: '... Another completion ...',
        ... 
      }
    ],
    created: 1677251234, // created time from OpenAI
    id: '....',
    model: 'text-davinci-003',
    object: 'text-completion', 
  },
}
```

#### image generation response
```js
{
  ... // other common attributes;
  response: {
    data: [
      {
        url: ' ... URL of image ...',
        //b64_json: '........', // When the `response_format` is `b64_json`, this Base64 encoded image would be returned instead of `url`.
      },
      { ... },
    ],
    created,
  }
}
```

#### chatting completion response
> **WARNING** The structure of this response is differnt with others.
```js
{
  ... //other common attributes;
  response: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: ' ... Reply from AI ... '
        },
        index,
        finish_reason
      },
      { ... },
    ],
    ... // other attributes of the response
  }
}
```
The response of chatting would have `message` object. You might need this object to keep dialog session.

### 6. Post Processing
You can add your logic after response receiving to handle that without a help of external module. 
For example, you can log all the response regardless of which module request it.

```js
postProcessing: (helper, responseObj) {
  // console.log(responseObj)
  if (responseObj.options.method === 'TEXT') {
    helper.sendNotification('TEXT_RESPONSE_FROM_OPENAI', responseObj.response.choices[0].text)
    let clock = helper.getModule('clock')
    clock.hide()
  }}
```
> For `responseObj`, read the `Response Format` section.


#### helper 
`helper` Object could provide you some utilities to control MM by yourself with the response.
- `.getModules()` will return all instances of modules on MagicMirror. 
```js
helper.getModules().forEach((m) => { m.hide() })
```
- `.getModule(module_name)` will return an instance of the specific module on MagicMirror
```js
let weather = helper.getModule('weather')
weather.updateDom()
```
- `.sendNotification(notification, payload)` could send notification by yourself.
```js
helper.sendNotification('SHOW_ALERT', responseObj.response.choices[0].text)
```
- `.shellExec(script)` could execute your shellscript or external program. (But only execution, you cannot get the result or cannot control that execution.)
```js
helper.shellExec('sudo reboot now')
```


## For developer : Chatting 
- Unlike `text completion` and `image generation`, `CHAT` might need to keep a history of conversation session. To achieve that, OpenAI chooses `To carry all the conversations` on each request.
```js
this.sendNotification('OPENAI_REQUEST', {
  method: 'CHAT',
  request: {
    messages: [
      {
        role: 'system',
        content: 'You are a smart assistant'
      },
      {
        role: 'user',
        content: 'Now, my hair is black. remember it.'
      },
      {
        role: 'user',
        content: 'So, what is my hair color?'
      }
    ]
  },
  stealth: false,
  callback: (obj) => {
    let conversation = [...obj.request.messages, obj.response.choices[0].message]
    console.log('HISTORY', conversation)
    // The last message(obj.response.choices[0].message) might be something like this.
    /*
    {
      role: 'assistant',
      content: 'Your hair is black.'
    }
    */
    // You can use this array of history on next request
  }
})
```
To continue this session, you may to deliver all the history between you and AI on the next request. But you should know this; your previous conversation session will consume your token also. So your 3000 tokens from previous conversation result would cause an error when the response might be over 1100 tokens. (Max. 4096)
You may need to adjust `max_token`.


## Note
- If you make some mistypo or carry invalid request options, you will get error (but not detailed).



## History
### 1.2.0 (2022-03-06)
- ADDED : More kind error message (in console and the display, telegram, and the dev-console)
- ADDED : Token usage on success in TEXT and CHAT.
- FIXED : Reducing default `max_token` for chat. (Too many token limit may cause the error unexpected)

![120_1](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-OpenAI/oai_120_1.png)

![120_2](https://raw.githubusercontent.com/MMRIZE/public_ext_storage/main/MMM-OpenAI/oai_120_2.png)

### 1.1.0 (2022-03-02)
- ADDED : Chatting

### 1.0.0 (2022-02-28)
Released.


## Author
- Seongnoh Yi (eouia0819@gmail.com)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y56IFLK)
