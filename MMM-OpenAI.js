Module.register('MMM-OpenAI', {
  defaults: {
    method: 'TEXT',  // 'IMAGE'
    defaultRequest: {
      text: {
        model: 'text-davinci-003',
        prompt: '',
        n: 1, // Warning; consumeing tokens
        max_tokens: 512, // Warning; consuming tokens
/*
        temperature: 1, // 0~2
        top_p: 0,
        suffix: null,
        stream: false, // Not prepared for this result, RESERVED. (Don't use it)
        logprobs: null,
        echo: false,
        stop: "\n",
        presence_penalty: 0,
        best_of: 1, //Warning; consuming tokens
*/
      },
      image: {
        prompt: '',
        n: 1,
        size: '1024x1024', // '256x256', '512x512'
        response_format:'url', // 'b64_json'
      }
    },
    notificationHook: {
      "OPENAI_TEXT": (payload, sender) => {
        return {
          method: 'TEXT',
          request: { 
            prompt: payload?.prompt ?? null,
            n: 1, 
          },
          callback: payload?.callback ?? null
        }
      },
      "OPENAI_IMAGE": (payload, sender) => {
        return {
          method: 'IMAGE',
          request: { 
            prompt: payload?.prompt ?? null ,
            response_format: 'url',
            n: 1,
          },
          callback: payload?.callback ?? null
        }
      }
    },

    telegramCommandText: 'txtai',
    telegramCommandImage: 'imgai'
  },

  getStyles: function () {
    return ['MMM-OpenAI.css']
  },

  start: function() {
    this.requestPool = new Map()
  },

  getCommands: function(commander) {
    commander.add({
      command: this.config.telegramCommandText,
      description: 'Ask to OpenAI with text',
      callback: 'command_text',
    })
    commander.add({
      command: this.config.telegramCommandImage,
      description: 'Request image to OpenAI',
      callback: 'command_image'
    })
  },

  command_text: function(command, handler) {
    if (handler.args) {
      let request = { prompt: handler.args }
      this.requestText(request, handler, 'TELEGRAM')
    } else {
      handler.reply('There is no prompt to ask to OpenAI.')
    }
  },

  command_image: function(command, handler) {
    if (handler.args) {
      let request = { prompt: handler.args }
      this.requestImage(request, handler, 'TELEGRAM')
    } else {
      handler.reply('There is no prompt to ask to OpenAI.')
    }
  },

  requestText: function(request, handler = null) {
    let id = Date.now()
    this.requestPool.set(id, handler)
    this.sendSocketNotification('REQUEST', {
      request: { ...this.config.defaultRequest.text, ...request },
      options: { id, method: 'TEXT', }
    })
  }, 

  requestImage: function(request, handler = null) {
    let id = Date.now()
    this.requestPool.set(id, handler)
    this.sendSocketNotification('REQUEST', {
      request: { ...this.config.defaultRequest.image, ...request },
      options: { id, method: 'IMAGE', }
    })
  }, 

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'RESPONSE') {
      console.log(payload)
      console.log( payload.response.data[0].url )
      if (payload.options?.id && this.requestPool.has(payload.options.id)) {
        let handler = this.requestPool.get(payload.options.id)
        if (payload.error) {
          payload.response = null
          console.log('[OPENAI] Error:', payload.error)
        }
        if (typeof handler === 'function') {
          handler(payload)
        } else if (typeof handler?.reply === 'function') {
          if (payload.error) {
            handler.reply('TEXT', 'Something wrong, see the log.')
          } else if (payload.options.method === 'IMAGE') {
            handler.reply('PHOTO_URL', payload.response.data[0].url, {caption: payload.request.prompt})
          } else {
            handler.reply('TEXT', payload.response.choices[0].text)
          }
        } else {
          console.log('[OPENAI] Invalid Handler)', response)
        }
        this.requestPool.delete(payload.options.id)
      } else {
        console.log('[OPENAI] Response without handler (Usually timedout)', response)
      }
    } // RESPONSE 
  }





})