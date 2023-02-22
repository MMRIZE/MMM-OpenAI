class PostProcess {
  constructor (callbacks) {
    this._callbacks = callbacks
  }

  sendNotification(noti, payload) {
    this._callbacks.sendNotification(noti, payload)
  }

  shellExec(scr) {
    this._callbacks.shellExec(scr)
  }

  getModule(mName = null) {
    var modules = this.getModules()
    if (mName == null) mName = "MMM-OpenAI"
    for (var i = 0; i < modules.length; i++) {
      if (modules[i] && modules[i].name == mName) return modules[i]
    }
  }

  getModules() {
    return this._callbacks.getModules()
  }
}

Module.register('MMM-OpenAI', {
  defaultNotification: {
    "OPENAI_REQUEST": (payload, sender) => {
      const defaultObj = {
        method: 'TEXT',
        callback: null,
        request: {},
        prompt: null,
        stealth: false,
      }
      let requested = {}
      if (typeof payload === 'string') {
        requested = {...defaultObj, ...{ prompt: payload }}
      } else {
        requested = {...defaultObj, ...payload}
      }
      console.log('REQUESTED', requested)
      if (requested.prompt && typeof requested.prompt === 'string') requested.request.prompt = requested.prompt
      return requested
    },
  },

  defaults: {
    stealth: false,
    defaultBehaviour: true,
    imageAreaHeight: '400px',
    resultLife: 10 * 60 * 1000,
    method: 'TEXT',  // 'IMAGE'
    defaultRequest: {
      text: {
        model: 'text-davinci-003',
        prompt: '',
        n: 1, // Warning; consumeing tokens
        max_tokens: 512, // Warning; consuming tokens
/* // You should know what you are doing.
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
        size: '512x512', // '256x256', '512x512'
        response_format:'url', // 'b64_json'
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
    telegramCommandImage: 'imgai'
  },

  getStyles: function () {
    return ['MMM-OpenAI.css']
  },

  start: function() {
    this.requestPool = new Map()
    this.notificationSet = { ...this.config.notificationHook, ...this.defaultNotification }
    this.resultTimer = null

    this.postProcessor = new PostProcess({
      sendNotification: (noti, payload) => {
        this.sendNotification(noti, payload)
      },
      shellExec: (scr) => {
        if (!scr) return false
        this.sendSocketNotification("SHELL_EXEC", scr)
      },
      getModules: () => {
        return MM.getModules()
      },
    })
  },

  getDom: function () {
    let dom = document.createElement('div')
    dom.classList.add('bodice', 'OpenAI')
    if (!this.lastResponse) return dom
    console.log(this.lastResponse)
    if (this.lastResponse.stealth) return dom
    let {error, response, request, options, responseTime} = this.lastResponse
    if (error) return dom

    let req = document.createElement('div')
    req.classList.add('prompt')
    req.innerHTML = request?.prompt

    let res = document.createElement('div')
    res.classList.add('response')

    if (options.method === 'TEXT') {
      res.innerHTML = response.choices[0].text.replace(/^\n\n/, '').replaceAll('\n', '<br/>')
      res.classList.add('response_text')
    } else if (options.method === 'IMAGE') {
      let url = (response.data[0]?.url) ? response.data[0]?.url : `data:image/png;base64,${response.data[0].b64_json}`
      res.style.backgroundImage = `url("${url}")`
      res.style.setProperty('--imageAreaHeight', this.config.imageAreaHeight)
      res.classList.add('response_image')
    }
    dom.appendChild(req)
    dom.appendChild(res)

    return dom
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
      this.request({
        method: 'TEXT', 
        requestable: request, 
        handler
      })
    } else {
      handler.reply('There is no prompt to ask to OpenAI.')
    }
  },

  command_image: function(command, handler) {
    if (handler.args) {
      let request = { prompt: handler.args }
      this.request({
        method: 'IMAGE',
        requestable: request,
        handler
      })
    } else {
      handler.reply('There is no prompt to ask to OpenAI.')
    }
  },

  request: function({method, requestable, handler = null, stealth = this.config.stealth}) {
    console.log(stealth, requestable.stealth, this.config.stealth)
    let t = (method === 'TEXT') ? 'text' : ((method === 'IMAGE') ? 'image' : false)
    if (!t) return false
    let id = Date.now()
    if (handler) this.requestPool.set(id, handler)
    this.sendSocketNotification('REQUEST', {
      request: { ...this.config.defaultRequest[t], ...requestable },
      options: {id, method, stealth}
    })
    return true
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'RESPONSE') {
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
            handler.reply('PHOTO_URL', payload.response.data[0].url, { caption: payload.request.prompt })
          } else {
            handler.reply('TEXT', payload.response.choices[0].text)
          }
        } else {
          console.log('[OPENAI] Invalid Handler)', payload.response)
        }
        this.requestPool.delete(payload.options.id)
      } else {
        console.log('[OPENAI] Response without handler (Usually timedout or missing callback)', payload.response)
      }
      if (typeof this.config.postProcessing === 'function') {
        console.log('POSTPROCESSING', this.postProcessor, payload)
        this.config.postProcessing(this.postProcessor, payload)
      }


      this.lastResponse = payload
      if (!payload.stealth) this.updateDom(500)
      if (this.config.resultLife > 0) {
        clearTimeout(this.resultTimer)
        this.resultTimer = setTimeout(() => {
          this.lastResponse = null
          this.updateDom(500)
        }, this.config.resultLife)
      }
    } // RESPONSE 
  },

  notificationReceived: function (notification, payload, sender) {
    for(const [key, factory] of Object.entries(this.notificationSet)) {
      if (notification === key) {
        let requestable = (typeof factory === 'function') ? factory(payload, sender) : ((typeof factory === 'object') ? factory : {})
        if (!(requestable?.request && requestable.request?.prompt)) {
          console.log('[OPENAI] Invalid payload', payload)
          if (typeof requestable?.callback === 'function') requestable.callback(false)
          return
        }
        console.log('REQUESTABLE', requestable)
        let r = this.request({
          method: requestable.method ?? null,
          requestable: requestable.request, 
          handler: requestable?.callback ?? null,
          stealth: requestable?.stealth || this.config.stealth
        })
        if (!r) {
          if (typeof payload.callback === 'function') payload.callback(false)
          this.sendNotification('OPENAI_REQUEST_FAILED_BY_NOTIFICATION', { payload, sender: sender.identifier })
        }
        return
      }
    }
  }



})