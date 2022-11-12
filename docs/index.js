/*
(c) 2022 Scot Watson  All Rights Reserved
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

const initPageTime = performance.now();

const asyncWindow = new Promise(function (resolve, reject) {
  window.addEventListener("load", function (evt) {
    resolve(evt);
  });
});

const asyncErrorLog = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/20221107/ErrorLog.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncTypes = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Debug/20221107/Types.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncStreams = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Streams/20221107/Streams.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

const asyncUnicode = (async function () {
  try {
    const module = await import("https://scotwatson.github.io/Unicode/20221110/Unicode.mjs");
    return module;
  } catch (e) {
    console.error(e);
  }
})();

(async function () {
  try {
    const modules = await Promise.all( [ asyncWindow, asyncErrorLog, asyncTypes, asyncStreams, asyncUnicode ] );
    start(modules);
  } catch (e) {
    console.error(e);
  }
})();


async function start( [ evtWindow, ErrorLog, Types, Streams, Unicode ] ) {
  async function asyncUtf8DecodeInit() {
    return {
      value: 0,
      contBytes: 0,
    };
  }
  async function asyncUtf8Decode(input, state) {
    try {
      if (input === null) {
        return null;
      }
      if (!(Types.isInteger(input))) {
        throw "input must be an integer.";
      }
      if (state.contBytes === 0) {
        if (input < 0x80) {
          state.value = 0;
          return new Unicode.CodePoint(input);
        } else if ((input & 0xE0) === 0xC0) {
          state.value = (input & 0x1F);
          state.contBytes = 1;
        } else if ((input & 0xF0) === 0xE0) {
          state.value = (input & 0x0F);
          state.contBytes = 2;
        } else if ((input & 0xF8) === 0xF0) {
          state.value = (input & 0x07);
          state.contBytes = 3;
        } else {
          // Invalid byte, return Replacement Character
          return new Unicode.CodePoint(0xFFFD);
        }
      } else {
        if ((input & 0xC0) !== 0x80) {
          // Invalid byte, return Replacement Character
          state.contBytes = 0;
          return new Unicode.CodePoint(0xFFFD);
        }
        state.value <<= 6;
        state.value |= (input & 0x3F);
        --state.contBytes;
      }
    } catch (e) {
      ErrorLog.rethrow({
        functionName: "asyncUtf8Decode",
        error: e,
      });
    }
  }
  class Processor {
    #inputPushSink;
    #outputPushSource;
    #cycle;
    #state;
    constructor(args) {
      try {
        if (!(Types.isSimpleObject(args))) {
          throw "Argument must be a simple object.";
        }
        if (!(Object.hasOwn(args, "cycle"))) {
          throw "Argument \"cycle\" must be provided.";
        }
        this.#cycle = args.cycle;
        if (Object.hasOwn(args, "init")) {
          this.#init(args.init);
        } else {
          this.#state = {};
        }
        this.#inputPushSink = new Streams.PushSink({
          push: Types.createStaticFunc(this, this.#execute),
        });
        this.#outputPushSource = new Streams.PushSource();
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor constructor",
          error: e,
        });
      }
    }
    async #init(init) {
      try {
        this.#state = await init();
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor.#init",
          error: e,
        });
      }
    }
    async #execute(input) {
      try {
        let output = await this.#cycle(input, this.#state);
        this.#outputPushSource.execute(output);
        while (output !== null) {
          output = await this.#cycle(null, this.#state);
          this.#outputPushSource.execute(output);
        }
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor.#execute",
          error: e,
        });
      }
    }
    getPusher() {
      try {
        return this.#inputPushSink.getPusher();
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor.getInputPusher",
          error: e,
        });
      }
    }
    registerSink(args) {
      try {
        this.#outputPushSource.registerSink(args);
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor.registerOutputSink",
          error: e,
        });
      }
    }
    unregisterSink(args) {
      try {
        this.#outputPushSource.unregisterSink(args);
      } catch (e) {
        ErrorLog.rethrow({
          functionName: "Processor.unregisterOutputSink",
          error: e,
        });
      }
    }
  }
  try {
    const imgBird = document.createElement("img");
    imgBird.src = "FlappingBird.gif";
    imgBird.style.width = "200px";
    document.body.appendChild(imgBird);
    document.body.appendChild(document.createElement("br"));
    const utf8Decoder = new Processor({
      init: asyncUtf8DecodeInit,
      cycle: asyncUtf8Decode,
    });
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    document.body.appendChild(fileInput);
    const textOutput = document.createElement("textarea");
    document.body.appendChild(textOutput);
    const textSink = new Streams.PushSink({
      push: function (item) {
        textOutput.value += item.toString();
      },
    });
    fileInput.addEventListener("input", function (evt) {
      const file = evt.target.files[0];
      const readableStream = file.stream();
      const readableStreamSource = new Streams.ReadableStreamSource(readableStream);
      const pump = new Streams.Pump();
      pump.setSource(readableStreamSource);
      pump.registerSink(utf8Decoder);
      utf8Decoder.registerSink(textSink);
      (function execute() {
        pump.execute();
        self.setTimeout(execute, 0);
      })();
    });
  } catch (e) {
    ErrorLog.rethrow({
      functionName: "start",
      error: e,
    });
  }
}
